class EmployeeActivityLog {
  constructor({
    id,
    employeeId,
    userId,
    action,
    description,
    metadata,
    ipAddress,
    userAgent,
    createdAt,
  }) {
    this.id = id;
    this.employeeId = employeeId;
    this.userId = userId;
    this.action = action;
    this.description = description;
    this.metadata = metadata;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.createdAt = createdAt;
  }
}

module.exports = EmployeeActivityLog;
