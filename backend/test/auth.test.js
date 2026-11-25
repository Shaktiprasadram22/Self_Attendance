const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
// An isolated test signing key; never used by a deployed service.
process.env.JWT_SECRET = 'attendance-regression-test-key-only-32-characters';
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const auth = require('../middleware/auth');

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('authentication reports a database outage as unavailable, not an expired session', async t => {
  t.mock.method(User, 'findById', async () => { throw new Error('Database unavailable'); });
  const token = jwt.sign({ sub: '111111111111111111111111' }, process.env.JWT_SECRET);
  const res = response();
  await auth({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('Must not authorize'));
  assert.equal(res.statusCode, 503);
});

test('invalid tokens are rejected before querying student records', async t => {
  t.mock.method(User, 'findById', async () => assert.fail('Must not query students'));
  const res = response();
  await auth({ headers: { authorization: 'Bearer invalid' } }, res, () => assert.fail('Must not authorize'));
  assert.equal(res.statusCode, 401);
});

test('the backend refuses to start with a missing or default session secret', () => {
  for (const secret of ['', 'dev-secret']) {
    const run = spawnSync(process.execPath, ['-e', 'require("./lib/authConfig")'], {
      cwd: path.join(__dirname, '..'), env: { PATH: process.env.PATH, JWT_SECRET: secret }, encoding: 'utf8',
    });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /Configure JWT_SECRET/);
  }
});
