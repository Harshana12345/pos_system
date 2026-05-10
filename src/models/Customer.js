class Customer {
  constructor({
    id,
    fullName,
    phone,
    email,
    address,
    loyaltyPoints,
    creditBalance,
    dateOfBirth,
    notes,
    status,
    customerGroupId,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.fullName = fullName;
    this.phone = phone;
    this.email = email;
    this.address = address;
    this.loyaltyPoints = loyaltyPoints;
    this.creditBalance = creditBalance;
    this.dateOfBirth = dateOfBirth;
    this.notes = notes;
    this.status = status;
    this.customerGroupId = customerGroupId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Customer;
