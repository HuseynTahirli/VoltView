// ========= BACKEND API INTEGRATION ========= //
const API_BASE_URL = 'http://localhost:4000/api';

// Global data store
let latestReading = null;
let historyData = [];
let recentReadings = [];

// Fetch latest reading from backend
async function fetchLatestReading() {
  try {
    const response = await fetch(`${API_BASE_URL}/latest`);
    if (!response.ok) throw new Error('Failed to fetch latest reading');
    latestReading = await response.json();
    updateDashboard(latestReading);
  } catch (error) {
    console.error('Error fetching latest reading:', error);
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

// Update dashboard tiles and panels with real data
function updateDashboard(reading) {
  if (!reading) return;

  // Update Live Power panel
  const powerKw = ((reading.power || 0) / 1000).toFixed(2);
  const voltage = (reading.voltage || 0).toFixed(2);
  const current = (reading.current || 0).toFixed(2);

  const livePowerPanel = document.querySelector('.ep-livepower .ep-panel-body');
  if (livePowerPanel) {
    livePowerPanel.innerHTML = `
      <div class="ep-panel-label">Power: <span class="ep-panel-value">${powerKw} <span class="ep-unit">kW</span></span></div>
      <div class="ep-panel-label">Voltage: <span class="ep-panel-value">${voltage} <span class="ep-unit">V</span></span></div>
      <div class="ep-panel-label">Current: <span class="ep-panel-value">${current} <span class="ep-unit">A</span></span></div>
    `;
  }

  // Update metric tiles
  const tileUsage = document.getElementById('tile-usage');
  const tilePeak = document.getElementById('tile-peak');
  const tileAvgVolt = document.getElementById('tile-avgvolt');

  if (tileUsage) tileUsage.textContent = `${((reading.energy || 0) / 1000).toFixed(2)} kWh`;
  if (tilePeak) tilePeak.textContent = `${(reading.power || 0).toFixed(0)} W`;
  if (tileAvgVolt) tileAvgVolt.textContent = `${voltage} V`;

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

// Update charts with historical data
function updateCharts() {
  if (!window.Chart || historyData.length === 0) return;

  // Update power chart
  updateSingleChart('chart-power', historyData.map(r => r.power || 0));

  // Update voltage chart
  updateSingleChart('chart-voltage', historyData.map(r => r.voltage || 0));

  // Update current chart
  updateSingleChart('chart-current', historyData.map(r => r.current || 0));

  // Update frequency chart if data available
  if (historyData[0]?.frequency !== undefined) {
    updateSingleChart('chart-freq', historyData.map(r => r.frequency || 0));
  }
}

function updateSingleChart(chartId, dataPoints) {
  const canvas = document.getElementById(chartId);
  if (!canvas || !canvas.chartInstance) return;

  // Keep last 60 points for display
  const displayData = dataPoints.slice(-60);
  canvas.chartInstance.data.datasets[0].data = displayData;
  canvas.chartInstance.update('none');
}

// Start polling for new data
function startDataPolling() {
  // Fetch latest reading every 2 seconds
  fetchLatestReading();
  setInterval(fetchLatestReading, 2000);

  // Fetch history every 10 seconds
  fetchHistory();
  setInterval(fetchHistory, 10000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  console.log('🔌 VoltView Dashboard - Connecting to backend...');
  startDataPolling();
});

// ======= LIVE WAVEFORM Chart.js INIT & GLOW ======= //
document.addEventListener('DOMContentLoaded', function () {
  // Neon glow config for all charts
  const CHARTS = [
    { id: 'chart-power', min: 0, max: 2400, label: 'Power (W)' },
    { id: 'chart-voltage', min: 160, max: 270, label: 'Voltage (V)' },
    { id: 'chart-current', min: 0, max: 20, label: 'Current (A)' },
    { id: 'chart-loadscore', min: 0, max: 100, label: 'Load Score' },
    { id: 'chart-efficiency', min: 0, max: 100, label: 'Efficiency (%)' },
    { id: 'chart-jitter', min: 0, max: 16, label: 'Jitter' },
    { id: 'chart-packet', min: 99, max: 100, label: 'Packet Integrity (%)' },
    { id: 'chart-temp', min: 10, max: 60, label: 'Temperature (°C)' },
    { id: 'chart-freq', min: 49, max: 61, label: 'Frequency (Hz)' },
  ];

  const makeLabels = () => Array(60).fill('');
  const glowColor = '#22ffff';

  if (window.Chart) {
    CHARTS.forEach(({ id, min, max, label }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const ctx = el.getContext('2d');
      let points = Array(60).fill(min);

      const chartObj = new Chart(ctx, {
        type: 'line',
        data: {
          labels: makeLabels(),
          datasets: [{
            label: label,
            data: points,
            borderColor: glowColor,
            borderWidth: 2.3,
            pointRadius: 0,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            fill: false,
          }]
        },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: {
              display: false,
              min: min,
              max: max,
            }
          },
          elements: {
            line: {
              borderWidth: 3,
              borderJoinStyle: 'round',
              borderCapStyle: 'round',
              backgroundColor: glowColor,
              shadowBlur: 22,
              shadowColor: glowColor,
            }
          }
        }
      });

      // Store chart instance for updates
      el.chartInstance = chartObj;

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 18;
    });
  }

  // Live voltage waveform (simulated AC waveform)
  if (document.getElementById('liveWaveChart')) {
    const ctx = document.getElementById('liveWaveChart').getContext('2d');
    let points = Array.from({ length: 60 }, (_, i) => Math.sin(i * 0.3) * 230);

    const myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: makeLabels(),
        datasets: [{
          data: points,
          borderColor: glowColor,
          borderWidth: 2.5,
          pointRadius: 0,
          cubicInterpolationMode: 'monotone',
          tension: 0.42,
          fill: false,
        }]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { display: false },
          y: {
            display: false,
            min: -400,
            max: 400
          }
        },
        elements: {
          line: {
            borderWidth: 3,
            borderJoinStyle: 'round',
            borderCapStyle: 'round',
            backgroundColor: glowColor,
            shadowBlur: 22,
            shadowColor: glowColor,
          }
        }
      }
    });

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;

    // Animate waveform based on actual voltage
    let phase = 0;
    setInterval(() => {
      phase += 0.1;
      const amplitude = latestReading?.voltage || 230;
      points = Array.from({ length: 60 }, (_, i) => Math.sin((i + phase) * 0.3) * amplitude);
      myChart.data.datasets[0].data = points;
      myChart.update('none');
    }, 50);
  }
});

