const test = require('node:test');
const assert = require('node:assert/strict');
const { connectWithRetry, createDatabaseHandlers } = require('../lib/database');

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('retries an initial database outage and stops retrying once connected', async () => {
  let calls = 0, retry;
  const logs = [];
  const driver = { connect: async () => { if (++calls === 1) throw new Error('private connection details'); } };
  const stop = connectWithRetry(driver, 'test-uri', {
    schedule: fn => { retry = fn; return 1; },
    logger: { info: message => logs.push(message), error: message => logs.push(message) },
  });
  await new Promise(setImmediate);
  assert.equal(calls, 1);
  assert.equal(typeof retry, 'function');
  await retry();
  assert.equal(calls, 2);
  assert.ok(logs.includes('MongoDB connected'));
  assert.ok(!logs.join(' ').includes('private connection details'));
  stop();
});

test('stopping during an initial connection attempt prevents further retries', async () => {
  let reject, scheduled = false;
  const driver = { connect: () => new Promise((resolve, fail) => { reject = fail; }) };
  const stop = connectWithRetry(driver, 'test-uri', { schedule: () => { scheduled = true; } });
  stop();
  reject(new Error('unavailable'));
  await new Promise(setImmediate);
  assert.equal(scheduled, false);
});

test('disconnected databases return 503 and do not pass requests to authentication', async () => {
  const handlers = createDatabaseHandlers({ readyState: 0 });
  const health = response(), request = response();
  await handlers.healthCheck({}, health);
  handlers.requireDatabase({}, request, () => assert.fail('Should not reach authentication'));
  assert.equal(health.statusCode, 503);
  assert.equal(health.body.ok, false);
  assert.equal(request.statusCode, 503);
});

test('a connected database must also answer ping before health reports success', async () => {
  let fail = true;
  const handlers = createDatabaseHandlers({ readyState: 1, db: { command: async () => { if (fail) throw new Error(); } } });
  const unavailable = response();
  await handlers.healthCheck({}, unavailable);
  assert.equal(unavailable.statusCode, 503);
  fail = false;
  const healthy = response();
  await handlers.healthCheck({}, healthy);
  assert.equal(healthy.statusCode, 200);
  assert.equal(healthy.body.ok, true);
});
