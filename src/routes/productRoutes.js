const { Router } = require('express');

const {
  listProducts,
  updateProduct,
  uploadProductImages,
} = require('../controllers/productController');
const { productImageUpload, PRODUCT_IMAGE_MAX_FILES } = require('../middleware/productImageUpload');

const router = Router();

router.get('/', listProducts);
router.post('/:id/images', productImageUpload.array('images', PRODUCT_IMAGE_MAX_FILES), uploadProductImages);
router.put('/:id', updateProduct);

module.exports = router;
