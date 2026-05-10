import { apiRequest } from '@/services/apiClient';

export type ProductVariant = {
  id: number;
  productId: number;
  name: string;
  sku: string;
  barcode?: string | null;
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

export function listProducts(accessToken: string) {
  return apiRequest<ProductListResponse>('/products', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
