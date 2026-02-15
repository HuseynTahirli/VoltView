// Reports Page - Real API Integration
console.log('📄 reports-api.js: Script started loading');
if (!window.API_BASE_URL) {
  window.API_BASE_URL = 'http://localhost:4000/api';
}
console.log('📄 reports-api.js: API_BASE_URL is', window.API_BASE_URL);

let reportsData = [];

// Fetch reports from backend
async function fetchReports() {
  console.log('🔍 Fetching reports from:', window.API_BASE_URL + '/reports');
  try {
    const response = await fetch(`${window.API_BASE_URL}/reports`);
    console.log('📡 Response status:', response.status);
    if (!response.ok) throw new Error('Failed to fetch reports');
    reportsData = await response.json();
    console.log('📊 Reports received:', reportsData.length);
    renderReports();
  } catch (error) {
    console.error('❌ Error fetching reports:', error);
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

    // Fix URL to point to backend server
    const backendBase = window.API_BASE_URL.replace('/api', '');
    const downloadUrl = report.file_path ? (backendBase + report.file_path) : '#';

    tr.innerHTML = `
      <td class="col-date">${date}</td>
      <td class="col-download"><a href="${downloadUrl}" ${report.file_path ? 'download' : ''} target="_blank" class="csv-download-badge">CSV</a></td>
      <td class="col-summary">${report.summary}</td>
      <td class="col-type">${report.report_type}</td>
      <td class="col-status" style="color:${statusColor};font-weight:bold;">${report.status}</td>
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
document.addEventListener('DOMContentLoaded', function () {
  console.log('📄 reports-api.js: DOMContentLoaded fired');
  console.log('📄 Reports page initializing...');

  // Fetch reports on load
  fetchReports();

  // Refresh reports every 30 seconds
  setInterval(fetchReports, 30000);

  // Generate Report Button Logic
  const genBtn = document.getElementById('btn-generate-report');
  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      const originalText = genBtn.textContent;
      genBtn.textContent = 'Generating...';
      genBtn.disabled = true;
      genBtn.style.opacity = '0.7';

      try {
        console.log('🚀 Generating report...');
        const response = await fetch(`${window.API_BASE_URL}/reports/generate`, { method: 'POST' });
        const result = await response.json();

        if (result.ok) {
          console.log('✅ Report generated successfully');
          genBtn.textContent = 'Success!';
          fetchReports(); // Refresh list
          setTimeout(() => {
            genBtn.textContent = originalText;
            genBtn.disabled = false;
            genBtn.style.opacity = '1';
          }, 2000);
        } else {
          throw new Error(result.error || 'Failed');
        }
      } catch (err) {
        console.error(err);
        genBtn.textContent = 'Error';
        setTimeout(() => {
          genBtn.textContent = originalText;
          genBtn.disabled = false;
          genBtn.style.opacity = '1';
        }, 2000);
        alert('Failed to generate report: ' + err.message);
      }
    });
  }
});

console.log('✅ Reports API script loaded');
