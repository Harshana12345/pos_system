class User {
  constructor({
    id,
    name,
    email,
    roleId,
    branchId,
    status,
    emailVerifiedAt,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.roleId = roleId;
    this.branchId = branchId;
    this.status = status;
    this.emailVerifiedAt = emailVerifiedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = User;
