const multer = require('multer');

function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err instanceof multer.MulterError) {
    statusCode = 400;

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Product image file size cannot exceed 5 MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Cannot upload more than 5 product images at a time.';
    }
  }

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
    },
  });
}

module.exports = { errorHandler };
