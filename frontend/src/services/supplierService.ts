import { apiRequest } from '@/services/apiClient';

export type Supplier = {
  id: number;
  name: string;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
  balance: number | string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SupplierPayload = {
  name: string;
  contactNumber: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
  balance: number;
  status: string;
};

export type SupplierPaymentPayload = {
  amount: number;
  method: string | null;
  referenceNumber: string | null;
  notes: string | null;
  paidAt: string | null;
};

export type SupplierPayment = {
  id: number;
  supplierId: number;
  amount: number;
  method?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  paidAt: string;
  createdBy?: number | null;
  createdAt: string;
  supplierBalance: number;
};

export type SupplierPurchaseItem = {
  id: number;
  purchaseOrderId: number;
  productId: number;
  quantity: number;
  costPrice: number;
  lineTotal: number;
};

export type SupplierPurchase = {
  id: number;
  supplierId: number;
  branchId: number;
  status: string;
  totalAmount: number;
  notes?: string | null;
  createdBy?: number | null;
  createdAt: string;
  items: SupplierPurchaseItem[];
};

type SupplierListResponse = {
  data: Supplier[];
};

type SupplierResponse = {
  data: Supplier;
};

type SupplierPurchaseHistoryResponse = {
  data: SupplierPurchase[];
};

type SupplierPaymentResponse = {
  data: SupplierPayment;
};

function authorizedHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function listSuppliers(accessToken: string) {
  return apiRequest<SupplierListResponse>('/suppliers', {
    headers: authorizedHeaders(accessToken),
  });
}

export function createSupplier(accessToken: string, payload: SupplierPayload) {
  return apiRequest<SupplierResponse>('/suppliers', {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'POST',
  });
}

export function updateSupplier(accessToken: string, supplierId: number, payload: SupplierPayload) {
  return apiRequest<SupplierResponse>(`/suppliers/${supplierId}`, {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'PUT',
  });
}

export function deleteSupplier(accessToken: string, supplierId: number) {
  return apiRequest<void>(`/suppliers/${supplierId}`, {
    headers: authorizedHeaders(accessToken),
    method: 'DELETE',
  });
}

export function getSupplierPurchaseHistory(accessToken: string, supplierId: number) {
  return apiRequest<SupplierPurchaseHistoryResponse>(`/suppliers/${supplierId}/purchase-history`, {
    headers: authorizedHeaders(accessToken),
  });
}

export function createSupplierPayment(
  accessToken: string,
  supplierId: number,
  payload: SupplierPaymentPayload,
) {
  return apiRequest<SupplierPaymentResponse>(`/suppliers/${supplierId}/payments`, {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'POST',
  });
}
