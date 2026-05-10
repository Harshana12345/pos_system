class User {
  constructor({ id, name, email, roleId, branchId, status, createdAt, updatedAt }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.roleId = roleId;
    this.branchId = branchId;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = User;
