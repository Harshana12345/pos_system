const { Router } = require('express');

const {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} = require('../controllers/categoryController');

const router = Router();

router.get('/', listCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
