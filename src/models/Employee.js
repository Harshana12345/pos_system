class Employee {
  constructor({
    id,
    userId,
    roleId,
    branchId,
    salary,
    shift,
    attendance,
    status,
    createdAt,
    updatedAt,
    user,
    role,
    branch,
  }) {
    this.id = id;
    this.userId = userId;
    this.roleId = roleId;
    this.branchId = branchId;
    this.salary = salary;
    this.shift = shift;
    this.attendance = attendance;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.user = user;
    this.role = role;
    this.branch = branch;
  }
}

module.exports = Employee;
