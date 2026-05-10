const branchService = require('../services/branchService');
const HttpError = require('../utils/httpError');
const { validateBranchId, validateUpdateBranchPayload } = require('../validators/branchValidator');

async function updateBranch(req, res, next) {
  const errors = [...validateBranchId(req.params.id), ...validateUpdateBranchPayload(req.body)];

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    const branch = await branchService.updateBranch(req.params.id, req.body);

    res.status(200).json({
      data: branch,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteBranch(req, res, next) {
  const errors = validateBranchId(req.params.id);

  if (errors.length > 0) {
    next(new HttpError(400, errors.join(' ')));
    return;
  }

  try {
    await branchService.deleteBranch(req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { deleteBranch, updateBranch };
