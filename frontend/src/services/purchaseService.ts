import { apiRequest } from '@/services/apiClient';

export type PurchaseOrderItem = {
  id: number;
  purchaseOrderId: number;
  productId: number;
  quantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  costPrice: number;
  lineTotal: number;
};

export type PurchaseOrder = {
  id: number;
  supplierId: number;
  branchId: number;
  status: string;
  totalAmount: number;
  notes?: string | null;
  createdBy?: number | null;
  createdAt: string;
  items: PurchaseOrderItem[];
};

export type PurchaseOrderItemPayload = {
  productId: number;
  quantity: number;
  costPrice: number;
};

export type PurchaseOrderPayload = {
  supplierId: number;
  branchId: number;
  status: string;
  notes: string | null;
  items: PurchaseOrderItemPayload[];
};

export type PurchaseOrderReceiveItemPayload = {
  purchaseOrderItemId: number;
  quantityReceived: number;
};

export type PurchaseOrderReceivePayload = {
  items: PurchaseOrderReceiveItemPayload[];
};

type PurchaseOrderResponse = {
  data: PurchaseOrder;
};

function authorizedHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function createPurchaseOrder(accessToken: string, payload: PurchaseOrderPayload) {
  return apiRequest<PurchaseOrderResponse>('/purchases', {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'POST',
  });
}

export function approvePurchaseOrder(accessToken: string, purchaseOrderId: number) {
  return apiRequest<PurchaseOrderResponse>(`/purchases/${purchaseOrderId}/approve`, {
    headers: authorizedHeaders(accessToken),
    method: 'PUT',
  });
}

export function receivePurchaseOrder(
  accessToken: string,
  purchaseOrderId: number,
  payload?: PurchaseOrderReceivePayload,
) {
  return apiRequest<PurchaseOrderResponse>(`/purchases/${purchaseOrderId}/receive`, {
    body: payload ? JSON.stringify(payload) : undefined,
    headers: authorizedHeaders(accessToken),
    method: 'POST',
  });
}
