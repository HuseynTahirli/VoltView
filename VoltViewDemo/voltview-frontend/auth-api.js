// Auth API - Secure Login Logic
if (typeof window.API_BASE_URL === 'undefined') {
    if (window.location.port === '3000') {
        window.API_BASE_URL = 'http://' + window.location.hostname + ':4000/api';
    } else {
        window.API_BASE_URL = window.location.origin + '/api';
    }
}

// Check if user is logged in
function checkAuth() {
    const user = localStorage.getItem('voltview_user');
    const isLoginPage = window.location.pathname.includes('login.html');

    if (!user && !isLoginPage) {
        window.location.href = 'login.html';
    } else if (user && isLoginPage) {
        window.location.href = 'index.html';
    }
}

// Only check auth for dashboard pages (not login page itself)
if (!window.location.pathname.includes('login.html')) {
    checkAuth();
}

// Handle Supabase Auth Redirects (Hash Fragments)
function handleAuthRedirect() {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
        // Simple extraction of access_token (though we mainly just want to know they are back from confirmation)
        console.log('🎫 Auth redirect detected, clearing hash...');

        // For now, since they are confirmed, we can't easily get the email from the hash without a JWT library
        // So we'll redirect them back to login.html with a success message or just let them login
        // Alternatively, if they are already confirmed, they can just login.

        // Remove hash from URL to keep it clean
        history.replaceState(null, null, ' ');

        // Show a message if on login page, or just alert
        if (window.location.pathname.includes('login.html')) {
            const msgBox = document.getElementById('msg-box');
            if (msgBox) {
                msgBox.textContent = 'Identity Verified! You may now sign in.';
                msgBox.className = 'msg-box success-msg';
                msgBox.style.display = 'block';
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', handleAuthRedirect);

async function signup(email, password) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.ok) {
            return { ok: true, message: data.message };
        } else {
            return { ok: false, message: data.message };
        }
    } catch (err) {
        console.error('Signup Error:', err);
        throw err;
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.ok) {
            localStorage.setItem('voltview_user', data.username);
            return { ok: true };
        } else {
            return { ok: false, message: data.message };
        }
    } catch (err) {
        console.error('Login Error:', err);
        throw err;
    }
}

function logout() {
    localStorage.removeItem('voltview_user');
    window.location.href = 'login.html';
}

// Dynamically inject Logout button
function injectLogoutButton() {
    if (window.location.pathname.includes('login.html')) return;

    if (document.getElementById('voltview-logout-btn')) return;

    const logoutContainer = document.createElement('div');
    logoutContainer.id = 'voltview-logout-btn';
    logoutContainer.style.cssText = 'position: fixed; bottom: 20px; left: 20px; z-index: 1000;';

    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.onclick = logout;
    logoutBtn.style.cssText = `
    background: rgba(253, 58, 175, 0.2); 
    border: 1px solid #fd3aaf; 
    color: #fd3aaf; 
    padding: 10px 20px; 
    border-radius: 5px; 
    cursor: pointer; 
    font-family: 'Orbitron', sans-serif; 
    font-size: 0.8rem; 
    text-transform: uppercase;
    transition: all 0.3s ease;
    box-shadow: 0 0 10px rgba(253, 58, 175, 0.2);
  `;

    logoutBtn.onmouseover = () => { logoutBtn.style.background = 'rgba(253, 58, 175, 0.4)'; logoutBtn.style.boxShadow = '0 0 20px rgba(253, 58, 175, 0.4)'; };
    logoutBtn.onmouseout = () => { logoutBtn.style.background = 'rgba(253, 58, 175, 0.2)'; logoutBtn.style.boxShadow = '0 0 10px rgba(253, 58, 175, 0.2)'; };

    logoutContainer.appendChild(logoutBtn);
    document.body.appendChild(logoutContainer);
}

window.addEventListener('DOMContentLoaded', injectLogoutButton);

console.log('🔐 Auth API loaded');