// ========= DASHBOARD SEARCH BAR LOGIC ========= //
document.addEventListener('DOMContentLoaded', function () {
  const SEARCH_MAP = [
    { name: "Dashboard", path: "index.html" },
    { name: "Analytics", path: "analytics.html" },
    { name: "Devices", path: "devices.html" },
    { name: "Live Readings", path: "live-readings.html" },
    { name: "Readings", path: "readings.html" },
    { name: "All Graphs", path: "all-graphs.html" },
    { name: "Reports", path: "reports.html" },
    { name: "Alerts", path: "alerts.html" },
    { name: "Settings", path: "settings.html" },
    { name: "Help", path: "help.html" }
  ];

  const searchInput = document.getElementById('ep-quicksearch');
  const resultsDiv = document.getElementById('ep-quicksearch-results');

  if (searchInput && resultsDiv) {
    searchInput.addEventListener('input', function () {
      const val = this.value.trim().toLowerCase();
      resultsDiv.innerHTML = '';
      if (!val.length) {
        resultsDiv.classList.remove('active');
        return;
      }
      const matches = SEARCH_MAP.filter(f => f.name.toLowerCase().includes(val));
      if (matches.length > 0) {
        resultsDiv.classList.add('active');
        matches.forEach(m => {
          const link = document.createElement('a');
          link.href = m.path;
          link.innerHTML = m.name.replace(
            new RegExp(`(${val})`, 'ig'),
            '<b>$1</b>'
          );
          resultsDiv.appendChild(link);
        });
      } else {
        resultsDiv.classList.remove('active');
      }
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => resultsDiv.classList.remove('active'), 160);
    });

    searchInput.addEventListener('focus', function () {
      if (this.value.trim())
        resultsDiv.classList.add('active');
    });

    searchInput.addEventListener('keydown', function (e) {
      if (!resultsDiv.classList.contains('active')) return;
      const links = Array.from(resultsDiv.querySelectorAll('a'));
      let idx = links.findIndex(l => l === document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (idx < links.length - 1) links[idx + 1].focus();
        else if (links.length) links[0].focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) links[idx - 1].focus();
        else if (links.length) links[links.length - 1].focus();
      }
      if (e.key === 'Enter' && document.activeElement.tagName === 'A') {
        document.activeElement.click();
      }
    });
  }

  // Button navigation
  const gotoAnalytics = document.getElementById('goto-analytics');
  const gotoGraphs = document.getElementById('goto-graphs');

  if (gotoAnalytics) {
    gotoAnalytics.addEventListener('click', () => {
      window.location.href = 'analytics.html';
    });
  }

  if (gotoGraphs) {
    gotoGraphs.addEventListener('click', () => {
      window.location.href = 'all-graphs.html';
    });
  }
});
