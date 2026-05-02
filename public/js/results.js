// Results page: fetch interview, render score + per-question feedback + suggestions
(function () {
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('intervai-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('intervai-theme', next);
  });

  const interviewId = sessionStorage.getItem('intervai-interview-id');
  if (!interviewId) {
    window.location.href = '/';
    return;
  }

  async function load() {
    try {
      const res = await fetch('/api/interviews/' + interviewId);
      if (!res.ok) throw new Error('Not found');
      const { interview } = await res.json();
      render(interview);
    } catch (err) {
      console.error(err);
      document.getElementById('candidateInfo').textContent = 'Could not load results.';
    }
  }

  function verdictFor(score, max) {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'Excellent — you’re interview-ready!';
    if (pct >= 60) return 'Good — keep practicing to sharpen weak spots.';
    if (pct >= 40) return 'Decent start — focus on depth and clarity.';
    return 'Needs work — review fundamentals and try again.';
  }

  function suggestionsFor(answers) {
    const tips = [];
    const lowScoring = answers.filter((a) => a.score < 5);
    if (lowScoring.length) {
      tips.push(`Revisit ${lowScoring.length} question(s) where your score was below 5.`);
    }
    const shortAnswers = answers.filter((a) => (a.answer || '').split(/\s+/).filter(Boolean).length < 20);
    if (shortAnswers.length) {
      tips.push('Provide longer, more detailed answers — aim for at least 30–60 words.');
    }
    tips.push('Use the STAR method (Situation, Task, Action, Result) for HR questions.');
    tips.push('Mention specific technologies, patterns, and tradeoffs in technical answers.');
    tips.push('Practice speaking aloud — clarity improves with repetition.');
    return tips;
  }

  function render(interview) {
    const c = interview.candidate || {};
    document.getElementById('candidateInfo').textContent =
      `${c.name || 'Candidate'} · ${c.role || ''}`;
    document.getElementById('totalScore').textContent = interview.totalScore;
    document.getElementById('maxScore').textContent = interview.maxScore;
    document.getElementById('scoreVerdict').textContent = verdictFor(interview.totalScore, interview.maxScore);

    const list = document.getElementById('feedbackList');
    list.innerHTML = '';
    interview.answers.forEach((a, i) => {
      const item = document.createElement('div');
      item.className = 'feedback-item';
      item.innerHTML = `
        <span class="score-badge">${a.score}/10</span>
        <h4>Q${i + 1}. ${escapeHtml(a.question)}</h4>
        <p class="answer-text">${a.answer ? escapeHtml(a.answer) : '<em>(no answer)</em>'}</p>
        <p>${escapeHtml(a.feedback)}</p>
      `;
      list.appendChild(item);
    });

    const ul = document.getElementById('suggestions');
    ul.innerHTML = '';
    suggestionsFor(interview.answers).forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  load();
})();
