/* === MOBILE NAV TOGGLE LOGIC === */
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelector('.ep-navlinks');
    const header = document.querySelector('.ep-topnav');

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'ep-mobile-toggle';
    toggleBtn.innerHTML = `
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
    `;

    // UI Styling for the toggle button (will also be in mobile.css)
    toggleBtn.style.display = 'none'; // Hidden by default, shown via CSS media query

    if (header) {
        header.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            toggleBtn.classList.toggle('active');
        });
    }
});
