class Category {
  constructor({ id, name, parentId, description, status, createdAt, updatedAt }) {
    this.id = id;
    this.name = name;
    this.parentId = parentId;
    this.description = description;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Category;
