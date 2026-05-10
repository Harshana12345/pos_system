function show(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'POS system API is running',
  });
}

module.exports = {
  show,
};
