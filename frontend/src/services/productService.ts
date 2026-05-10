import { apiRequest } from '@/services/apiClient';

export type ProductVariant = {
  id: number;
  productId: number;
  name: string;
  sku: string;
  barcode?: string | null;
  attributes?: Record<string, string>;
  costPrice: number | string;
  sellingPrice: number | string;
  stockQuantity: number | string;
  reorderLevel: number | string;
  status: string;
};

export type ProductImage = {
  id: number;
  productId: number;
  imageUrl: string;
  altText?: string | null;
  displayOrder: number;
  isPrimary: boolean;
};

export type Product = {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  categoryId?: number | null;
  brandId?: number | null;
  costPrice: number | string;
  sellingPrice: number | string;
  taxRate: number | string;
  reorderLevel: number | string;
  status: string;
  expiryDate?: string | null;
  supplierId?: number | null;
  stockQuantity?: number | string | null;
  variants: ProductVariant[];
  images: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
};

type ProductListResponse = {
  data: Product[];
};

type ProductResponse = {
  data: Product;
};

type ProductImageUploadResponse = {
  data: Array<{
    fieldName: string;
    originalName: string;
    fileName: string;
    imageUrl: string;
    mimeType: string;
    size: number;
    path: string;
  }>;
};

export type ProductVariantPayload = {
  name: string;
  sku: string;
  barcode?: string | null;
  attributes?: Record<string, string>;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  status: string;
};

export type ProductImagePayload = {
  imageUrl: string;
  altText?: string | null;
  displayOrder: number;
  isPrimary: boolean;
};

export type ProductPayload = {
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  categoryId?: number | null;
  brandId?: number | null;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  reorderLevel: number;
  status: string;
  expiryDate?: string | null;
  supplierId?: number | null;
  variants: ProductVariantPayload[];
  images: ProductImagePayload[];
};

export function listProducts(accessToken: string) {
  return apiRequest<ProductListResponse>('/products', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function getProduct(accessToken: string, productId: number) {
  return apiRequest<ProductResponse>(`/products/${productId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export function createProduct(accessToken: string, payload: ProductPayload) {
  return apiRequest<ProductResponse>('/products', {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'POST',
  });
}

export function updateProduct(accessToken: string, productId: number, payload: ProductPayload) {
  return apiRequest<ProductResponse>(`/products/${productId}`, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'PUT',
  });
}

export function uploadProductImages(accessToken: string, productId: number, files: File[]) {
  const body = new FormData();

  files.forEach((file) => body.append('images', file));

  return apiRequest<ProductImageUploadResponse>(`/products/${productId}/images`, {
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'POST',
  });
}
