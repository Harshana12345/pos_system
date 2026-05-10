class InventoryItem {
  constructor({
    id,
    productId,
    variantId,
    branchId,
    quantity,
    reorderLevel,
    lowStockAlert,
    lastUpdated,
    product,
    variant,
    branch,
  }) {
    this.id = id;
    this.productId = productId;
    this.variantId = variantId;
    this.branchId = branchId;
    this.quantity = quantity;
    this.reorderLevel = reorderLevel;
    this.lowStockAlert = lowStockAlert;
    this.lastUpdated = lastUpdated;
    this.product = product;
    this.variant = variant;
    this.branch = branch;
  }
}

module.exports = InventoryItem;
