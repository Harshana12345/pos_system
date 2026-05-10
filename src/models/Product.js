class Product {
  constructor({ id, name, sku, price, stockQuantity }) {
    this.id = id;
    this.name = name;
    this.sku = sku;
    this.price = price;
    this.stockQuantity = stockQuantity;
  }
}

module.exports = Product;

