import { apiRequest } from '@/services/apiClient';

export type Customer = {
  id: number;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  loyaltyPoints: number;
  creditBalance: number;
  dateOfBirth?: string | null;
  notes?: string | null;
  status: string;
  customerGroupId?: number | string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerPayload = {
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  loyaltyPoints: number;
  creditBalance: number;
  dateOfBirth: string | null;
  notes: string | null;
  status: string;
  customerGroupId: number | null;
};

type CustomerListResponse = {
  data: Customer[];
};

type CustomerResponse = {
  data: Customer;
};

function authorizedHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function listCustomers(accessToken: string) {
  return apiRequest<CustomerListResponse>('/customers', {
    headers: authorizedHeaders(accessToken),
  });
}

export function createCustomer(accessToken: string, payload: CustomerPayload) {
  return apiRequest<CustomerResponse>('/customers', {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'POST',
  });
}

export function updateCustomer(accessToken: string, customerId: number, payload: CustomerPayload) {
  return apiRequest<CustomerResponse>(`/customers/${customerId}`, {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'PUT',
  });
}

export function deleteCustomer(accessToken: string, customerId: number) {
  return apiRequest<void>(`/customers/${customerId}`, {
    headers: authorizedHeaders(accessToken),
    method: 'DELETE',
  });
}
