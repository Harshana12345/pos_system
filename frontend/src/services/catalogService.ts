import { apiRequest } from '@/services/apiClient';

export type CatalogOption = {
  id: number;
  name: string;
  parentId?: number | null;
  description?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryPayload = {
  name: string;
  parentId: number | null;
  description: string | null;
  status: string;
};

export type BrandPayload = {
  name: string;
  description: string | null;
  status: string;
};

type CatalogListResponse = {
  data: CatalogOption[];
};

type CatalogItemResponse = {
  data: CatalogOption;
};

function authorizedHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function listCategories(accessToken: string) {
  return apiRequest<CatalogListResponse>('/categories', {
    headers: authorizedHeaders(accessToken),
  });
}

export function createCategory(accessToken: string, payload: CategoryPayload) {
  return apiRequest<CatalogItemResponse>('/categories', {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'POST',
  });
}

export function updateCategory(accessToken: string, categoryId: number, payload: CategoryPayload) {
  return apiRequest<CatalogItemResponse>(`/categories/${categoryId}`, {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'PUT',
  });
}

export function deleteCategory(accessToken: string, categoryId: number) {
  return apiRequest<void>(`/categories/${categoryId}`, {
    headers: authorizedHeaders(accessToken),
    method: 'DELETE',
  });
}

export function listBrands(accessToken: string) {
  return apiRequest<CatalogListResponse>('/brands', {
    headers: authorizedHeaders(accessToken),
  });
}

export function createBrand(accessToken: string, payload: BrandPayload) {
  return apiRequest<CatalogItemResponse>('/brands', {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'POST',
  });
}

export function updateBrand(accessToken: string, brandId: number, payload: BrandPayload) {
  return apiRequest<CatalogItemResponse>(`/brands/${brandId}`, {
    body: JSON.stringify(payload),
    headers: authorizedHeaders(accessToken),
    method: 'PUT',
  });
}

export function deleteBrand(accessToken: string, brandId: number) {
  return apiRequest<void>(`/brands/${brandId}`, {
    headers: authorizedHeaders(accessToken),
    method: 'DELETE',
  });
}
