// Predefined interview questions (technical + HR)
// Each question has an ID, type, prompt text, time limit (seconds), and keywords
// used by the basic AI evaluator on the server.

module.exports = [
  {
    id: 'q1',
    type: 'technical',
    text: 'What is the difference between var, let, and const in JavaScript?',
    timeLimit: 60,
    keywords: ['scope', 'block', 'function', 'hoisting', 'reassign', 'const', 'let', 'var'],
  },
  {
    id: 'q2',
    type: 'technical',
    text: 'Explain how the event loop works in Node.js.',
    timeLimit: 75,
    keywords: ['event', 'loop', 'callback', 'queue', 'asynchronous', 'non-blocking', 'stack'],
  },
  {
    id: 'q3',
    type: 'technical',
    text: 'What is REST and what are the main HTTP methods used in a REST API?',
    timeLimit: 60,
    keywords: ['rest', 'http', 'get', 'post', 'put', 'delete', 'stateless', 'resource'],
  },
  {
    id: 'q4',
    type: 'technical',
    text: 'What is a database index and why is it useful?',
    timeLimit: 60,
    keywords: ['index', 'query', 'performance', 'lookup', 'b-tree', 'search', 'speed'],
  },
  {
    id: 'q5',
    type: 'hr',
    text: 'Tell me about yourself and why you are interested in this role.',
    timeLimit: 90,
    keywords: ['experience', 'skills', 'team', 'project', 'learn', 'passion', 'role'],
  },
  {
    id: 'q6',
    type: 'hr',
    text: 'Describe a challenging project you worked on and how you handled it.',
    timeLimit: 90,
    keywords: ['challenge', 'project', 'team', 'solution', 'learn', 'result', 'problem'],
  },
  {
    id: 'q7',
    type: 'hr',
    text: 'Where do you see yourself in five years?',
    timeLimit: 60,
    keywords: ['goal', 'grow', 'learn', 'lead', 'career', 'impact', 'future'],
  },
];
