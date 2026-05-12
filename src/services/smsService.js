const { env } = require('../config/env');
const HttpError = require('../utils/httpError');

async function sendSms({ to, message }) {
  if (!env.sms.webhookUrl) {
    if (env.nodeEnv !== 'test') {
      console.info(`SMS delivery skipped; SMS_WEBHOOK_URL is not configured. Recipient: ${to}`);
    }

    return {
      status: 'skipped',
      to,
    };
  }

  if (typeof globalThis.fetch !== 'function') {
    throw new HttpError(500, 'SMS delivery requires a runtime with fetch support.');
  }

  const response = await globalThis.fetch(env.sms.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.sms.apiKey ? { Authorization: `Bearer ${env.sms.apiKey}` } : {}),
    },
    body: JSON.stringify({
      from: env.sms.from,
      to,
      message,
    }),
  });

  if (!response.ok) {
    throw new HttpError(502, 'SMS provider rejected the receipt message.');
  }

  return {
    status: 'sent',
    to,
  };
}

module.exports = {
  sendSms,
};
