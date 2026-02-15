const API_ANALYTICS_URL = 'http://localhost:4000/api';

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('main-power')) return;
    console.log('📈 Analytics Dashboard Initializing...');
    startAnalyticsPolling();
});

function startAnalyticsPolling() {
    fetchAnalyticsData();
    setInterval(fetchAnalyticsData, 5000);
}

async function fetchAnalyticsData() {
    try {
        const latestRes = await fetch(`${API_ANALYTICS_URL}/latest`);
        if (latestRes.ok) {
            const reading = await latestRes.json();
            updateAnalyticsCards(reading);
        }

        const historyRes = await fetch(`${API_ANALYTICS_URL}/history?limit=1000`);
        if (historyRes.ok) {
            const history = await historyRes.json();
            console.log(`Fetched ${history.length} history records`);
            updateAnalyticsCharts(history);
        }
    } catch (err) {
        console.error('Analytics Fetch Error:', err);
    }
}

function updateAnalyticsCards(reading) {
    if (!reading) return;
    const setVal = (id, val, unit) => {
        const el = document.getElementById(id);
        if (el) el.textContent = `${val} ${unit}`;
    };
    setVal('main-power', ((reading.power || 0) / 1000).toFixed(2), 'kW');
    setVal('main-voltage', (reading.voltage || 0).toFixed(1), 'V');
    setVal('main-current', (reading.current || 0).toFixed(2), 'A');
    setVal('tile-usage', ((reading.energy || 0).toFixed(2)), 'kWh');
    setVal('tile-peak', (reading.power || 0).toFixed(0), 'W');
    setVal('tile-avgvolt', (reading.voltage || 0).toFixed(0), 'V');
}

// Chart Configuration Factory
function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    color: '#ffffff',
                    font: { family: 'Orbitron', size: 14, weight: 'bold' }, // Larger & Bold
                    boxWidth: 14,
                    padding: 20,
                    usePointStyle: true
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                titleColor: '#00fba8',
                titleFont: { family: 'Orbitron', size: 16, weight: 'bold' }, // Larger title
                bodyColor: '#ffffff',
                bodyFont: { family: 'sans-serif', size: 15, weight: 'bold' }, // Larger body
                borderColor: '#ffffff',
                borderWidth: 2, // Thicker border
                padding: 14,
                displayColors: true,
                callbacks: {
                    label: function (context) {
                        return ' ' + context.dataset.label + ': ' + context.parsed.y;
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                grid: { color: 'rgba(255, 255, 255, 0.15)', drawBorder: true, lineWidth: 1 },
                ticks: {
                    color: '#ffffff', // Pure white
                    font: { size: 13, family: 'monospace', weight: 'bold' }, // Larger & Bold
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 7
                }
            },
            y: {
                display: true,
                grid: { color: 'rgba(255, 255, 255, 0.15)', borderDash: [4, 4] },
                ticks: {
                    color: '#ffffff', // Pure white
                    font: { family: 'Orbitron', size: 13, weight: 'bold' }, // Larger & Bold
                    padding: 8
                }
            }
        },
        elements: {
            line: { tension: 0.3, borderWidth: 3, fill: true }, // Thicker line
            point: { radius: 3, hoverRadius: 7, hitRadius: 25, backgroundColor: '#fff', borderColor: '#000', borderWidth: 2 } // Larger points
        }
    };
}

window.exportChartToPNG = function (canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${canvasId}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
};

function createGradient(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color + '44'); // Reduced opacity (was 66)
    gradient.addColorStop(0.5, color + '11'); // Reduced opacity (was 22)
    gradient.addColorStop(1, color + '00');
    return gradient;
}

function initChart(canvasId, label, color) {
    try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Canvas not found: ${canvasId}`);
            return null;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error(`Failed to get 2d context for: ${canvasId}`);
            return null;
        }

        const gradient = createGradient(ctx, color);

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    borderColor: color,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: color,
                    pointBorderWidth: 2
                }]
            },
            options: getChartOptions()
        });
    } catch (e) {
        console.error(`Error initializing chart ${canvasId}:`, e);
        return null;
    }
}

let chartInstances = {};

function updateAnalyticsCharts(history) {
    if (!window.Chart) {
        console.error('Chart.js not loaded!');
        return;
    }
    if (!history.length) {
        console.warn('No history data to display');
        return;
    }

    const labels = history.map(r => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const powerData = history.map(r => r.power || 0);
    const voltageData = history.map(r => r.voltage || 0);
    const pfData = history.map(r => (r.pf || 0) * 100);

    // Initialize charts if not exists
    if (!chartInstances['main-power-chart']) {
        console.log('Initializing chart instances...');
        chartInstances['main-power-chart'] = initChart('main-power-chart', 'Power (W)', '#05eafd');
        chartInstances['waveform-chart'] = initChart('waveform-chart', 'Voltage (V)', '#bc13fe');
        chartInstances['pf-chart'] = initChart('pf-chart', 'Power Factor (%)', '#00fba8');
        chartInstances['minmax-voltage-chart'] = initChart('minmax-voltage-chart', 'Voltage Range', '#fd3aaf');
        chartInstances['device-chart'] = initChart('device-chart', 'Total Load (W)', '#fad600');
        chartInstances['hourly-chart'] = initChart('hourly-chart', 'Hourly Avg Power (W)', '#ff5e57');
    }

    updateChartData('main-power-chart', labels, powerData);
    updateChartData('waveform-chart', labels, voltageData);
    updateChartData('pf-chart', labels, pfData);
    updateChartData('minmax-voltage-chart', labels, voltageData);
    updateChartData('device-chart', labels, powerData);

    const hourly = aggregateHourlyUsage(history);
    const hourlyChart = chartInstances['hourly-chart'];
    if (hourlyChart) {
        hourlyChart.data.labels = hourly.labels;
        hourlyChart.data.datasets[0].data = hourly.data;
        hourlyChart.update('none');
    }
}

function aggregateHourlyUsage(history) {
    const hours = {};
    history.forEach(r => {
        const d = new Date(r.timestamp);
        const hourKey = d.getHours() + ':00';
        if (!hours[hourKey]) {
            hours[hourKey] = { sum: 0, count: 0 };
        }
        hours[hourKey].sum += (r.power || 0);
        hours[hourKey].count++;
    });

    const sortedKeys = Object.keys(hours).sort((a, b) => parseInt(a) - parseInt(b));
    const labels = sortedKeys;
    const data = sortedKeys.map(k => {
        const avg = hours[k].sum / hours[k].count;
        return avg;
    });

    return { labels, data };
}

function updateChartData(id, labels, data) {
    const chart = chartInstances[id];
    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update('none');
    }
}
