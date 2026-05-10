const { Router } = require('express');

const {
  createProduct,
  deleteProduct,
  getProduct,
  getProductByBarcode,
  listProducts,
  updateProduct,
  uploadProductImages,
} = require('../controllers/productController');
const { productImageUpload, PRODUCT_IMAGE_MAX_FILES } = require('../middleware/productImageUpload');

const router = Router();

router.get('/', listProducts);
router.post('/', createProduct);
router.get('/barcode/:code', getProductByBarcode);
router.get('/:id', getProduct);
router.post('/:id/images', productImageUpload.array('images', PRODUCT_IMAGE_MAX_FILES), uploadProductImages);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
