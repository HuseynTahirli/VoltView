if (typeof window.API_BASE_URL === 'undefined') {
    if (window.location.port === '3000') {
        window.API_BASE_URL = 'http://' + window.location.hostname + ':4000/api';
    } else {
        window.API_BASE_URL = window.location.origin + '/api';
    }
}

async function fetchThresholds() {
    const container = document.getElementById('thresholds-container');
    if (!container) return;

    try {
        const response = await fetch(`${window.API_BASE_URL}/thresholds`);
        const thresholds = await response.json();

        container.innerHTML = thresholds.map(t => `
            <div class="setting-item" data-key="${t.key}">
                <label for="threshold-${t.key}">${t.label}</label>
                <input 
                    id="threshold-${t.key}" 
                    class="ep-input threshold-input" 
                    type="number" 
                    step="0.1"
                    value="${t.value}" 
                    data-key="${t.key}"
                />
            </div>
        `).join('');
    } catch (err) {
        console.error('Error fetching thresholds:', err);
        container.innerHTML = '<div style="color:#ff3553; padding:1rem;">Failed to load thresholds from server.</div>';
    }
}

async function saveThresholds() {
    const btn = document.getElementById('save-thresholds-btn');
    const inputs = document.querySelectorAll('.threshold-input');
    const thresholds = Array.from(inputs).map(input => ({
        key: input.dataset.key,
        value: parseFloat(input.value)
    }));

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving...';
    }

    try {
        const response = await fetch(`${window.API_BASE_URL}/thresholds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thresholds })
        });

        if (response.ok) {
            if (btn) {
                btn.textContent = 'Thresholds Saved!';
                btn.style.boxShadow = '0 0 15px #00fba8';
                setTimeout(() => {
                    btn.textContent = 'Save Thresholds';
                    btn.disabled = false;
                    btn.style.boxShadow = '';
                }, 2000);
            }
        }
    } catch (err) {
        console.error('Error saving thresholds:', err);
        alert('Failed to save thresholds to server.');
        if (btn) {
            btn.textContent = 'Error Saving';
            btn.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchThresholds();

    const saveBtn = document.getElementById('save-thresholds-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveThresholds);
    }
});
