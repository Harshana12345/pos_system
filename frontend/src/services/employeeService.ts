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

export function listEmployees(accessToken: string) {
  return apiRequest<EmployeeListResponse>('/employees', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
