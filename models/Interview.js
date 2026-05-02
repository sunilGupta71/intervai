// Interview Mongoose model - stores per-question answers + scores
const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: '' },
    score: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
  },
  { _id: false }
);

const InterviewSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    answers: { type: [AnswerSchema], default: [] },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Interview', InterviewSchema);
