import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  listBrands,
  listCategories,
  type CatalogOption,
} from '@/services/catalogService';
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
  uploadProductImages,
  type Product,
  type ProductImagePayload,
  type ProductPayload,
  type ProductVariantPayload,
} from '@/services/productService';

type ProductListPageProps = {
  accessToken: string;
  userName?: string;
};

type ProductFormValues = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  categoryId: string;
  brandId: string;
  costPrice: string;
  sellingPrice: string;
  taxRate: string;
  reorderLevel: string;
  status: string;
  expiryDate: string;
  variants: VariantFormValues[];
  images: ImageFormValues[];
};

type VariantFormValues = {
  localId: string;
  name: string;
  sku: string;
  barcode: string;
  attributes: string;
  costPrice: string;
  sellingPrice: string;
  stockQuantity: string;
  reorderLevel: string;
  status: string;
};

type ImageFormValues = {
  localId: string;
  imageUrl: string;
  altText: string;
  displayOrder: string;
  isPrimary: boolean;
  file?: File;
  previewUrl?: string;
};

const PAGE_SIZE = 8;
const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Discontinued', value: 'discontinued' },
];

const EMPTY_FORM_VALUES: ProductFormValues = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  categoryId: '',
  brandId: '',
  costPrice: '0',
  sellingPrice: '0',
  taxRate: '0',
  reorderLevel: '0',
  status: 'active',
  expiryDate: '',
  variants: [],
  images: [],
};

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatCurrency(value: Product['sellingPrice']) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amount);
}

