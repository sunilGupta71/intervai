// Landing page: theme toggle + start interview form
(function () {
  // ---- Theme toggle (persists in localStorage) ----
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('intervai-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('intervai-theme', next);
  });

  // ---- Form: create candidate then go to interview page ----
  const form = document.getElementById('startForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const role = document.getElementById('role').value.trim();
    if (!name || !role) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Starting…';

    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role }),
      });
      if (!res.ok) throw new Error('Failed to create candidate');
      const data = await res.json();

      // Stash candidate context for the interview page
      sessionStorage.setItem(
        'intervai-candidate',
        JSON.stringify({ id: data.candidate._id, name, role })
      );
      window.location.href = '/interview.html';
    } catch (err) {
      console.error(err);
      alert('Could not start the interview. Please ensure MongoDB is connected and try again.');
      btn.disabled = false;
      btn.textContent = 'Start Interview →';
    }
  });
})();
