// Reports Page - Real API Integration
const API_BASE_URL = 'http://localhost:4000/api';

let reportsData = [];

// Fetch reports from backend
async function fetchReports() {
  try {
    const response = await fetch(`${API_BASE_URL}/reports`);
    if (!response.ok) throw new Error('Failed to fetch reports');
    reportsData = await response.json();
    renderReports();
  } catch (error) {
    console.error('Error fetching reports:', error);
    showError('Failed to load reports from server');
  }
}

// Render reports table
function renderReports() {
  const tbody = document.getElementById('reports-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (reportsData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#ffe600;font-weight:bold;text-align:center;font-size:1.1em;">No reports available</td></tr>';
    return;
  }

  reportsData.forEach(report => {
    const tr = document.createElement('tr');

    // Format date
    const date = report.date;

    // Status color
    let statusColor = '#63fc95'; // Generated (green)
    if (report.status === 'Processing') statusColor = '#ffd429'; // Processing (yellow)
    if (report.status === 'Failed') statusColor = '#ff1744'; // Failed (red)

    tr.innerHTML = `
      <td>${date}</td>
      <td><a href="${report.file_path || '#'}" ${report.file_path ? 'download' : ''}>PDF</a></td>
      <td>${report.summary}</td>
      <td>${report.report_type}</td>
      <td style="color:${statusColor};font-weight:bold;">${report.status}</td>
    `;

    tbody.appendChild(tr);
  });
}

// Show error message
function showError(message) {
  const tbody = document.getElementById('reports-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#ff1744;font-weight:bold;text-align:center;">${message}</td></tr>`;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 Reports page initializing...');

  // Fetch reports on load
  fetchReports();

  // Refresh reports every 30 seconds
  setInterval(fetchReports, 30000);
});

console.log('✅ Reports API script loaded');
