const { Router } = require('express');

const {
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
} = require('../controllers/brandController');

const router = Router();

router.get('/', listBrands);
router.post('/', createBrand);
router.put('/:id', updateBrand);
router.delete('/:id', deleteBrand);

module.exports = router;
