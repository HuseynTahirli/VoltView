// Alerts Page - Real API Integration
const API_BASE_URL = 'http://localhost:4000/api';

let alertsData = [];

// Fetch alerts from backend
async function fetchAlerts() {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts`);
    if (!response.ok) throw new Error('Failed to fetch alerts');
    alertsData = await response.json();
    renderAlerts();
  } catch (error) {
    console.error('Error fetching alerts:', error);
    showError('Failed to load alerts from server');
  }
}

// Create new alert
async function createAlert(type, message) {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, message })
    });

    if (!response.ok) throw new Error('Failed to create alert');

    const result = await response.json();
    console.log('Alert created:', result);

    // Refresh alerts list
    await fetchAlerts();

    return result;
  } catch (error) {
    console.error('Error creating alert:', error);
    alert('Failed to create alert');
  }
}

// Resolve an alert
async function resolveAlert(alertId) {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
      method: 'PUT'
    });

    if (!response.ok) throw new Error('Failed to resolve alert');

    const result = await response.json();
    console.log('Alert resolved:', result);

    // Refresh alerts list
    await fetchAlerts();

    return result;
  } catch (error) {
    console.error('Error resolving alert:', error);
    alert('Failed to resolve alert');
  }
}

// Render alert type badge
function renderType(type) {
  const TYPE_MAP = {
    critical: { word: 'CRITICAL', color: '#ff1744', bg: 'rgba(255,23,68,0.14)' },
    warning: { word: 'WARNING', color: '#ffe600', bg: 'rgba(255,230,0,0.14)' },
    info: { word: 'INFO', color: '#00fff7', bg: 'rgba(0,255,247,0.14)' }
  };

  const dat = TYPE_MAP[type] || TYPE_MAP.info;
  return `<span class="ep-type-bubble" style="background:${dat.bg};color:${dat.color};border:2.5px solid ${dat.color};">${dat.word}</span>`;
}

// Render alerts table
function renderAlerts() {
  const tbody = document.getElementById('ep-alerts-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const activeAlerts = alertsData.filter(alert => alert.resolved === 0);

  if (activeAlerts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#44ffaa;font-weight:bold;text-align:center;font-size:1.2em;">No active alerts! ✨</td></tr>';
    return;
  }

  activeAlerts.forEach(alert => {
    const tr = document.createElement('tr');
    tr.className = `ep-alert-row ep-alert-${alert.type}`;

    const timestamp = new Date(alert.timestamp);
    const timeStr = timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    tr.innerHTML = `
      <td style="text-align:center;vertical-align:middle;">${renderType(alert.type)}</td>
      <td>${timeStr}</td>
      <td>${alert.message}</td>
      <td><button class='ep-alert-res-btn-big' data-alert-id="${alert.id}">RESOLVE</button></td>
    `;

    tbody.appendChild(tr);
  });

  // Add click handlers to resolve buttons
  tbody.querySelectorAll('.ep-alert-res-btn-big').forEach(btn => {
    btn.addEventListener('click', async function() {
      const alertId = this.getAttribute('data-alert-id');
      this.textContent = 'RESOLVING...';
      this.disabled = true;
      await resolveAlert(alertId);
    });
  });
}

// Show error message
function showError(message) {
  const tbody = document.getElementById('ep-alerts-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:#ff1744;font-weight:bold;text-align:center;">${message}</td></tr>`;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('📢 Alerts page initializing...');

  // Fetch alerts on load
  fetchAlerts();

  // Refresh alerts every 10 seconds
  setInterval(fetchAlerts, 10000);

  // Setup simulate alert button
  const simBtn = document.getElementById('sim-alert-btn');
  if (simBtn) {
    simBtn.addEventListener('click', async function() {
      const type = document.getElementById('sim-alert-type').value;
      const msgInput = document.getElementById('sim-alert-msg');
      const message = msgInput.value.trim();

      if (!message) {
        alert('Enter a description for the alert.');
        return;
      }

      this.textContent = 'CREATING...';
      this.disabled = true;

      await createAlert(type, message);

      msgInput.value = '';
      this.textContent = 'SIMULATE ALERT';
      this.disabled = false;
    });
  }
});

console.log('✅ Alerts API script loaded');
