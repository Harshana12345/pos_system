const authService = require('../services/authService');
const HttpError = require('../utils/httpError');
const {
  validateForgotPasswordPayload,
  validateLoginPayload,
  validateLogoutPayload,
  validateRefreshPayload,
  validateRegisterPayload,
  validateResetPasswordPayload,
  validateVerifyEmailPayload,
} = require('../validators/authValidator');

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

async function forgotPassword(req, res, next) {
  const errors = validateForgotPasswordPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await authService.requestPasswordReset(req.body);

    res.status(202).json({
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  const errors = validateResetPasswordPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await authService.resetPassword(req.body);

    res.status(200).json({
      message: 'Password has been reset.',
    });
  } catch (error) {
    next(error);
  }
}

async function verifyEmail(req, res, next) {
  const errors = validateVerifyEmailPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const user = await authService.verifyEmail(req.body);

    res.status(200).json({
      data: user,
      message: 'Email address has been verified.',
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  const errors = validateLoginPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const session = await authService.loginUser(req.body);

    res.status(200).json({
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  const errors = validateRefreshPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const session = await authService.refreshAccessToken(req.body.refreshToken);

    res.status(200).json({
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  const errors = validateLogoutPayload(req.body);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await authService.logoutUser(req.body.refreshToken);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  resetPassword,
  verifyEmail,
};
