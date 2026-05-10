import { apiRequest } from '@/services/apiClient';

export type CatalogOption = {
  id: number;
  name: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CatalogListResponse = {
  data: CatalogOption[];
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

export function listBrands(accessToken: string) {
  return apiRequest<CatalogListResponse>('/brands', {
    headers: authorizedHeaders(accessToken),
  });
}
