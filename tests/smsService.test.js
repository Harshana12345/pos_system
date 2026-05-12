const assert = require('node:assert');
const test = require('node:test');

test('sendSms skips delivery when webhook is not configured', async (t) => {
  const { env } = require('../src/config/env');
  const smsService = require('../src/services/smsService');
  const originalNodeEnv = env.nodeEnv;
  const originalWebhookUrl = env.sms.webhookUrl;

  t.after(() => {
    env.nodeEnv = originalNodeEnv;
    env.sms.webhookUrl = originalWebhookUrl;
  });

  env.nodeEnv = 'test';
  env.sms.webhookUrl = undefined;

  const delivery = await smsService.sendSms({
    to: '+15551234567',
    message: 'Receipt #70',
  });

  assert.deepEqual(delivery, {
    status: 'skipped',
    to: '+15551234567',
  });
});

test('sendSms posts the SMS payload to the configured webhook', async (t) => {
  const { env } = require('../src/config/env');
  const smsService = require('../src/services/smsService');
  const originalWebhookUrl = env.sms.webhookUrl;
  const originalApiKey = env.sms.apiKey;
  const originalFrom = env.sms.from;
  const originalFetch = globalThis.fetch;
  const requests = [];

  t.after(() => {
    env.sms.webhookUrl = originalWebhookUrl;
    env.sms.apiKey = originalApiKey;
    env.sms.from = originalFrom;
    globalThis.fetch = originalFetch;
  });

  env.sms.webhookUrl = 'https://sms.example.test/send';
  env.sms.apiKey = 'secret';
  env.sms.from = 'POS';
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });

    return { ok: true };
  };

  const delivery = await smsService.sendSms({
    to: '+15551234567',
    message: 'Receipt #70',
  });

  assert.equal(delivery.status, 'sent');
  assert.equal(delivery.to, '+15551234567');
  assert.equal(requests[0].url, 'https://sms.example.test/send');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer secret');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    from: 'POS',
    to: '+15551234567',
    message: 'Receipt #70',
  });
});
