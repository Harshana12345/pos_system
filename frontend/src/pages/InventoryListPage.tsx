import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  listInventory,
  type InventoryBranch,
  type InventoryItem,
} from '@/services/inventoryService';

type InventoryListPageProps = {
  accessToken: string;
  userName?: string;
};

const PAGE_SIZE = 10;

type BranchOption = Pick<InventoryBranch, 'id' | 'name'>;

function formatDateTime(value?: string) {
  if (!value) {
    return 'Not updated';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not updated';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
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

function getQuantityStatus(item: InventoryItem) {
  if (item.quantity === 0) {
    return 'out';
  }

  if (item.lowStockAlert) {
    return 'low';
  }

  return 'healthy';
}

function getQuantityLabel(item: InventoryItem) {
  const status = getQuantityStatus(item);

  if (status === 'out') {
    return 'Out of Stock';
  }

  if (status === 'low') {
    return 'Reorder';
  }

  return 'In Stock';
}

function getBranchOptions(items: InventoryItem[]) {
  const branchMap = new Map<number, BranchOption>();

  items.forEach((item) => {
    if (!branchMap.has(item.branch.id)) {
      branchMap.set(item.branch.id, {
        id: item.branch.id,
        name: item.branch.name,
      });
    }
  });

  return Array.from(branchMap.values()).sort((first, second) =>
    first.name.localeCompare(second.name),
  );
}

function getSearchText(item: InventoryItem) {
  return [
    item.id,
    item.product.name,
    item.product.sku,
    item.product.barcode,
    item.variant?.name,
    item.variant?.sku,
    item.variant?.barcode,
    item.branch.name,
    item.product.status,
    item.variant?.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function InventoryListPage({ accessToken, userName }: InventoryListPageProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadInventory() {
      setIsLoading(true);
      setError('');

      try {
        const response = await listInventory(accessToken);

        if (isMounted) {
          setInventory(response.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load inventory. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInventory();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const branchOptions = useMemo(() => getBranchOptions(inventory), [inventory]);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) => {
        const matchesSearch = !normalizedQuery || getSearchText(item).includes(normalizedQuery);
        const matchesBranch = branchFilter === 'all' || String(item.branchId) === branchFilter;

        return matchesSearch && matchesBranch;
      }),
    [branchFilter, inventory, normalizedQuery],
  );

  const lowStockCount = inventory.filter((item) => item.lowStockAlert && item.quantity > 0).length;
  const outOfStockCount = inventory.filter((item) => item.quantity === 0).length;
  const totalQuantity = inventory.reduce((total, item) => total + item.quantity, 0);
  const pageCount = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleInventory = filteredInventory.slice(pageStart, pageStart + PAGE_SIZE);
  const resultStart = filteredInventory.length === 0 ? 0 : pageStart + 1;
  const resultEnd = Math.min(pageStart + PAGE_SIZE, filteredInventory.length);

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleBranchFilter(value: string) {
    setBranchFilter(value);
    setPage(1);
  }

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Inventory List</h1>
          <p className="summary">
            {userName
              ? `Welcome back, ${userName}. Track stock levels, reorder points, and branch availability.`
              : 'Track stock levels, reorder points, and branch availability.'}
          </p>
        </div>
        <div className="inventory-stats" aria-label="Inventory summary">
          <div className="employee-stat">
            <span>{totalQuantity}</span>
            <p>Total units</p>
          </div>
          <div className="employee-stat">
            <span>{lowStockCount}</span>
            <p>Low stock</p>
          </div>
          <div className="employee-stat">
            <span>{outOfStockCount}</span>
            <p>Out of stock</p>
          </div>
        </div>
      </section>

      <section className="table-panel" aria-labelledby="inventory-table-title">
        <div className="table-toolbar product-toolbar">
          <div>
            <h2 id="inventory-table-title">Stock By Branch</h2>
            <p>
              Showing {resultStart}-{resultEnd} of {filteredInventory.length}
            </p>
          </div>

          <div className="inventory-filters" aria-label="Inventory filters">
            <label className="search-field" htmlFor="inventory-search">
              <span>Search inventory</span>
              <input
                id="inventory-search"
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Product, SKU, variant"
                type="search"
                value={query}
              />
            </label>

            <label className="filter-field" htmlFor="inventory-branch-filter">
              <span>Branch</span>
              <select
                id="inventory-branch-filter"
                onChange={(event) => handleBranchFilter(event.target.value)}
                value={branchFilter}
              >
                <option value="all">All branches</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
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
            Loading inventory...
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="table-wrap">
              <table className="data-table inventory-table">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Reorder Level</th>
                    <th scope="col">Indicator</th>
                    <th scope="col">Last Updated</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleInventory.map((item) => {
                    const quantityStatus = getQuantityStatus(item);

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.product.name}</strong>
                          <span className="employee-email">
                            {item.variant ? `${item.variant.name} | ` : ''}
                            SKU {item.variant?.sku ?? item.product.sku}
                          </span>
                        </td>
                        <td>{item.branch.name}</td>
                        <td>
                          <span className={`quantity-value quantity-${quantityStatus}`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td>{item.reorderLevel}</td>
                        <td>
                          <div
                            aria-label={`${item.quantity} units with reorder level ${item.reorderLevel}`}
                            className="reorder-meter"
                            title={`${item.quantity} units / reorder at ${item.reorderLevel}`}
                          >
                            <span
                              className={`reorder-meter-fill reorder-meter-${quantityStatus}`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    (item.quantity / Math.max(item.reorderLevel || 1, 1)) * 100,
                                  ),
                                )}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td>{formatDateTime(item.lastUpdated)}</td>
                        <td>
                          <span className={`status-pill inventory-status-${quantityStatus}`}>
                            {getQuantityLabel(item)}
                          </span>
                          <span className="employee-email">{formatLabel(item.product.status)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visibleInventory.length === 0 ? (
              <div className="table-message">No inventory items match your filters.</div>
            ) : null}

            <div className="pagination" aria-label="Inventory list pagination">
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
