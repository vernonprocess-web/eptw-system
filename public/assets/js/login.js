// ============================================================================
// CENTRAL AUTHENTICATION GATEWAY & SMART ROLE ROUTER CONTROLLER
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[LoginGateway] Initializing Authentication Router...');

  const select = document.getElementById('userProfileSelect');
  const preview = document.getElementById('routingPreview');
  const form = document.getElementById('loginGatewayForm');

  // Check if explicit logout or switch account requested via URL query
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('logout') || urlParams.has('switch')) {
    localStorage.removeItem('active_user_email');
    localStorage.removeItem('active_user_name');
    localStorage.removeItem('active_user_role');
  }

  const existingEmail = localStorage.getItem('active_user_email');
  const existingRole = localStorage.getItem('active_user_role');

  // If saved session exists, pre-select it in the dropdown so user can switch or continue easily
  if (existingEmail && select) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value.startsWith(existingEmail)) {
        select.selectedIndex = i;
        break;
      }
    }
  }

  function updatePreview() {
    if (!select || !preview) return;
    const [email, name, role] = select.value.split('|');
    if (role === 'SITE_SUPERVISOR') {
      preview.innerHTML = `📲 <strong>Smart Routing for ${name}:</strong> Will launch <strong>Mobile Supervisor Portal</strong> (<code>supervisor.html</code>).`;
    } else {
      preview.innerHTML = `🖥️ <strong>Smart Routing for ${name}:</strong> Will launch <strong>HQ Master Dashboard</strong> (<code>index.html</code>).`;
    }
  }

  if (select) {
    select.addEventListener('change', updatePreview);
    updatePreview();
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const [email, name, role] = select.value.split('|');

      localStorage.setItem('active_user_email', email);
      localStorage.setItem('active_user_name', name);
      localStorage.setItem('active_user_role', role);

      if (role === 'SITE_SUPERVISOR') {
        window.location.replace('/supervisor.html');
      } else {
        window.location.replace('/index.html');
      }
    });
  }
});
