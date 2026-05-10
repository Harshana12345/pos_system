const authService = require('../services/authService');
const HttpError = require('../utils/httpError');
const { validateRegisterPayload } = require('../validators/authValidator');

async function register(req, res, next) {
  const errors = validateRegisterPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const user = await authService.registerUser(req.body);

    res.status(201).json({
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { register };
