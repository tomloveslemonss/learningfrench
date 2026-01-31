const path = require('path');
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test.db');
const request = require('supertest');
const { app } = require('../app');

async function getCsrf(agent) {
  const res = await agent.get('/api/csrf');
  return res.body.csrfToken;
}

describe('auth flow', () => {
  test('register and login', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const registerRes = await agent
      .post('/api/auth/register')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'test@example.com', password: 'Password1!', uiLanguage: 'en' });

    expect(registerRes.status).toBe(200);
    expect(registerRes.body.email).toBe('test@example.com');

    const logoutToken = await getCsrf(agent);
    await agent.post('/api/auth/logout').set('x-csrf-token', logoutToken).send({});

    const loginToken = await getCsrf(agent);
    const loginRes = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', loginToken)
      .send({ email: 'test@example.com', password: 'Password1!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.uiLanguage).toBe('en');
  });
});
