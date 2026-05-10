import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  listBrands,
  listCategories,
  type CatalogOption,
} from '@/services/catalogService';
import { listProducts, type Product } from '@/services/productService';

type ProductListPageProps = {
  accessToken: string;
  userName?: string;
};

const PAGE_SIZE = 8;

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

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Product List</h1>
          <p className="summary">
            {userName
              ? `Welcome back, ${userName}. Search inventory and review category, brand, price, and stock signals.`
              : 'Search inventory and review category, brand, price, and stock signals.'}
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
