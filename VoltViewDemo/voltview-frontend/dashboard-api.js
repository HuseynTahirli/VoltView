// Enhanced Dashboard API Integration - Replaces all mock data with real backend data

const API_BASE_URL = 'http://localhost:4000/api';

// Global data store
let latestReading = null;
let historyData = [];
let recentReadings = [];
let charts = {};

// Fetch latest reading from backend
async function fetchLatestReading() {
  try {
    const response = await fetch(`${API_BASE_URL}/latest`);
    if (!response.ok) {
      console.warn('No data available from backend');
      updateDeviceStatus('Waiting for data...');
      return;
    }
    latestReading = await response.json();
    updateDashboard(latestReading);
    updateDeviceStatus('Online');
  } catch (error) {
    console.error('Error fetching latest reading:', error);
    updateDeviceStatus('Offline');
  }
}

// Fetch history for charts
async function fetchHistory(limit = 100) {
  try {
    const response = await fetch(`${API_BASE_URL}/history?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch history');
    historyData = await response.json();
    updateCharts();
  } catch (error) {
    console.error('Error fetching history:', error);
  }
}

// Update device status
function updateDeviceStatus(status) {
  const statusEl = document.getElementById('device-status');
  if (statusEl) {
    statusEl.textContent = status;
    statusEl.style.color = status === 'Online' ? '#00fba8' : '#ffd429';
  }
}

// Update dashboard tiles and panels with real data
function updateDashboard(reading) {
  if (!reading) return;

  // Update Live Power panel values
  const livePowerEl = document.getElementById('live-power');
  const liveVoltageEl = document.getElementById('live-voltage');
  const liveCurrentEl = document.getElementById('live-current');

  if (livePowerEl) livePowerEl.textContent = ((reading.power || 0) / 1000).toFixed(2);
  if (liveVoltageEl) liveVoltageEl.textContent = (reading.voltage || 0).toFixed(2);
  if (liveCurrentEl) liveCurrentEl.textContent = (reading.current || 0).toFixed(2);

  // Update Device Health panel
  const frequencyEl = document.getElementById('device-frequency');
  const pfEl = document.getElementById('device-pf');

  if (frequencyEl) frequencyEl.textContent = (reading.frequency || 0).toFixed(2);
  if (pfEl) pfEl.textContent = (reading.pf || 0).toFixed(2);

  // Update metric tiles
  const tileUsage = document.getElementById('tile-usage');
  const tilePeak = document.getElementById('tile-peak');
  const tileAvgVolt = document.getElementById('tile-avgvolt');
  const tileLoad = document.getElementById('tile-load');

  if (tileUsage) tileUsage.textContent = `${((reading.energy || 0) / 1000).toFixed(2)} kWh`;
  if (tilePeak) tilePeak.textContent = `${(reading.power || 0).toFixed(0)} W`;
  if (tileAvgVolt) tileAvgVolt.textContent = `${(reading.voltage || 0).toFixed(0)} V`;
  if (tileLoad) tileLoad.textContent = calculateLoadScore(reading);

  // Update recent readings table
  recentReadings.unshift(reading);
  if (recentReadings.length > 10) recentReadings = recentReadings.slice(0, 10);

  const tbody = document.getElementById('ep-readings-tbody');
  if (tbody) {
    tbody.innerHTML = recentReadings.map(r => {
      const time = new Date(r.timestamp).toLocaleTimeString();
      return `
        <tr>
          <td>${time}</td>
          <td>${(r.voltage || 0).toFixed(2)}</td>
          <td>${(r.current || 0).toFixed(2)}</td>
          <td>${((r.power || 0) / 1000).toFixed(3)}</td>
        </tr>
      `;
    }).join('');
  }
}

// Calculate load score based on power
function calculateLoadScore(reading) {
  const power = reading.power || 0;
  const maxPower = 3000; // 3kW max (configurable)
  const score = Math.min(100, Math.round((power / maxPower) * 100));
  return score;
}

// Update charts with historical data
function updateCharts() {
  if (!window.Chart || historyData.length === 0) return;

  // Update all charts
  updateSingleChart('chart-power', historyData.map(r => (r.power || 0) / 1000), 'Power (kW)');
  updateSingleChart('chart-voltage', historyData.map(r => r.voltage || 0), 'Voltage (V)');
  updateSingleChart('chart-current', historyData.map(r => r.current || 0), 'Current (A)');
  updateSingleChart('chart-loadscore', historyData.map(r => calculateLoadScore(r)), 'Load Score');

  if (historyData[0]?.frequency !== undefined) {
    updateSingleChart('chart-freq', historyData.map(r => r.frequency || 0), 'Frequency (Hz)');
  }

  if (historyData[0]?.pf !== undefined) {
    updateSingleChart('chart-efficiency', historyData.map(r => (r.pf || 0) * 100), 'Power Factor (%)');
  }
}

function updateSingleChart(chartId, dataPoints, label) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;

  // Keep last 60 points for display
  const displayData = dataPoints.slice(-60);

  if (canvas.chartInstance) {
    canvas.chartInstance.data.datasets[0].data = displayData;
    canvas.chartInstance.update('none');
  } else if (window.Chart) {
    // Create chart if it doesn't exist
    const ctx = canvas.getContext('2d');
    canvas.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: displayData.map((_, i) => i),
        datasets: [{
          label: label,
          data: displayData,
          borderColor: '#05eafd',
          backgroundColor: 'rgba(5, 234, 253, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { display: false },
          y: {
            display: true,
            grid: { color: 'rgba(188, 19, 254, 0.1)' }
          }
        }
      }
    });
  }
}

// Start polling for new data
function startDataPolling() {
  console.log('🔄 Starting data polling from backend...');

  // Initial fetch
  fetchLatestReading();
  fetchHistory();

  // Fetch latest reading every 2 seconds
  setInterval(fetchLatestReading, 2000);

  // Fetch history every 10 seconds
  setInterval(fetchHistory, 10000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  console.log('📊 Dashboard initializing...');
  console.log('API URL:', API_BASE_URL);

  // Start fetching data from backend
  startDataPolling();
});

console.log('✅ Enhanced dashboard script loaded');
