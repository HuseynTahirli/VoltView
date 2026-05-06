// Generate test data for alerts and reports
const db = require('./db');

console.log('📊 Generating test alerts and reports...');

// Sample alerts
const sampleAlerts = [
  { type: 'critical', message: 'Voltage spike detected: 255V (above safe threshold)', resolved: 0 },
  { type: 'warning', message: 'Power factor dropped below 0.85', resolved: 0 },
  { type: 'info', message: 'System started successfully', resolved: 1 },
  { type: 'critical', message: 'Overcurrent detected on Phase A: 12.5A', resolved: 0 },
  { type: 'warning', message: 'High THD detected (6.8%)', resolved: 0 },
  { type: 'info', message: 'Firmware updated to v2.15', resolved: 1 },
  { type: 'warning', message: 'Temperature above normal: 48°C', resolved: 0 },
  { type: 'critical', message: 'Frequency deviation: 51.2Hz', resolved: 0 }
];

// Sample reports
const sampleReports = [];
const today = new Date();

// Generate reports for last 14 days
for (let i = 0; i < 14; i++) {
  const reportDate = new Date(today);
  reportDate.setDate(today.getDate() - i);
  const dateStr = reportDate.toISOString().split('T')[0];

  let reportType, summary, status;

  if (i === 0) {
    reportType = 'Daily';
    summary = 'Daily energy usage, peak load analysis, voltage stability report';
    status = 'Processing';
  } else if (i % 7 === 0) {
    reportType = 'Weekly';
    summary = `Weekly energy report (${dateStr})`;
    status = 'Generated';
  } else if (i === 13) {
    reportType = 'Monthly';
    summary = 'Monthly energy report with cost analysis';
    status = 'Generated';
  } else {
    reportType = 'Daily';
    const summaries = [
      'Daily energy consumption, power quality metrics',
      'Energy usage summary, peak demand analysis',
      'Power consumption trends, anomaly detection',
      'Daily power metrics and device health',
      'Energy efficiency analysis and recommendations',
      'Load profile analysis, demand forecasting'
    ];
    summary = summaries[i % summaries.length];
    status = 'Generated';
  }

  sampleReports.push({
    date: dateStr,
    summary,
    report_type: reportType,
    status,
    file_path: `reports/${dateStr}_${reportType.toLowerCase()}.pdf`
  });
}

// Insert alerts
function insertAlerts() {
  return new Promise((resolve) => {
    let inserted = 0;
    const stmt = db.prepare("INSERT INTO alerts (type, message, timestamp, resolved) VALUES (?, ?, ?, ?)");

    sampleAlerts.forEach((alert, idx) => {
      const timestamp = new Date(Date.now() - (idx * 3600000)).toISOString(); // Spread over hours
      stmt.run([alert.type, alert.message, timestamp, alert.resolved], (err) => {
        if (err) {
          console.error('Error inserting alert:', err);
        } else {
          inserted++;
        }
      });
    });

    stmt.finalize(() => {
      console.log(`✅ Inserted ${inserted} test alerts`);
      resolve();
    });
  });
}

// Insert reports
function insertReports() {
  return new Promise((resolve) => {
    let inserted = 0;
    const stmt = db.prepare("INSERT INTO reports (date, summary, report_type, status, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?)");

    sampleReports.forEach((report) => {
      const created_at = new Date().toISOString();
      stmt.run([report.date, report.summary, report.report_type, report.status, report.file_path, created_at], (err) => {
        if (err) {
          console.error('Error inserting report:', err);
        } else {
          inserted++;
        }
      });
    });

    stmt.finalize(() => {
      console.log(`✅ Inserted ${inserted} test reports`);
      resolve();
    });
  });
}

// Main execution
async function generateData() {
  await insertAlerts();
  await insertReports();

  // Show summary
  db.get("SELECT COUNT(*) as count FROM alerts WHERE resolved = 0", [], (err, row) => {
    if (!err) console.log(`\n📢 Active alerts: ${row.count}`);
  });

  db.get("SELECT COUNT(*) as count FROM reports", [], (err, row) => {
    if (!err) console.log(`📄 Total reports: ${row.count}`);

    setTimeout(() => {
      db.close();
      console.log('\n✅ Test data generated successfully!');
      console.log('🚀 Start the server: node server.js');
      process.exit(0);
    }, 100);
  });
}

generateData();
