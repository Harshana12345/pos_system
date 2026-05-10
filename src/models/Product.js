class Product {
  constructor({
    id,
    name,
    sku,
    barcode,
    description,
    categoryId,
    brandId,
    costPrice,
    sellingPrice,
    taxRate,
    reorderLevel,
    status,
    expiryDate,
    supplierId,
    createdAt,
    updatedAt,
    deletedAt,
    variants = [],
    images = [],
    price,
    stockQuantity,
  }) {
    this.id = id;
    this.name = name;
    this.sku = sku;
    this.barcode = barcode;
    this.description = description;
    this.categoryId = categoryId;
    this.brandId = brandId;
    this.costPrice = costPrice ?? price;
    this.sellingPrice = sellingPrice ?? price;
    this.taxRate = taxRate;
    this.reorderLevel = reorderLevel;
    this.status = status;
    this.expiryDate = expiryDate;
    this.supplierId = supplierId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deletedAt = deletedAt;
    this.stockQuantity = stockQuantity;
    this.variants = variants;
    this.images = images;
  }
}

module.exports = Product;
