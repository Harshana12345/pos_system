class Supplier {
  constructor({
    id,
    name,
    contactNumber,
    email,
    address,
    taxId,
    notes,
    balance,
    status,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.name = name;
    this.contactNumber = contactNumber;
    this.email = email;
    this.address = address;
    this.taxId = taxId;
    this.notes = notes;
    this.balance = balance;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Supplier;