function formatLabel(value?: string | null) {
  if (!value) {
    return 'Not set';
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function makeOptionMap(options: CatalogOption[]) {
  return new Map(options.map((option) => [option.id, option.name]));
}

function getStockQuantity(product: Product) {
  if (product.variants.length > 0) {
    return product.variants.reduce((total, variant) => {
      const quantity = Number(variant.stockQuantity);
      return Number.isFinite(quantity) ? total + quantity : total;
    }, 0);
  }

  const quantity = Number(product.stockQuantity);

  return Number.isFinite(quantity) ? quantity : 0;
}

function getSearchText(product: Product, categoryName: string, brandName: string) {
  return [
    product.id,
    product.name,
    product.sku,
    product.barcode,
    product.description,
    product.status,
    categoryName,
    brandName,
    ...product.variants.flatMap((variant) => [variant.name, variant.sku, variant.barcode]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getImagePreviewUrl(image: ImageFormValues) {
  return image.previewUrl || image.imageUrl;
}

function getFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    sku: product.sku,
    barcode: product.barcode ?? '',
    description: product.description ?? '',
    categoryId: product.categoryId ? String(product.categoryId) : '',
    brandId: product.brandId ? String(product.brandId) : '',
    costPrice: String(product.costPrice ?? 0),
    sellingPrice: String(product.sellingPrice ?? 0),
    taxRate: String(product.taxRate ?? 0),
    reorderLevel: String(product.reorderLevel ?? 0),
    status: product.status,
    expiryDate: product.expiryDate ? String(product.expiryDate).slice(0, 10) : '',
    variants: product.variants.map((variant) => ({
      localId: makeLocalId(),
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode ?? '',
      attributes: JSON.stringify(variant.attributes ?? {}),
      costPrice: String(variant.costPrice ?? 0),
      sellingPrice: String(variant.sellingPrice ?? 0),
      stockQuantity: String(variant.stockQuantity ?? 0),
      reorderLevel: String(variant.reorderLevel ?? 0),
      status: variant.status,
    })),
    images: product.images.map((image) => ({
      localId: makeLocalId(),
      imageUrl: image.imageUrl,
      altText: image.altText ?? '',
      displayOrder: String(image.displayOrder ?? 0),
      isPrimary: image.isPrimary,
    })),
  };
}

function parseAttributes(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {};
  }

  return JSON.parse(trimmedValue) as Record<string, string>;
}

export function ProductListPage({ accessToken, userName }: ProductListPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formValues, setFormValues] = useState<ProductFormValues>(EMPTY_FORM_VALUES);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      setIsLoading(true);
      setError('');

      try {
        const [productResponse, categoryResponse, brandResponse] = await Promise.all([
          listProducts(accessToken),
          listCategories(accessToken),
          listBrands(accessToken),
        ]);

        if (isMounted) {
          setProducts(productResponse.data);
          setCategories(categoryResponse.data);
          setBrands(brandResponse.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load products. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const categoryMap = useMemo(() => makeOptionMap(categories), [categories]);
  const brandMap = useMemo(() => makeOptionMap(brands), [brands]);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryName = product.categoryId ? categoryMap.get(product.categoryId) ?? '' : '';
        const brandName = product.brandId ? brandMap.get(product.brandId) ?? '' : '';
        const matchesSearch =
          !normalizedQuery ||
          getSearchText(product, categoryName, brandName).includes(normalizedQuery);
        const matchesCategory =
          categoryFilter === 'all' || String(product.categoryId ?? '') === categoryFilter;
        const matchesBrand = brandFilter === 'all' || String(product.brandId ?? '') === brandFilter;

        return matchesSearch && matchesCategory && matchesBrand;
      }),
    [brandFilter, brandMap, categoryFilter, categoryMap, normalizedQuery, products],
  );

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleProducts = filteredProducts.slice(pageStart, pageStart + PAGE_SIZE);
  const resultStart = filteredProducts.length === 0 ? 0 : pageStart + 1;
  const resultEnd = Math.min(pageStart + PAGE_SIZE, filteredProducts.length);
  const activeProductCount = products.filter((product) => product.status === 'active').length;

  function updateSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  function updateCategoryFilter(value: string) {
    setCategoryFilter(value);
    setPage(1);
  }

  function updateBrandFilter(value: string) {
    setBrandFilter(value);
    setPage(1);
  }

  function openCreateForm() {
    formValues.images.forEach((image) => {
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });
    setEditingProduct(null);
    setFormValues({
      ...EMPTY_FORM_VALUES,
      images: [],
      variants: [],
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  async function openEditForm(product: Product) {
    formValues.images.forEach((image) => {
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });
    setIsLoadingProduct(true);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);

    try {
      const response = await getProduct(accessToken, product.id);
      setEditingProduct(response.data);
      setFormValues(getFormValues(response.data));
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setFormError(loadError.message);
      } else {
        setFormError('Unable to load product details. Try again.');
      }
    } finally {
      setIsLoadingProduct(false);
    }
  }

  function closeForm() {
    formValues.images.forEach((image) => {
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });
    setEditingProduct(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(false);
  }

  function updateFormValue(field: keyof Omit<ProductFormValues, 'variants' | 'images'>, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function addVariant() {
    setFormValues((currentValues) => ({
      ...currentValues,
      variants: [
        ...currentValues.variants,
        {
          localId: makeLocalId(),
          name: '',
          sku: '',
          barcode: '',
          attributes: '',
          costPrice: currentValues.costPrice,
          sellingPrice: currentValues.sellingPrice,
          stockQuantity: '0',
          reorderLevel: currentValues.reorderLevel,
          status: 'active',
        },
      ],
    }));
  }

  function updateVariant(localId: string, field: keyof Omit<VariantFormValues, 'localId'>, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.map((variant) =>
        variant.localId === localId ? { ...variant, [field]: value } : variant,
      ),
    }));
  }

  function removeVariant(localId: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      variants: currentValues.variants.filter((variant) => variant.localId !== localId),
    }));
  }

  function addImageFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setFormValues((currentValues) => {
      const existingPrimary = currentValues.images.some((image) => image.isPrimary);
      const nextImages = files.map((file, index) => ({
        localId: makeLocalId(),
        imageUrl: '',
        altText: file.name.replace(/\.[^.]+$/, ''),
        displayOrder: String(currentValues.images.length + index),
        isPrimary: !existingPrimary && index === 0,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      return {
        ...currentValues,
        images: [...currentValues.images, ...nextImages],
      };
    });

    event.target.value = '';
  }

  function updateImage(
    localId: string,
    field: keyof Omit<ImageFormValues, 'localId' | 'file' | 'previewUrl'>,
    value: string | boolean,
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      images: currentValues.images.map((image) => {
        if (image.localId !== localId) {
          return field === 'isPrimary' && value === true ? { ...image, isPrimary: false } : image;
        }

        return { ...image, [field]: value };
      }),
    }));
  }

  function removeImage(localId: string) {
    setFormValues((currentValues) => {
      const imageToRemove = currentValues.images.find((image) => image.localId === localId);

      if (imageToRemove?.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      const remainingImages = currentValues.images.filter((image) => image.localId !== localId);
      const hasPrimary = remainingImages.some((image) => image.isPrimary);

      return {
        ...currentValues,
        images:
          hasPrimary || remainingImages.length === 0
            ? remainingImages
            : remainingImages.map((image, index) =>
                index === 0 ? { ...image, isPrimary: true } : image,
              ),
      };
    });
  }

  function parseNonNegativeNumber(value: string, label: string) {
    const numberValue = Number(value || 0);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new Error(`${label} must be a non-negative number.`);
    }

    return numberValue;
  }

  function parseNonNegativeInteger(value: string, label: string) {
    const numberValue = Number(value || 0);

    if (!Number.isInteger(numberValue) || numberValue < 0) {
      throw new Error(`${label} must be a non-negative whole number.`);
    }

    return numberValue;
  }

  function buildPayload(uploadedImages: ProductImagePayload[] = []): ProductPayload | null {
    try {
      const name = formValues.name.trim();
      const sku = formValues.sku.trim();

      if (!name || !sku) {
        setFormError('Product name and SKU are required.');
        return null;
      }

      const variants: ProductVariantPayload[] = formValues.variants.map((variant, index) => {
        const variantName = variant.name.trim();
        const variantSku = variant.sku.trim();

        if (!variantName || !variantSku) {
          throw new Error(`Variant ${index + 1} requires name and SKU.`);
        }

        return {
          name: variantName,
          sku: variantSku,
          barcode: variant.barcode.trim() || null,
          attributes: parseAttributes(variant.attributes),
          costPrice: parseNonNegativeNumber(variant.costPrice, `Variant ${index + 1} cost price`),
          sellingPrice: parseNonNegativeNumber(
            variant.sellingPrice,
            `Variant ${index + 1} selling price`,
          ),
          stockQuantity: parseNonNegativeInteger(
            variant.stockQuantity,
            `Variant ${index + 1} stock quantity`,
          ),
          reorderLevel: parseNonNegativeInteger(
            variant.reorderLevel,
            `Variant ${index + 1} reorder level`,
          ),
          status: variant.status,
        };
      });

      const retainedImages: ProductImagePayload[] = formValues.images
        .filter((image) => !image.file && image.imageUrl.trim())
        .map((image, index) => ({
          imageUrl: image.imageUrl.trim(),
          altText: image.altText.trim() || null,
          displayOrder: parseNonNegativeInteger(image.displayOrder || String(index), 'Image order'),
          isPrimary: image.isPrimary,
        }));

      const images = [...retainedImages, ...uploadedImages].map((image, index) => ({
        ...image,
        displayOrder: index,
        isPrimary: image.isPrimary,
      }));

      if (images.length > 0 && !images.some((image) => image.isPrimary)) {
        images[0] = { ...images[0], isPrimary: true };
      }

      return {
        name,
        sku,
        barcode: formValues.barcode.trim() || null,
        description: formValues.description.trim() || null,
        categoryId: formValues.categoryId ? Number(formValues.categoryId) : null,
        brandId: formValues.brandId ? Number(formValues.brandId) : null,
        costPrice: parseNonNegativeNumber(formValues.costPrice, 'Cost price'),
        sellingPrice: parseNonNegativeNumber(formValues.sellingPrice, 'Selling price'),
        taxRate: parseNonNegativeNumber(formValues.taxRate, 'Tax rate'),
        reorderLevel: parseNonNegativeInteger(formValues.reorderLevel, 'Reorder level'),
        status: formValues.status,
        expiryDate: formValues.expiryDate || null,
        supplierId: null,
        variants,
        images,
      };
    } catch (buildError) {
      if (buildError instanceof SyntaxError) {
        setFormError('Variant attributes must be valid JSON.');
      } else if (buildError instanceof Error) {
        setFormError(buildError.message);
      } else {
        setFormError('Product details are invalid.');
      }

      return null;
    }
  }

  async function saveImagesAndProduct(product: Product, payload: ProductPayload) {
    const pendingFiles = formValues.images.filter((image) => image.file);

    if (pendingFiles.length === 0) {
      return updateProduct(accessToken, product.id, payload);
    }

    const uploadResponse = await uploadProductImages(
      accessToken,
      product.id,
      pendingFiles.map((image) => image.file as File),
    );

    const uploadedImages = uploadResponse.data.map((image, index) => {
      const sourceImage = pendingFiles[index];

      return {
        imageUrl: image.imageUrl,
        altText: sourceImage.altText.trim() || image.originalName,
        displayOrder: Number(sourceImage.displayOrder || index),
        isPrimary: sourceImage.isPrimary,
      };
    });
    const payloadWithImages = buildPayload(uploadedImages);

    if (!payloadWithImages) {
      throw new Error('Uploaded images could not be added to the product.');
    }

    return updateProduct(accessToken, product.id, payloadWithImages);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    const payload = buildPayload();

    if (!payload) {
      return;
    }

    setIsSaving(true);

    try {
      const response = editingProduct
        ? await saveImagesAndProduct(editingProduct, payload)
        : await saveImagesAndProduct((await createProduct(accessToken, payload)).data, payload);

      setProducts((currentProducts) => {
        const exists = currentProducts.some((product) => product.id === response.data.id);
        const nextProducts = exists
          ? currentProducts.map((product) =>
              product.id === response.data.id ? response.data : product,
            )
          : [...currentProducts, response.data];

        return nextProducts.sort((first, second) => first.id - second.id);
      });
      setEditingProduct(response.data);
      setFormValues(getFormValues(response.data));
      setFormSuccess(editingProduct ? 'Product updated.' : 'Product created.');
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFormError(saveError.message);
      } else if (saveError instanceof Error) {
        setFormError(saveError.message);
      } else {
        setFormError('Unable to save product. Check your connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Product List</h1>
          <p className="summary">
            {userName
              ? `Welcome back, ${userName}. Search inventory and manage product details, variants, and images.`
              : 'Search inventory and manage product details, variants, and images.'}
          </p>
        </div>
        <div className="product-stats" aria-label="Product totals">
          <div className="employee-stat">
            <span>{products.length}</span>
            <p>Total products</p>
          </div>
          <div className="employee-stat">
            <span>{activeProductCount}</span>
            <p>Active products</p>
          </div>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="product-form-title">
        <div className="form-panel-header">
          <div>
            <h2 id="product-form-title">
              {isFormOpen
                ? editingProduct
                  ? 'Edit Product'
                  : 'Create Product'
                : 'Manage Product'}
            </h2>
            <p>
              {isFormOpen
                ? 'Set pricing, category details, variants, and product images.'
                : 'Create a product or edit an existing item from the catalog.'}
            </p>
          </div>
          {isFormOpen ? (
            <button className="secondary-action" onClick={closeForm} type="button">
              Close
            </button>
          ) : (
            <button
              className="primary-action compact-action"
              onClick={openCreateForm}
              type="button"
            >
              New Product
            </button>
          )}
        </div>

        {isFormOpen ? (
          <form className="product-form" onSubmit={handleSubmit}>
            {isLoadingProduct ? (
              <div className="table-message product-form-wide" role="status">
                Loading product details...
              </div>
            ) : null}

            <label className="field" htmlFor="product-name">
              Name
              <input
                id="product-name"
                onChange={(event) => updateFormValue('name', event.target.value)}
                required
                type="text"
                value={formValues.name}
              />
            </label>

            <label className="field" htmlFor="product-sku">
              SKU
              <input
                id="product-sku"
                onChange={(event) => updateFormValue('sku', event.target.value)}
                required
                type="text"
                value={formValues.sku}
              />
            </label>

            <label className="field" htmlFor="product-barcode">
              Barcode
              <input
                id="product-barcode"
                onChange={(event) => updateFormValue('barcode', event.target.value)}
                type="text"
                value={formValues.barcode}
              />
            </label>

            <label className="field" htmlFor="product-category">
              Category
              <select
                id="product-category"
                onChange={(event) => updateFormValue('categoryId', event.target.value)}
                value={formValues.categoryId}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="product-brand">
              Brand
              <select
                id="product-brand"
                onChange={(event) => updateFormValue('brandId', event.target.value)}
                value={formValues.brandId}
              >
                <option value="">No brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="product-status">
              Status
              <select
                id="product-status"
                onChange={(event) => updateFormValue('status', event.target.value)}
                required
                value={formValues.status}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="product-cost-price">
              Cost Price
              <input
                id="product-cost-price"
                min="0"
                onChange={(event) => updateFormValue('costPrice', event.target.value)}
                step="0.01"
                type="number"
                value={formValues.costPrice}
              />
            </label>

            <label className="field" htmlFor="product-selling-price">
              Selling Price
              <input
                id="product-selling-price"
                min="0"
                onChange={(event) => updateFormValue('sellingPrice', event.target.value)}
                step="0.01"
                type="number"
                value={formValues.sellingPrice}
              />
            </label>

            <label className="field" htmlFor="product-tax-rate">
              Tax Rate
              <input
                id="product-tax-rate"
                min="0"
                onChange={(event) => updateFormValue('taxRate', event.target.value)}
                step="0.01"
                type="number"
                value={formValues.taxRate}
              />
            </label>

            <label className="field" htmlFor="product-reorder-level">
              Reorder Level
              <input
                id="product-reorder-level"
                min="0"
                onChange={(event) => updateFormValue('reorderLevel', event.target.value)}
                step="1"
                type="number"
                value={formValues.reorderLevel}
              />
            </label>

            <label className="field" htmlFor="product-expiry-date">
              Expiry Date
              <input
                id="product-expiry-date"
                onChange={(event) => updateFormValue('expiryDate', event.target.value)}
                type="date"
                value={formValues.expiryDate}
              />
            </label>

            <label className="field product-description" htmlFor="product-description">
              Description
              <textarea
                id="product-description"
                onChange={(event) => updateFormValue('description', event.target.value)}
                rows={4}
                value={formValues.description}
              />
            </label>

            <div className="product-form-section product-form-wide">
              <div className="section-heading">
                <div>
                  <h3>Variants</h3>
                  <p>{formValues.variants.length} configured</p>
                </div>
                <button className="secondary-action" onClick={addVariant} type="button">
                  Add Variant
                </button>
              </div>

              {formValues.variants.length === 0 ? (
                <div className="form-empty">No variants added.</div>
              ) : (
                <div className="variant-list">
                  {formValues.variants.map((variant, index) => (
                    <div className="variant-row" key={variant.localId}>
                      <label className="field" htmlFor={`variant-name-${variant.localId}`}>
                        Name
                        <input
                          id={`variant-name-${variant.localId}`}
                          onChange={(event) =>
                            updateVariant(variant.localId, 'name', event.target.value)
                          }
                          placeholder={`Variant ${index + 1}`}
                          type="text"
                          value={variant.name}
                        />
                      </label>
                      <label className="field" htmlFor={`variant-sku-${variant.localId}`}>
                        SKU
                        <input
                          id={`variant-sku-${variant.localId}`}
                          onChange={(event) =>
                            updateVariant(variant.localId, 'sku', event.target.value)
                          }
                          type="text"
                          value={variant.sku}
                        />
                      </label>
                      <label className="field" htmlFor={`variant-price-${variant.localId}`}>
                        Price
                        <input
                          id={`variant-price-${variant.localId}`}
                          min="0"
                          onChange={(event) =>
                            updateVariant(variant.localId, 'sellingPrice', event.target.value)
                          }
                          step="0.01"
                          type="number"
                          value={variant.sellingPrice}
                        />
                      </label>
                      <label className="field" htmlFor={`variant-stock-${variant.localId}`}>
                        Stock
                        <input
                          id={`variant-stock-${variant.localId}`}
                          min="0"
                          onChange={(event) =>
                            updateVariant(variant.localId, 'stockQuantity', event.target.value)
                          }
                          step="1"
                          type="number"
                          value={variant.stockQuantity}
                        />
                      </label>
                      <label className="field" htmlFor={`variant-reorder-${variant.localId}`}>
                        Reorder
                        <input
                          id={`variant-reorder-${variant.localId}`}
                          min="0"
                          onChange={(event) =>
                            updateVariant(variant.localId, 'reorderLevel', event.target.value)
                          }
                          step="1"
                          type="number"
                          value={variant.reorderLevel}
                        />
                      </label>
                      <label className="field" htmlFor={`variant-status-${variant.localId}`}>
                        Status
                        <select
                          id={`variant-status-${variant.localId}`}
                          onChange={(event) =>
                            updateVariant(variant.localId, 'status', event.target.value)
                          }
                          value={variant.status}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field" htmlFor={`variant-barcode-${variant.localId}`}>
                        Barcode
                        <input
                          id={`variant-barcode-${variant.localId}`}
                          onChange={(event) =>
                            updateVariant(variant.localId, 'barcode', event.target.value)
                          }
                          type="text"
                          value={variant.barcode}
                        />
                      </label>
                      <label className="field" htmlFor={`variant-cost-${variant.localId}`}>
                        Cost
                        <input
                          id={`variant-cost-${variant.localId}`}
                          min="0"
                          onChange={(event) =>
                            updateVariant(variant.localId, 'costPrice', event.target.value)
                          }
                          step="0.01"
                          type="number"
                          value={variant.costPrice}
                        />
                      </label>
                      <label className="field variant-attributes" htmlFor={`variant-attrs-${variant.localId}`}>
                        Attributes JSON
                        <input
                          id={`variant-attrs-${variant.localId}`}
                          onChange={(event) =>
                            updateVariant(variant.localId, 'attributes', event.target.value)
                          }
                          placeholder='{"size":"Large"}'
                          type="text"
                          value={variant.attributes}
                        />
                      </label>
                      <button
                        className="secondary-action remove-action"
                        onClick={() => removeVariant(variant.localId)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="product-form-section product-form-wide">
              <div className="section-heading">
                <div>
                  <h3>Images</h3>
                  <p>{formValues.images.length} selected</p>
                </div>
                <label className="secondary-action file-action" htmlFor="product-images">
                  Upload Images
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    id="product-images"
                    multiple
                    onChange={addImageFiles}
                    type="file"
                  />
                </label>
              </div>

              {formValues.images.length === 0 ? (
                <div className="form-empty">No images selected.</div>
              ) : (
                <div className="image-grid">
                  {formValues.images.map((image) => (
                    <div className="image-item" key={image.localId}>
                      <div className="image-preview">
                        {getImagePreviewUrl(image) ? (
                          <img alt={image.altText || 'Product preview'} src={getImagePreviewUrl(image)} />
                        ) : (
                          <span>No preview</span>
                        )}
                      </div>
                      <label className="field" htmlFor={`image-alt-${image.localId}`}>
                        Alt Text
                        <input
                          id={`image-alt-${image.localId}`}
                          onChange={(event) =>
                            updateImage(image.localId, 'altText', event.target.value)
                          }
                          type="text"
                          value={image.altText}
                        />
                      </label>
                      <label className="checkbox-field" htmlFor={`image-primary-${image.localId}`}>
                        <input
                          checked={image.isPrimary}
                          id={`image-primary-${image.localId}`}
                          onChange={(event) =>
                            updateImage(image.localId, 'isPrimary', event.target.checked)
                          }
                          type="checkbox"
                        />
                        Primary image
                      </label>
                      <button
                        className="secondary-action"
                        onClick={() => removeImage(image.localId)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formError ? (
              <div className="form-alert product-form-wide" role="alert">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="form-alert form-alert-success product-form-wide" role="status">
                {formSuccess}
              </div>
            ) : null}

            <div className="form-actions product-form-wide">
              <button className="primary-action" disabled={isSaving || isLoadingProduct} type="submit">
                {isSaving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
              {editingProduct ? (
                <button className="secondary-action" onClick={openCreateForm} type="button">
                  Create New
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className="table-panel" aria-labelledby="product-table-title">
        <div className="table-toolbar product-toolbar">
          <div>
            <h2 id="product-table-title">Inventory Catalog</h2>
            <p>
              Showing {resultStart}-{resultEnd} of {filteredProducts.length}
            </p>
          </div>

          <div className="product-filters" aria-label="Product filters">
            <label className="search-field" htmlFor="product-search">
              <span>Search products</span>
              <input
                id="product-search"
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Name, SKU, barcode"
                type="search"
                value={query}
              />
            </label>

            <label className="filter-field" htmlFor="category-filter">
              <span>Category</span>
              <select
                id="category-filter"
                onChange={(event) => updateCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field" htmlFor="brand-filter">
              <span>Brand</span>
              <select
                id="brand-filter"
                onChange={(event) => updateBrandFilter(event.target.value)}
                value={brandFilter}
              >
                <option value="all">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="table-message table-message-error" role="alert">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="table-message" role="status">
            Loading products...
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Category</th>
                    <th scope="col">Brand</th>
                    <th scope="col">Price</th>
                    <th scope="col">Stock</th>
                    <th scope="col">Reorder</th>
                    <th scope="col">Variants</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <span className="employee-email">SKU {product.sku}</span>
                      </td>
                      <td>
                        {product.categoryId
                          ? categoryMap.get(product.categoryId) ?? `Category ${product.categoryId}`
                          : 'Uncategorized'}
                      </td>
                      <td>
                        {product.brandId
                          ? brandMap.get(product.brandId) ?? `Brand ${product.brandId}`
                          : 'No brand'}
                      </td>
                      <td>{formatCurrency(product.sellingPrice)}</td>
                      <td>{getStockQuantity(product)}</td>
                      <td>{Number(product.reorderLevel) || 0}</td>
                      <td>{product.variants.length}</td>
                      <td>
                        <span className={`status-pill status-${product.status}`}>
                          {formatLabel(product.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-action"
                          onClick={() => openEditForm(product)}
                          type="button"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="table-message">No products match your filters.</div>
            ) : null}

            <div className="pagination" aria-label="Product list pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((currentValue) => Math.max(1, currentValue - 1))}
                type="button"
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <button
                disabled={currentPage === pageCount}
                onClick={() => setPage((currentValue) => Math.min(pageCount, currentValue + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>
    </MainLayout>
  );
}
