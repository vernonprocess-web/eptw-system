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
      preview.innerHTML = `<strong>Smart Routing for ${name}:</strong> Will launch <strong>Mobile Supervisor Portal</strong> (<code>supervisor.html</code>).`;
    } else {
      preview.innerHTML = `<strong>Smart Routing for ${name}:</strong> Will launch <strong>HQ Master Dashboard</strong> (<code>index.html</code>).`;
    }
  }

  if (select) {
    select.addEventListener('change', updatePreview);
    updatePreview();
  }

  // Dynamically load registered Supervisors from Worker Registry and WSHOs/PMs from Project Directory
  async function loadAuthorizedAccounts() {
    if (!select) return;
    const adminOption = select.querySelector('option[value$="|ADMIN"]');

    const [workersRes, projectsRes] = await Promise.allSettled([
      fetch('/api/workers').then(r => r.json()),
      fetch('/api/projects').then(r => r.json())
    ]);

    if (workersRes.status === 'fulfilled' && workersRes.value?.success && Array.isArray(workersRes.value.data)) {
      const supervisors = workersRes.value.data.filter(w => w.role === 'SUPERVISOR' || w.role === 'SUPERVISOR_WORKER');
      if (supervisors.length > 0) {
        const group = document.createElement('optgroup');
        group.label = 'Verified Site Supervisors (From Worker Registry)';
        supervisors.forEach(s => {
          const opt = document.createElement('option');
          const email = (s.email || '').trim();
          opt.value = `${email}|${s.name}|SITE_SUPERVISOR`;
          const roleTitle = s.role === 'SUPERVISOR_WORKER' ? 'Working Supervisor (Dual Role)' : 'Site Supervisor';
          opt.textContent = `${s.name} — ${roleTitle} (${s.fin_no || s.wp_no || s.worker_id})`;
          group.appendChild(opt);
        });
        select.insertBefore(group, adminOption || select.firstChild);
      }
    } else if (workersRes.status === 'rejected') {
      console.warn('[LoginGateway] Could not fetch dynamic supervisors:', workersRes.reason);
    }

    if (projectsRes.status === 'fulfilled' && projectsRes.value?.success && Array.isArray(projectsRes.value.data)) {
      const wshoMap = new Map();
      const pmMap = new Map();

      projectsRes.value.data.forEach(p => {
        const wshoEmail = (p.wsho_email || '').trim();
        const wshoName = (p.wsho_name || '').trim();
        if (wshoEmail && wshoName && !wshoMap.has(wshoEmail.toLowerCase())) {
          wshoMap.set(wshoEmail.toLowerCase(), { email: wshoEmail, name: wshoName });
        }

        const pmEmail = (p.pm_email || '').trim();
        const pmName = (p.project_manager || '').trim();
        if (pmEmail && pmName && !pmMap.has(pmEmail.toLowerCase())) {
          pmMap.set(pmEmail.toLowerCase(), { email: pmEmail, name: pmName });
        }
      });

      if (wshoMap.size > 0) {
        const wshoGroup = document.createElement('optgroup');
        wshoGroup.label = 'Safety Assessors / WSHOs (From Project Directory)';
        wshoMap.forEach(({ email, name }) => {
          const opt = document.createElement('option');
          opt.value = `${email}|${name}|WSHO`;
          opt.textContent = `${name} — Workplace Safety & Health Officer (WSHO)`;
          wshoGroup.appendChild(opt);
        });
        select.insertBefore(wshoGroup, adminOption || null);
      }

      if (pmMap.size > 0) {
        const pmGroup = document.createElement('optgroup');
        pmGroup.label = 'Project Managers (From Project Directory)';
        pmMap.forEach(({ email, name }) => {
          const opt = document.createElement('option');
          opt.value = `${email}|${name}|PROJECT_MANAGER`;
          opt.textContent = `${name} — Project Manager (PM)`;
          pmGroup.appendChild(opt);
        });
        select.insertBefore(pmGroup, adminOption || null);
      }
    } else if (projectsRes.status === 'rejected') {
      console.warn('[LoginGateway] Could not fetch dynamic project leads:', projectsRes.reason);
    }

    let matched = false;
    if (existingEmail) {
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value.startsWith(existingEmail + '|')) {
          select.selectedIndex = i;
          matched = true;
          break;
        }
      }
    }
    if (!matched && select.options.length > 0) {
      select.selectedIndex = 0;
    }
    updatePreview();
  }

  loadAuthorizedAccounts();

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
