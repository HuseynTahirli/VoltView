if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4000/api'
        : '/api';
}
// Using window.API_BASE_URL directly to avoid 'const' redeclaration errors

async function populateDeviceTable() {
    console.log("🛠️ populateDeviceTable() triggered");
    const tbody = document.getElementById('ep-device-tbody');
    const totalEl = document.getElementById('ep-devices-total');
    if (!tbody) {
        console.error("❌ ep-device-tbody not found!");
        return;
    }

    try {
        console.log(`🌐 Fetching from: ${window.API_BASE_URL}/latest`);
        const response = await fetch(`${window.API_BASE_URL}/latest`);

        if (response.status === 404) {
            console.warn("⚠️ No readings found in database yet.");
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 3rem; color: #af97ff; font-family: 'Orbitron', sans-serif;">
                        <div style="font-size: 1.2em; margin-bottom: 10px;">📡 No devices detected</div>
                        <div style="font-size: 0.9em; opacity: 0.7;">Start your ESP32/PZEM sensor to see live data here.</div>
                    </td>
                </tr>
            `;
            if (totalEl) totalEl.textContent = "0.0 W";
            return;
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        console.log("📦 Received data:", data);
        const power = data.power || 0;

        tbody.innerHTML = `
            <tr>
                <td class="ep-table-icon-col">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00fff7" stroke-width="2">
                        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </td>
                <td class="ep-table-name-col">VoltView Main Hub</td>
                <td class="ep-table-status-col">
                    <span style="color:#00fba8; font-weight:bold; display: flex; align-items: center; gap: 8px;">
                        <span class="ep-dot ep-dot-green" style="box-shadow: 0 0 10px #00fba8;"></span> Online
                    </span>
                </td>
                <td class="ep-table-type-col">PZEM-004T / ESP32</td>
                <td class="ep-table-watts-col" style="font-weight:900; color: #fff; text-shadow: 0 0 10px rgba(0,255,247,0.5);">${power.toFixed(1)} W</td>
            </tr>
        `;

        if (totalEl) {
            totalEl.textContent = `${power.toFixed(1)} W`;
        }
    } catch (err) {
        console.error('Error fetching device data:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 3rem; color: #ff3553; font-family: 'Orbitron', sans-serif;">
                    <div style="font-size: 1.2em; margin-bottom: 10px;">⚠️ Connection Error</div>
                    <div style="font-size: 0.9em; opacity: 0.7;">Make sure the VoltView Backend is running.</div>
                </td>
            </tr>
        `;
    }
}
