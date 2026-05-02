// Admin dashboard: list all interviews with score + timestamp
(function () {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('intervai-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('intervai-theme', next);
  });

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleString();
  }

  async function load() {
    const body = document.getElementById('adminBody');
    try {
      const res = await fetch('/api/admin/interviews');
      if (!res.ok) throw new Error('Failed');
      const { interviews } = await res.json();

      if (!interviews.length) {
        body.innerHTML = '<tr><td colspan="5" class="muted">No interviews yet.</td></tr>';
        document.getElementById('totalCount').textContent = '0';
        document.getElementById('avgScore').textContent = '—';
        document.getElementById('topScore').textContent = '—';
        return;
      }

      const total = interviews.length;
      const avg = (interviews.reduce((s, i) => s + (i.totalScore || 0), 0) / total).toFixed(1);
      const top = Math.max(...interviews.map((i) => i.totalScore || 0));
      document.getElementById('totalCount').textContent = total;
      document.getElementById('avgScore').textContent = avg;
      document.getElementById('topScore').textContent = top;

      body.innerHTML = interviews.map((iv) => {
        const c = iv.candidate || {};
        const pct = iv.maxScore ? Math.round((iv.totalScore / iv.maxScore) * 100) : 0;
        return `
          <tr>
            <td><strong>${escapeHtml(c.name || 'Unknown')}</strong></td>
            <td>${escapeHtml(c.role || '—')}</td>
            <td><span class="score-pill">${iv.totalScore}/${iv.maxScore} <small>(${pct}%)</small></span></td>
            <td class="muted small">${fmtDate(iv.createdAt)}</td>
            <td><button class="secondary-btn view-btn" data-id="${iv._id}">View</button></td>
          </tr>
        `;
      }).join('');

      body.querySelectorAll('.view-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          sessionStorage.setItem('intervai-interview-id', btn.dataset.id);
          window.location.href = '/results.html';
        });
      });
    } catch (err) {
      console.error(err);
      body.innerHTML = '<tr><td colspan="5" class="error-msg">Could not load interviews.</td></tr>';
    }
  }

  load();
})();
