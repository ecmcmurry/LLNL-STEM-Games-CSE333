
const request = require('supertest');

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate }
  }))
);

// Default: every call returns a valid negotiate response
beforeEach(() => {
  mockCreate.mockResolvedValue({
    content: [{ text: JSON.stringify({ reply: 'Understood.', decision: 'continue', concession: 0 }) }]
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

const { app } = require('../../server');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const customer = {
  customerName: 'Test Client',
  character: 'rabbit',
  type: 'aerospace',
  text: 'I need a lightweight part that handles 800 MPa.',
  hint: 'Consider a high-strength alloy.',
  reward: 150,
  constraints: { minStrength: 800 }
};

const passingDesign = {
  materialName: 'AISI 1020 Mild Steel',
  thickness: 4,
  strength: 840,
  weight: 31.4,
  cost: 32,
  ductility: 0.25,
  thermalLimit: 420,
  microstructure: 'raw',
  failedConstraints: []
};

const rejectedDesign = {
  ...passingDesign,
  strength: 600,
  failedConstraints: ['Strength: need ≥ 800 MPa, got 600 MPa']
};

// ── Tests ─────────────────────────────────────────────────────────────────────

test('1. GET /api/ping returns 200 with ok: true', async () => {
  const res = await request(app).get('/api/ping');
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  expect(res.body.model).toBeDefined();
});

test('2. POST /api/negotiate with rejected design + empty playerMessage returns reply/decision/concession', async () => {
  const res = await request(app)
    .post('/api/negotiate')
    .send({ customer, design: rejectedDesign, history: [], playerMessage: '' });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('reply');
  expect(res.body).toHaveProperty('decision');
  expect(res.body).toHaveProperty('concession');
});

test('3. POST /api/negotiate decision is always accept | reject | continue', async () => {
  const res = await request(app)
    .post('/api/negotiate')
    .send({ customer, design: passingDesign, history: [], playerMessage: 'Meets thermal spec.' });

  expect(['accept', 'reject', 'continue']).toContain(res.body.decision);
});

test('4. POST /api/negotiate concession is always a number', async () => {
  const res = await request(app)
    .post('/api/negotiate')
    .send({ customer, design: passingDesign, history: [], playerMessage: 'Ductility trade-off.' });

  expect(typeof res.body.concession).toBe('number');
});

test('5. POST /api/negotiate processes multi-turn conversation history', async () => {
  const res = await request(app)
    .post('/api/negotiate')
    .send({
      customer,
      design: rejectedDesign,
      history: [
        { role: 'player',   text: 'I used mild steel to reduce cost.' },
        { role: 'customer', text: 'The strength is still insufficient.' }
      ],
      playerMessage: 'Higher thickness compensates.'
    });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('reply');
});

test('6. POST /api/generate-customer returns 200 with required customer fields', async () => {
  mockCreate.mockResolvedValueOnce({
    content: [{ text: JSON.stringify({
      customerName: 'Drone Engineer',
      emoji: '🤖', type: 'robotics',
      text: 'I need a part.', hint: 'Use steel.',
      constraints: { minStrength: 400 }, reward: 120
    }) }]
  });

  const res = await request(app)
    .post('/api/generate-customer')
    .send({ day: 1, recentPersonas: [], reputation: 50 });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('customerName');
  expect(res.body).toHaveProperty('constraints');
  expect(res.body).toHaveProperty('reward');
});

test('7. POST /api/autopsy returns 200 with a non-empty analysis string', async () => {
  mockCreate.mockResolvedValueOnce({
    content: [{ text: JSON.stringify({ analysis: 'The part failed at 600 MPa, below the required 800 MPa.' }) }]
  });

  const res = await request(app)
    .post('/api/autopsy')
    .send({
      material: { name: 'AISI 1020 Mild Steel', yieldStrength: 210, ductility: 0.25, thermalLimit: 420 },
      design:   { thickness: 4, strength: 600, weight: 31.4, ductility: 0.25 },
      ticket:   { constraints: { minStrength: 800 } },
      failures: ['Strength: need ≥ 800 MPa, got 600 MPa'],
      microstructure: 'raw'
    });

  expect(res.status).toBe(200);
  expect(typeof res.body.analysis).toBe('string');
  expect(res.body.analysis.length).toBeGreaterThan(0);
});

test('8. POST /api/negotiate returns 500 when Anthropic API throws', async () => {
  mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

  const res = await request(app)
    .post('/api/negotiate')
    .send({ customer, design: rejectedDesign, history: [], playerMessage: '' });

  expect(res.status).toBe(500);
  expect(res.body).toHaveProperty('error');
});
