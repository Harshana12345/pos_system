import { apiRequest } from '@/services/apiClient';

export type EmployeeUser = {
  id: number;
  name: string;
  email: string;
  status: string;
};

export type EmployeeRole = {
  id: number;
  name: string;
};

export type EmployeeBranch = {
  id: number;
  name: string;
};

export type Employee = {
  id: number;
  userId: number;
  roleId: number;
  branchId: number;
  salary: number | string;
  shift: string | null;
  attendance?: {
    currentStatus?: string;
    lastCheckInAt?: string;
    lastCheckOutAt?: string;
  };
  status: string;
  createdAt?: string;
  updatedAt?: string;
  user: EmployeeUser;
  role: EmployeeRole;
  branch: EmployeeBranch;
};

type EmployeeListResponse = {
  data: Employee[];
};

type EmployeeResponse = {
  data: Employee;
};

export type EmployeePayload = {
  name: string;
  email: string;
  roleId: number;
  branchId: number;
  salary?: number;
  shift?: string | null;
  attendance?: Employee['attendance'];
  status: string;
  password?: string;
};

export function listEmployees(accessToken: string) {
  return apiRequest<EmployeeListResponse>('/employees', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function createEmployee(accessToken: string, payload: EmployeePayload) {
  return apiRequest<EmployeeResponse>('/employees', {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'POST',
  });
}

export function updateEmployee(accessToken: string, employeeId: number, payload: EmployeePayload) {
  return apiRequest<EmployeeResponse>(`/employees/${employeeId}`, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'PUT',
  });
}
