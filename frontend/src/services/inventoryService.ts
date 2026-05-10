import { apiRequest } from '@/services/apiClient';

export type InventoryProduct = {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  status: string;
};

export type InventoryVariant = {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  status: string;
};

export type InventoryBranch = {
  id: number;
  name: string;
  status: string;
};

export type InventoryItem = {
  id: number;
  productId: number;
  variantId?: number | null;
  branchId: number;
  quantity: number;
  reorderLevel: number;
  lowStockAlert: boolean;
  lastUpdated?: string;
  product: InventoryProduct;
  variant: InventoryVariant | null;
  branch: InventoryBranch;
};

type InventoryListResponse = {
  data: InventoryItem[];
};

export type InventoryAdjustment = {
  id: number;
  inventoryId: number;
  productId: number;
  variantId?: number | null;
  branchId: number;
  previousQuantity: number;
  newQuantity: number;
  quantityChange: number;
  reason: string;
  adjustedByUserId?: number | null;
  createdAt: string;
};

type InventoryAdjustmentResponse = {
  data: {
    inventory: InventoryItem;
    adjustment: InventoryAdjustment;
  };
};

export type AdjustInventoryPayload = {
  inventoryId: number;
  quantityChange: number;
  reason: string;
};

function authorizedHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function listInventory(accessToken: string, branchId?: number | string) {
  const searchParams = new URLSearchParams();

  if (branchId !== undefined && branchId !== '' && branchId !== 'all') {
    searchParams.set('branchId', String(branchId));
  }

  const queryString = searchParams.toString();

  return apiRequest<InventoryListResponse>(`/inventory${queryString ? `?${queryString}` : ''}`, {
    headers: authorizedHeaders(accessToken),
  });
}

export function adjustInventoryStock(accessToken: string, payload: AdjustInventoryPayload) {
  return apiRequest<InventoryAdjustmentResponse>('/inventory/adjust', {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'POST',
  });
}
