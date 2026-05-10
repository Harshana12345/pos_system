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
