import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  adjustInventoryStock,
  listInventory,
  type InventoryBranch,
  type InventoryItem,
} from '@/services/inventoryService';

type InventoryListPageProps = {
  accessToken: string;
  userName?: string;
};

const PAGE_SIZE = 10;
const ADJUSTMENT_REASONS = [
  'Cycle count correction',
  'Damaged stock',
  'Waste',
  'Supplier receipt',
  'Customer return',
  'Transfer correction',
  'Other adjustment',
];

type BranchOption = Pick<InventoryBranch, 'id' | 'name'>;

type AdjustmentFormState = {
  quantityChange: string;
  reason: string;
  confirmed: boolean;
};

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

function getItemLabel(item: InventoryItem) {
  return item.variant ? `${item.product.name} - ${item.variant.name}` : item.product.name;
}

export function InventoryListPage({ accessToken, userName }: InventoryListPageProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>({
    quantityChange: '',
    reason: ADJUSTMENT_REASONS[0],
    confirmed: false,
  });
  const [adjustmentError, setAdjustmentError] = useState('');
  const [adjustmentSuccess, setAdjustmentSuccess] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

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

  useEffect(() => {
    if (!adjustingItem) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isAdjusting) {
        setAdjustingItem(null);
        setAdjustmentError('');
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [adjustingItem, isAdjusting]);

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
  const parsedQuantityChange = Number(adjustmentForm.quantityChange);
  const hasQuantityChange =
    adjustmentForm.quantityChange.trim() !== '' && Number.isInteger(parsedQuantityChange);
  const projectedQuantity = adjustingItem ? adjustingItem.quantity + parsedQuantityChange : 0;
  const canSubmitAdjustment =
    Boolean(adjustingItem) &&
    hasQuantityChange &&
    parsedQuantityChange !== 0 &&
    projectedQuantity >= 0 &&
    adjustmentForm.reason.trim().length > 0 &&
    adjustmentForm.confirmed &&
    !isAdjusting;

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleBranchFilter(value: string) {
    setBranchFilter(value);
    setPage(1);
  }

  function openAdjustmentModal(item: InventoryItem) {
    setAdjustingItem(item);
    setAdjustmentForm({
      quantityChange: '',
      reason: ADJUSTMENT_REASONS[0],
      confirmed: false,
    });
    setAdjustmentError('');
    setAdjustmentSuccess('');
  }

  function closeAdjustmentModal() {
    if (isAdjusting) {
      return;
    }

    setAdjustingItem(null);
    setAdjustmentError('');
  }

  async function handleAdjustmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!adjustingItem) {
      return;
    }

    if (!hasQuantityChange || parsedQuantityChange === 0) {
      setAdjustmentError('Enter a positive or negative whole-number adjustment.');
      return;
    }

    if (projectedQuantity < 0) {
      setAdjustmentError('This adjustment would make stock negative.');
      return;
    }

    if (!adjustmentForm.confirmed) {
      setAdjustmentError('Confirm the adjustment before applying it.');
      return;
    }

    setIsAdjusting(true);
    setAdjustmentError('');

    try {
      const response = await adjustInventoryStock(accessToken, {
        inventoryId: adjustingItem.id,
        quantityChange: parsedQuantityChange,
        reason: adjustmentForm.reason,
      });

      setInventory((currentInventory) =>
        currentInventory.map((item) =>
          item.id === response.data.inventory.id ? response.data.inventory : item,
        ),
      );
      setAdjustmentSuccess(
        `${getItemLabel(response.data.inventory)} adjusted to ${response.data.inventory.quantity} units.`,
      );
      setAdjustingItem(null);
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setAdjustmentError(saveError.message);
      } else {
        setAdjustmentError('Unable to adjust stock. Check your connection and try again.');
      }
    } finally {
      setIsAdjusting(false);
    }
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

        {adjustmentSuccess ? (
          <div className="table-message table-message-success" role="status">
            {adjustmentSuccess}
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
                    <th scope="col">Actions</th>
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
                        <td>
                          <button
                            className="table-action"
                            onClick={() => openAdjustmentModal(item)}
                            type="button"
                          >
                            Adjust
                          </button>
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

      {adjustingItem ? (
        <div
          aria-labelledby="stock-adjustment-title"
          aria-modal="true"
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAdjustmentModal();
            }
          }}
          role="dialog"
        >
          <form className="modal-panel stock-adjustment-modal" onSubmit={handleAdjustmentSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Stock Adjustment</p>
                <h2 id="stock-adjustment-title">{getItemLabel(adjustingItem)}</h2>
                <p>
                  {adjustingItem.branch.name} currently has {adjustingItem.quantity} units.
                </p>
              </div>
              <button
                aria-label="Close stock adjustment modal"
                className="modal-close"
                disabled={isAdjusting}
                onClick={closeAdjustmentModal}
                type="button"
              >
                x
              </button>
            </div>

            <div className="stock-adjustment-body">
              <label className="field" htmlFor="stock-adjustment-quantity">
                <span>Quantity adjustment</span>
                <input
                  aria-invalid={
                    adjustmentForm.quantityChange.trim() !== '' &&
                    (!hasQuantityChange || parsedQuantityChange === 0 || projectedQuantity < 0)
                  }
                  autoFocus
                  id="stock-adjustment-quantity"
                  onChange={(event) =>
                    setAdjustmentForm((currentForm) => ({
                      ...currentForm,
                      confirmed: false,
                      quantityChange: event.target.value,
                    }))
                  }
                  placeholder="Use -3 or 12"
                  step="1"
                  type="number"
                  value={adjustmentForm.quantityChange}
                />
                <span className="form-hint">
                  Use positive numbers to add stock and negative numbers to remove stock.
                </span>
              </label>

              <label className="field" htmlFor="stock-adjustment-reason">
                <span>Reason</span>
                <select
                  id="stock-adjustment-reason"
                  onChange={(event) =>
                    setAdjustmentForm((currentForm) => ({
                      ...currentForm,
                      confirmed: false,
                      reason: event.target.value,
                    }))
                  }
                  value={adjustmentForm.reason}
                >
                  {ADJUSTMENT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>

              <div className="adjustment-confirmation">
                <div>
                  <span>New quantity</span>
                  <strong>{hasQuantityChange ? projectedQuantity : '--'}</strong>
                </div>
                <p>
                  {hasQuantityChange
                    ? `${adjustingItem.quantity} ${parsedQuantityChange > 0 ? '+' : ''}${parsedQuantityChange} units`
                    : 'Enter a quantity adjustment to preview the result.'}
                </p>
              </div>

              <label className="checkbox-field adjustment-confirm-check">
                <input
                  checked={adjustmentForm.confirmed}
                  disabled={
                    !hasQuantityChange || parsedQuantityChange === 0 || projectedQuantity < 0
                  }
                  onChange={(event) =>
                    setAdjustmentForm((currentForm) => ({
                      ...currentForm,
                      confirmed: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>I confirm this stock adjustment is correct.</span>
              </label>

              {adjustmentError ? (
                <div className="form-alert" role="alert">
                  {adjustmentError}
                </div>
              ) : null}
            </div>

            <div className="modal-actions">
              <button
                className="secondary-action"
                disabled={isAdjusting}
                onClick={closeAdjustmentModal}
                type="button"
              >
                Cancel
              </button>
              <button className="primary-action" disabled={!canSubmitAdjustment} type="submit">
                {isAdjusting ? 'Applying...' : 'Apply Adjustment'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </MainLayout>
  );
}
