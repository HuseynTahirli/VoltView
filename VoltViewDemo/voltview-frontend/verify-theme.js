// Quick verification script
console.log('=== THEME VERIFICATION ===');

// Check if CSS variables exist
const root = document.documentElement;
const computedStyle = getComputedStyle(root);

console.log('Current CSS Variables:');
console.log('--cp-cyan:', computedStyle.getPropertyValue('--cp-cyan'));
console.log('--cp-purple:', computedStyle.getPropertyValue('--cp-purple'));
console.log('--cp-yellow:', computedStyle.getPropertyValue('--cp-yellow'));

// Check if theme select exists
const themeSelect = document.querySelector('.ep-select');
console.log('\nTheme Select Element:', themeSelect ? 'Found' : 'Not Found');

if (themeSelect) {
  console.log('Current value:', themeSelect.value);
  console.log('Has change listener:', themeSelect.onchange !== null);
}

// Saved theme
console.log('\nSaved in localStorage:', localStorage.getItem('voltview-theme'));
