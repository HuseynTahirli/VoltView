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

// ── Email Settings ────────────────────────────────────────────────

async function fetchEmailSettings() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/settings/email`);
        if (!response.ok) return;
        const settings = await response.json();

        const enabledCheckbox = document.getElementById('email-alerts-enabled');
        const emailInput = document.getElementById('alert-email-input');
        if (enabledCheckbox) enabledCheckbox.checked = !!settings.emailAlertsEnabled;
        if (emailInput) emailInput.value = settings.alertEmail || '';
    } catch (err) {
        console.error('Error fetching email settings:', err);
    }
}

async function saveEmailSettings() {
    const btn = document.getElementById('save-email-settings-btn');
    const statusEl = document.getElementById('email-settings-status');
    const enabled = document.getElementById('email-alerts-enabled')?.checked ?? false;
    const email = document.getElementById('alert-email-input')?.value.trim() ?? '';

    if (enabled && !email) {
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff1744;">Please enter a recipient email address.</span>';
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        const response = await fetch(`${window.API_BASE_URL}/settings/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailAlertsEnabled: enabled, alertEmail: email })
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            if (statusEl) statusEl.innerHTML = '<span style="color:#00fba8;">✅ Email settings saved!</span>';
        } else {
            if (statusEl) statusEl.innerHTML = `<span style="color:#ff1744;">Error: ${result.error || 'Failed to save'}</span>`;
        }
    } catch (err) {
        console.error('Error saving email settings:', err);
        if (statusEl) statusEl.innerHTML = '<span style="color:#ff1744;">Failed to reach server.</span>';
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Email Settings'; }
        setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchThresholds();
    fetchEmailSettings();

    const saveBtn = document.getElementById('save-thresholds-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveThresholds);
    }

    const saveEmailBtn = document.getElementById('save-email-settings-btn');
    if (saveEmailBtn) {
        saveEmailBtn.addEventListener('click', saveEmailSettings);
    }
});
