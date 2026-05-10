class Branch {
  constructor({
    id,
    name,
    address,
    contact,
    taxInfo,
    currency,
    status,
    createdAt,
    updatedAt,
    deletedAt,
  }) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.contact = contact;
    this.taxInfo = taxInfo;
    this.currency = currency;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deletedAt = deletedAt;
  }
}

module.exports = Branch;
