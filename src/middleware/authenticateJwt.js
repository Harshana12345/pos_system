const { env } = require('../config/env');
const HttpError = require('../utils/httpError');
const { verifyJwt } = require('../utils/jwt');

function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  const [scheme, token, extra] = authorizationHeader.trim().split(/\s+/);

  if (scheme !== 'Bearer' || !token || extra) {
    return null;
  }

  return token;
}

function authenticateJwt(req, _res, next) {
  const token = extractBearerToken(req.get('authorization'));

  if (!token) {
    next(new HttpError(401, 'Bearer token is required.'));
    return;
  }

  try {
    const payload = verifyJwt(token, { secret: env.jwt.accessSecret });

    if (!Number.isInteger(Number(payload.sub)) || Number(payload.sub) <= 0) {
      next(new HttpError(401, 'Invalid access token.'));
      return;
    }

    req.user = {
      id: Number(payload.sub),
      email: payload.email,
      roleId: payload.roleId,
      branchId: payload.branchId,
    };
    req.auth = {
      token,
      payload,
    };

    next();
  } catch {
    next(new HttpError(401, 'Invalid access token.'));
  }
}

module.exports = { authenticateJwt, extractBearerToken };
