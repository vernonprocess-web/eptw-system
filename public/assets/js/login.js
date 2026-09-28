// ============================================================================
// CENTRAL AUTHENTICATION GATEWAY & SMART ROLE ROUTER CONTROLLER
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[LoginGateway] Initializing Authentication Router...');

  const select = document.getElementById('userProfileSelect');
  const preview = document.getElementById('routingPreview');
  const form = document.getElementById('loginGatewayForm');

  // If valid session already exists, auto-route user directly
  const existingEmail = localStorage.getItem('active_user_email');
  const existingRole = localStorage.getItem('active_user_role');

  if (existingEmail && existingRole) {
    if (existingRole === 'SITE_SUPERVISOR') {
      window.location.replace('/supervisor.html');
      return;
    } else if (['WSHO', 'PROJECT_MANAGER', 'ADMIN', 'SAFETY_ASSESSOR'].includes(existingRole)) {
      window.location.replace('/index.html');
      return;
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
