class Brand {
  constructor({ id, name, description, status, createdAt, updatedAt }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Brand;
