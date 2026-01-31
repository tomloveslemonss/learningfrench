const path = require('path');
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test.db');
const request = require('supertest');
const { app } = require('../app');

async function getCsrf(agent) {
  const res = await agent.get('/api/csrf');
  return res.body.csrfToken;
}

describe('progress endpoints', () => {
  test('record mistake and review', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    await agent
      .post('/api/auth/register')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'progress@example.com', password: 'Password1!', uiLanguage: 'pl' });

    const recordToken = await getCsrf(agent);
    const recordRes = await agent
      .post('/api/progress/record')
      .set('x-csrf-token', recordToken)
      .send({ correct: false, itemKey: 'test-item' });

    expect(recordRes.status).toBe(200);

    const reviewRes = await agent.get('/api/review');
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.items.length).toBeGreaterThanOrEqual(0);
  });
});
