// IntervAI - Express server entrypoint
// Loads env vars, connects to MongoDB, serves static frontend, and exposes REST APIs.

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const OpenAI = require('openai');

const Candidate = require('./models/Candidate');
const Interview = require('./models/Interview');
const questions = require('./data/questions');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intervai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ---------- Middleware ----------
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- DB connection (non-blocking) ----------
// We don't block server start on Mongo so the UI still loads if the DB is down.
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('[mongo] connected:', MONGODB_URI))
  .catch((err) => console.error('[mongo] connection error:', err.message));

// Helper: simple keyword/length based scorer (0-10)
function evaluateAnswer(answer, keywords = []) {
  if (!answer || !answer.trim()) {
    return { score: 0, feedback: 'No answer provided.' };
  }
  const text = answer.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Length score (0-5): rewards 30+ words, caps at 80
  let lengthScore = Math.min(5, Math.round((wordCount / 80) * 5));

  // Keyword score (0-5): proportion of keywords mentioned
  let keywordHits = 0;
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) keywordHits++;
  }
  const keywordScore = keywords.length
    ? Math.round((keywordHits / keywords.length) * 5)
    : 3; // neutral default for HR-style questions

  const score = Math.max(0, Math.min(10, lengthScore + keywordScore));

  // Feedback message
  let feedback = '';
  if (score >= 8) {
    feedback = 'Strong answer with good depth and relevant keywords.';
  } else if (score >= 5) {
    feedback = 'Decent answer. Add more concrete examples and key concepts.';
  } else if (score >= 2) {
    feedback = 'Brief or off-topic answer. Cover the main concepts in detail.';
  } else {
    feedback = 'Insufficient answer. Aim for at least a few clear sentences.';
  }
  return { score, feedback, wordCount, keywordHits };
}

// Helper: generate questions using OpenAI
async function generateQuestions(role) {
  if (!OPENAI_API_KEY) {
    // Fallback to static questions if no API key
    return questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      timeLimit: q.timeLimit,
    }));
  }

  try {
    const prompt = `Generate 5 interview questions for a ${role} position. Include 3 technical questions and 2 behavioral/HR questions. Each question should be appropriate for an interview and have a time limit of 60-90 seconds. Format as JSON array with objects having: type ("technical" or "hr"), text (the question), timeLimit (in seconds).`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    const generated = JSON.parse(content);

    // Add IDs and ensure format
    return generated.map((q, idx) => ({
      id: `ai-q${idx + 1}`,
      type: q.type,
      text: q.text,
      timeLimit: q.timeLimit,
    }));
  } catch (err) {
    console.error('OpenAI generation failed:', err);
    // Fallback to static questions
    return questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      timeLimit: q.timeLimit,
    }));
  }
}

// ---------- API Routes ----------

// GET /api/questions  -> list of interview questions (no answers leaked)
app.get('/api/questions', async (req, res) => {
  try {
    const { role } = req.query;
    let safe;
    if (role) {
      safe = await generateQuestions(role);
    } else {
      safe = questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        timeLimit: q.timeLimit,
      }));
    }
    res.json({ questions: safe });
  } catch (err) {
    console.error('[GET /api/questions]', err);
    res.status(500).json({ error: 'Failed to load questions' });
  }
});

// POST /api/candidates -> create a candidate session
app.post('/api/candidates', async (req, res) => {
  try {
    const { name, role } = req.body || {};
    if (!name || !role) {
      return res.status(400).json({ error: 'name and role are required' });
    }
    const candidate = await Candidate.create({ name, role });
    res.status(201).json({ candidate });
  } catch (err) {
    console.error('[POST /api/candidates]', err);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// POST /api/interviews -> save an interview with all answers + scores
// body: { candidateId, answers: [{ questionId, answer }] }
app.post('/api/interviews', async (req, res) => {
  try {
    const { candidateId, answers } = req.body || {};
    if (!candidateId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'candidateId and answers[] are required' });
    }

    const evaluations = answers.map((a) => {
      const q = questions.find((qq) => qq.id === a.questionId);
      if (!q) {
        return {
          questionId: a.questionId,
          question: 'Unknown question',
          answer: a.answer || '',
          score: 0,
          feedback: 'Question not found',
        };
      }
      const ev = evaluateAnswer(a.answer, q.keywords);
      return {
        questionId: q.id,
        question: q.text,
        answer: a.answer || '',
        score: ev.score,
        feedback: ev.feedback,
      };
    });

    const totalScore = evaluations.reduce((s, e) => s + e.score, 0);
    const maxScore = evaluations.length * 10;

    const interview = await Interview.create({
      candidate: candidateId,
      answers: evaluations,
      totalScore,
      maxScore,
    });

    res.status(201).json({ interview });
  } catch (err) {
    console.error('[POST /api/interviews]', err);
    res.status(500).json({ error: 'Failed to save interview' });
  }
});

// GET /api/interviews/:id -> fetch results for the results page
app.get('/api/interviews/:id', async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id).populate('candidate');
    if (!interview) return res.status(404).json({ error: 'Not found' });
    res.json({ interview });
  } catch (err) {
    console.error('[GET /api/interviews/:id]', err);
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

// GET /api/admin/interviews -> list all interviews (newest first) with candidate info
app.get('/api/admin/interviews', async (req, res) => {
  try {
    const interviews = await Interview.find({})
      .populate('candidate')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ interviews });
  } catch (err) {
    console.error('[GET /api/admin/interviews]', err);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, mongo: mongoose.connection.readyState === 1 });
});

// SPA-ish fallback: serve index.html for unknown non-API routes
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Start server ----------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[intervai] listening on http://0.0.0.0:${PORT}`);
});
