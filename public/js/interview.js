// Interview page: camera/mic gate, questions, timer, voice/text answers, submit
(function () {
  // ---- Theme toggle ----
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('intervai-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('intervai-theme', next);
  });

  // ---- Candidate ----
  const candidate = JSON.parse(sessionStorage.getItem('intervai-candidate') || 'null');
  if (!candidate) {
    window.location.href = '/';
    return;
  }
  document.getElementById('candidateLabel').textContent = `${candidate.name} · ${candidate.role}`;

  // ---- Element refs ----
  const previewVideo = document.getElementById('previewVideo');
  const liveVideo = document.getElementById('liveVideo');
  const enableBtn = document.getElementById('enableMediaBtn');
  const beginBtn = document.getElementById('beginInterviewBtn');
  const permMsg = document.getElementById('permissionMsg');
  const gate = document.getElementById('permissionGate');
  const view = document.getElementById('interviewView');

  const questionText = document.getElementById('questionText');
  const questionType = document.getElementById('questionType');
  const answerInput = document.getElementById('answerInput');
  const micBtn = document.getElementById('micBtn');
  const nextBtn = document.getElementById('nextBtn');
  const timerText = document.getElementById('timerText');
  const timerCircle = document.getElementById('timerCircle');
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const speechStatus = document.getElementById('speechStatus');
  const loadingOverlay = document.getElementById('loadingOverlay');

  let mediaStream = null;
  let questions = [];
  let currentIdx = 0;
  let answers = [];
  let timerInterval = null;
  let recognition = null;
  let isListening = false;

  // ---- Camera / mic permission ----
  async function requestMedia() {
    permMsg.classList.add('hidden');
    enableBtn.disabled = true;
    enableBtn.textContent = 'Requesting…';
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      previewVideo.srcObject = mediaStream;
      beginBtn.disabled = false;
      enableBtn.textContent = '✓ Camera & Mic Ready';
    } catch (err) {
      console.error('getUserMedia error', err);
      permMsg.textContent = 'Please enable camera to continue';
      permMsg.classList.remove('hidden');
      enableBtn.disabled = false;
      enableBtn.textContent = 'Enable Camera & Mic';
      beginBtn.disabled = true;
    }
  }
  enableBtn.addEventListener('click', requestMedia);

  // Watch for camera being turned off mid-interview
  function watchStream() {
    if (!mediaStream) return;
    mediaStream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        alert('Camera was turned off. Please enable camera to continue.');
        window.location.href = '/interview.html';
      });
    });
  }

  // ---- Begin interview ----
  beginBtn.addEventListener('click', async () => {
    if (!mediaStream || mediaStream.getVideoTracks().length === 0) {
      permMsg.textContent = 'Please enable camera to continue';
      permMsg.classList.remove('hidden');
      return;
    }
    // Move stream into the live video panel
    liveVideo.srcObject = mediaStream;
    watchStream();

    // Load questions
    try {
      const res = await fetch(`/api/questions?role=${encodeURIComponent(candidate.role)}`);
      const data = await res.json();
      questions = data.questions || [];
      if (!questions.length) throw new Error('No questions returned');
    } catch (err) {
      console.error(err);
      alert('Could not load interview questions.');
      return;
    }

    gate.classList.add('hidden');
    view.classList.remove('hidden');
    setupSpeech();
    showQuestion(0);
  });

  // ---- Web Speech API setup ----
  function setupSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      micBtn.disabled = true;
      micBtn.title = 'Speech recognition not supported in this browser';
      speechStatus.textContent = 'Voice input not supported in this browser — please type your answer.';
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalText = '';
    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('active');
      micBtn.textContent = '⏹ Stop Voice';
      speechStatus.textContent = 'Listening…';
      finalText = answerInput.value ? answerInput.value + ' ' : '';
    };
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interim += t;
      }
      answerInput.value = (finalText + interim).trim();
    };
    recognition.onerror = (e) => {
      console.warn('speech error', e.error);
      speechStatus.textContent = 'Voice error: ' + e.error;
    };
    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove('active');
      micBtn.textContent = '🎤 Start Voice';
      speechStatus.textContent = '';
    };
  }

  micBtn.addEventListener('click', () => {
    if (!recognition) return;
    if (isListening) recognition.stop();
    else {
      try { recognition.start(); } catch (e) { console.warn(e); }
    }
  });

  // ---- Question flow ----
  function showQuestion(idx) {
    if (idx >= questions.length) return finishInterview();
    currentIdx = idx;
    const q = questions[idx];

    questionText.textContent = q.text;
    questionType.textContent = q.type === 'technical' ? 'Technical' : 'HR';
    answerInput.value = '';
    progressFill.style.width = `${((idx) / questions.length) * 100}%`;
    progressLabel.textContent = `Question ${idx + 1} of ${questions.length}`;

    if (recognition && isListening) recognition.stop();

    startTimer(q.timeLimit || 60);
  }

  function startTimer(seconds) {
    let remaining = seconds;
    timerText.textContent = remaining;
    timerCircle.classList.remove('warning');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      remaining--;
      timerText.textContent = remaining;
      if (remaining <= 10) timerCircle.classList.add('warning');
      if (remaining <= 0) {
        clearInterval(timerInterval);
        recordAndAdvance();
      }
    }, 1000);
  }

  function recordAndAdvance() {
    clearInterval(timerInterval);
    if (recognition && isListening) recognition.stop();
    const q = questions[currentIdx];
    answers.push({ questionId: q.id, answer: answerInput.value.trim() });
    const next = currentIdx + 1;
    if (next >= questions.length) finishInterview();
    else showQuestion(next);
  }

  nextBtn.addEventListener('click', recordAndAdvance);

  // ---- Submit interview ----
  async function finishInterview() {
    progressFill.style.width = '100%';
    loadingOverlay.classList.remove('hidden');

    // Stop camera
    if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());

    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id, answers }),
      });
      if (!res.ok) throw new Error('Failed to submit interview');
      const data = await res.json();
      sessionStorage.setItem('intervai-interview-id', data.interview._id);
      window.location.href = '/results.html';
    } catch (err) {
      console.error(err);
      loadingOverlay.classList.add('hidden');
      alert('Could not submit interview. Please ensure MongoDB is running.');
    }
  }
})();
