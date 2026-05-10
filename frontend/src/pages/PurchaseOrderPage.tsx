import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import { listProducts, type Product } from '@/services/productService';
import {
  approvePurchaseOrder,
  createPurchaseOrder,
  receivePurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderReceiveItemPayload,
  type PurchaseOrderItemPayload,
  type PurchaseOrderPayload,
} from '@/services/purchaseService';
import { listSuppliers, type Supplier } from '@/services/supplierService';

type PurchaseOrderPageProps = {
  accessToken: string;
  userBranchId?: number | null;
  userName?: string;
};

type PurchaseFormValues = {
  supplierId: string;
  branchId: string;
  status: string;
  notes: string;
  items: PurchaseItemFormValues[];
};

type PurchaseItemFormValues = {
  localId: string;
  productId: string;
  quantity: string;
  costPrice: string;
};

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Ordered', value: 'ordered' },
];

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeEmptyItem(products: Product[] = []): PurchaseItemFormValues {
  const product = products[0];

  return {
    localId: makeLocalId(),
    productId: product ? String(product.id) : '',
    quantity: '1',
    costPrice: product ? String(product.costPrice ?? 0) : '0',
  };
}

function makeEmptyForm(userBranchId?: number | null): PurchaseFormValues {
  return {
    supplierId: '',
    branchId: userBranchId ? String(userBranchId) : '',
    status: 'draft',
    notes: '',
    items: [makeEmptyItem()],
  };
}

function formatCurrency(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amount);
}

function formatDateTime(value?: string) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
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

function getFormValues(order: PurchaseOrder): PurchaseFormValues {
  return {
    supplierId: String(order.supplierId),
    branchId: String(order.branchId),
    status: ['draft', 'ordered'].includes(order.status) ? order.status : 'draft',
    notes: order.notes ?? '',
    items: order.items.map((item) => ({
      localId: makeLocalId(),
      productId: String(item.productId),
      quantity: String(item.quantity),
      costPrice: String(item.costPrice),
    })),
  };
}

function makeOptionMap<TOption extends { id: number; name: string }>(options: TOption[]) {
  return new Map(options.map((option) => [option.id, option.name]));
}

export function PurchaseOrderPage({
  accessToken,
  userBranchId,
  userName,
}: PurchaseOrderPageProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<PurchaseOrder[]>([]);
  const [formValues, setFormValues] = useState<PurchaseFormValues>(() =>
    makeEmptyForm(userBranchId),
  );
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, string>>({});
  const [receiveError, setReceiveError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPurchaseOptions() {
      setIsLoading(true);
      setError('');

      try {
        const [supplierResponse, productResponse] = await Promise.all([
          listSuppliers(accessToken),
          listProducts(accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        setSuppliers(supplierResponse.data);
        setProducts(productResponse.data);
        setFormValues((currentValues) => ({
          ...currentValues,
          supplierId: currentValues.supplierId || String(supplierResponse.data[0]?.id ?? ''),
          items: currentValues.items.map((item) =>
            item.productId || productResponse.data.length === 0
              ? item
              : makeEmptyItem(productResponse.data),
          ),
        }));
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load purchase order options. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPurchaseOptions();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const supplierMap = useMemo(() => makeOptionMap(suppliers), [suppliers]);
  const lineTotals = formValues.items.map((item) => {
    const quantity = Number(item.quantity);
    const costPrice = Number(item.costPrice);

    return Number.isFinite(quantity) && Number.isFinite(costPrice) ? quantity * costPrice : 0;
  });
  const orderTotal = lineTotals.reduce((total, lineTotal) => total + lineTotal, 0);
  const totalUnits = formValues.items.reduce((total, item) => {
    const quantity = Number(item.quantity);

    return Number.isFinite(quantity) ? total + quantity : total;
  }, 0);
  const draftOrders = recentOrders.filter((order) => order.status === 'draft').length;
  const orderedOrders = recentOrders.filter((order) => order.status === 'ordered').length;
  const receivableOrders = recentOrders.filter((order) =>
    ['ordered', 'partially_received'].includes(order.status),
  ).length;

  function updateFormValue(field: keyof Omit<PurchaseFormValues, 'items'>, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function addItem() {
    setFormValues((currentValues) => ({
      ...currentValues,
      items: [...currentValues.items, makeEmptyItem(products)],
    }));
  }

  function updateItem(
    localId: string,
    field: keyof Omit<PurchaseItemFormValues, 'localId'>,
    value: string,
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      items: currentValues.items.map((item) => {
        if (item.localId !== localId) {
          return item;
        }

        if (field === 'productId') {
          const product = products.find((currentProduct) => String(currentProduct.id) === value);

          return {
            ...item,
            productId: value,
            costPrice: product ? String(product.costPrice ?? item.costPrice) : item.costPrice,
          };
        }

        return { ...item, [field]: value };
      }),
    }));
  }

  function removeItem(localId: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      items:
        currentValues.items.length === 1
          ? currentValues.items
          : currentValues.items.filter((item) => item.localId !== localId),
    }));
  }

  function resetForm() {
    setEditingOrder(null);
    setFormValues({
      ...makeEmptyForm(userBranchId),
      supplierId: suppliers[0] ? String(suppliers[0].id) : '',
      items: [makeEmptyItem(products)],
    });
    setFormError('');
    setFormSuccess('');
  }

  function editOrder(order: PurchaseOrder) {
    setEditingOrder(order);
    setFormValues(getFormValues(order));
    setFormError('');
    setFormSuccess(
      'Loaded order details into the form. Saving will create a new order from these values.',
    );
  }

  function parsePositiveInteger(value: string, label: string) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue <= 0) {
      throw new Error(`${label} must be a positive whole number.`);
    }

    return numberValue;
  }

  function parseNonNegativeNumber(value: string, label: string) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new Error(`${label} must be a non-negative number.`);
    }

    return numberValue;
  }

  function buildPayload(): PurchaseOrderPayload | null {
    try {
      const supplierId = parsePositiveInteger(formValues.supplierId, 'Supplier');
      const branchId = parsePositiveInteger(formValues.branchId, 'Branch');
      const items: PurchaseOrderItemPayload[] = formValues.items.map((item, index) => ({
        productId: parsePositiveInteger(item.productId, `Line ${index + 1} product`),
        quantity: parsePositiveInteger(item.quantity, `Line ${index + 1} quantity`),
        costPrice: parseNonNegativeNumber(item.costPrice, `Line ${index + 1} cost price`),
      }));

      if (items.length === 0) {
        setFormError('At least one line item is required.');
        return null;
      }

      const duplicateProduct = items.find((item, index) =>
        items.some(
          (otherItem, otherIndex) => otherIndex !== index && otherItem.productId === item.productId,
        ),
      );

      if (duplicateProduct) {
        setFormError('Each product can appear only once on a purchase order.');
        return null;
      }

      return {
        supplierId,
        branchId,
        status: formValues.status,
        notes: formValues.notes.trim() || null,
        items,
      };
    } catch (buildError) {
      if (buildError instanceof Error) {
        setFormError(buildError.message);
      } else {
        setFormError('Purchase order details are invalid.');
      }

      return null;
    }
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
      const response = await createPurchaseOrder(accessToken, payload);

      setRecentOrders((currentOrders) => [response.data, ...currentOrders]);
      setEditingOrder(response.data);
      setFormValues(getFormValues(response.data));
      setFormSuccess(
        editingOrder
          ? 'Purchase order saved as a new order.'
          : `Purchase order PO-${response.data.id} created.`,
      );
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFormError(saveError.message);
      } else {
        setFormError('Unable to save purchase order. Check your connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function updateOrderStatus(order: PurchaseOrder) {
    setProcessingOrderId(order.id);
    setError('');

    try {
      const response = await approvePurchaseOrder(accessToken, order.id);

      setRecentOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === response.data.id ? response.data : currentOrder,
        ),
      );

      if (editingOrder?.id === response.data.id) {
        setEditingOrder(response.data);
        setFormValues(getFormValues(response.data));
      }
    } catch (statusError) {
      if (statusError instanceof ApiError) {
        setError(statusError.message);
      } else {
        setError('Unable to update purchase order status. Check your connection and try again.');
      }
    } finally {
      setProcessingOrderId(null);
    }
  }

  function openReceiveFlow(order: PurchaseOrder) {
    setReceivingOrder(order);
    setReceiveError('');
    setReceiveQuantities(
      Object.fromEntries(
        order.items.map((item) => [
          item.id,
          String(Math.max(item.remainingQuantity ?? item.quantity - (item.receivedQuantity ?? 0), 0)),
        ]),
      ),
    );
  }

  function closeReceiveFlow() {
    if (processingOrderId !== null) {
      return;
    }

    setReceivingOrder(null);
    setReceiveQuantities({});
    setReceiveError('');
  }

  function updateReceiveQuantity(itemId: number, value: string) {
    setReceiveQuantities((currentQuantities) => ({
      ...currentQuantities,
      [itemId]: value,
    }));
  }

  function buildReceivePayload(order: PurchaseOrder): PurchaseOrderReceiveItemPayload[] | null {
    try {
      const items = order.items
        .map((item, index) => {
          const quantityReceived = Number(receiveQuantities[item.id] ?? 0);
          const remainingQuantity = item.remainingQuantity ?? item.quantity - (item.receivedQuantity ?? 0);

          if (!Number.isInteger(quantityReceived) || quantityReceived < 0) {
            throw new Error(`Line ${index + 1} receive quantity must be zero or a whole number.`);
          }

          if (quantityReceived > remainingQuantity) {
            throw new Error(`Line ${index + 1} receive quantity cannot exceed remaining units.`);
          }

          return {
            purchaseOrderItemId: item.id,
            quantityReceived,
          };
        })
        .filter((item) => item.quantityReceived > 0);

      if (items.length === 0) {
        setReceiveError('Enter a receive quantity for at least one line.');
        return null;
      }

      return items;
    } catch (payloadError) {
      setReceiveError(
        payloadError instanceof Error ? payloadError.message : 'Receipt quantities are invalid.',
      );
      return null;
    }
  }

  async function submitReceiveFlow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!receivingOrder) {
      return;
    }

    setReceiveError('');
    const items = buildReceivePayload(receivingOrder);

    if (!items) {
      return;
    }

    setProcessingOrderId(receivingOrder.id);

    try {
      const response = await receivePurchaseOrder(accessToken, receivingOrder.id, { items });

      setRecentOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === response.data.id ? response.data : currentOrder,
        ),
      );

      if (editingOrder?.id === response.data.id) {
        setEditingOrder(response.data);
        setFormValues(getFormValues(response.data));
      }

      setReceivingOrder(null);
      setReceiveQuantities({});
      setFormSuccess(`Receipt saved for PO-${response.data.id}.`);
    } catch (receiveFlowError) {
      if (receiveFlowError instanceof ApiError) {
        setReceiveError(receiveFlowError.message);
      } else {
        setReceiveError('Unable to receive purchase order. Check your connection and try again.');
      }
    } finally {
      setProcessingOrderId(null);
    }
  }

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Purchasing</p>
          <h1>Purchase Orders</h1>
          <p className="summary">
            {userName
              ? `Welcome back, ${userName}. Create supplier orders, manage line items, and track received stock.`
              : 'Create supplier orders, manage line items, and track received stock.'}
          </p>
        </div>
        <div className="supplier-stats" aria-label="Purchase order summary">
          <div className="employee-stat">
            <span>{recentOrders.length}</span>
            <p>Session orders</p>
          </div>
          <div className="employee-stat">
            <span>{draftOrders}</span>
            <p>Draft</p>
          </div>
          <div className="employee-stat">
            <span>{receivableOrders || orderedOrders}</span>
            <p>Receivable</p>
          </div>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="purchase-form-title">
        <div className="form-panel-header">
          <div>
            <h2 id="purchase-form-title">
              {editingOrder ? `Edit PO-${editingOrder.id}` : 'Create Purchase Order'}
            </h2>
            <p>Select a supplier, branch, status, and one or more product lines.</p>
          </div>
          <button className="secondary-action" onClick={resetForm} type="button">
            New Order
          </button>
        </div>

        {error ? (
          <div className="table-message table-message-error" role="alert">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="table-message" role="status">
            Loading purchase order options...
          </div>
        ) : null}

        {!isLoading ? (
          <form className="purchase-order-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="purchase-supplier">
              Supplier
              <select
                id="purchase-supplier"
                onChange={(event) => updateFormValue('supplierId', event.target.value)}
                required
                value={formValues.supplierId}
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="purchase-branch">
              Branch ID
              <input
                id="purchase-branch"
                min="1"
                onChange={(event) => updateFormValue('branchId', event.target.value)}
                required
                step="1"
                type="number"
                value={formValues.branchId}
              />
            </label>

            <label className="field" htmlFor="purchase-status">
              Status
              <select
                id="purchase-status"
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

            <label className="field purchase-form-wide" htmlFor="purchase-notes">
              Notes
              <textarea
                id="purchase-notes"
                onChange={(event) => updateFormValue('notes', event.target.value)}
                rows={3}
                value={formValues.notes}
              />
            </label>

            <div className="product-form-section purchase-form-wide">
              <div className="section-heading">
                <div>
                  <h3>Line Items</h3>
                  <p>
                    {formValues.items.length} lines, {totalUnits} units
                  </p>
                </div>
                <button className="secondary-action" onClick={addItem} type="button">
                  Add Line
                </button>
              </div>

              <div className="purchase-line-list">
                {formValues.items.map((item, index) => (
                  <div className="purchase-line-row" key={item.localId}>
                    <label
                      className="field purchase-line-product"
                      htmlFor={`purchase-product-${item.localId}`}
                    >
                      Product
                      <select
                        id={`purchase-product-${item.localId}`}
                        onChange={(event) =>
                          updateItem(item.localId, 'productId', event.target.value)
                        }
                        required
                        value={item.productId}
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field" htmlFor={`purchase-quantity-${item.localId}`}>
                      Quantity
                      <input
                        id={`purchase-quantity-${item.localId}`}
                        min="1"
                        onChange={(event) =>
                          updateItem(item.localId, 'quantity', event.target.value)
                        }
                        required
                        step="1"
                        type="number"
                        value={item.quantity}
                      />
                    </label>

                    <label className="field" htmlFor={`purchase-cost-${item.localId}`}>
                      Cost
                      <input
                        id={`purchase-cost-${item.localId}`}
                        min="0"
                        onChange={(event) =>
                          updateItem(item.localId, 'costPrice', event.target.value)
                        }
                        required
                        step="0.01"
                        type="number"
                        value={item.costPrice}
                      />
                    </label>

                    <div className="purchase-line-total">
                      <span>Line {index + 1}</span>
                      <strong>{formatCurrency(lineTotals[index] ?? 0)}</strong>
                    </div>

                    <button
                      className="secondary-action remove-action"
                      disabled={formValues.items.length === 1}
                      onClick={() => removeItem(item.localId)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="purchase-summary purchase-form-wide" aria-label="Purchase order total">
              <div>
                <span>Order Total</span>
                <strong>{formatCurrency(orderTotal)}</strong>
              </div>
              <p>
                {formValues.supplierId
                  ? `Supplier ${supplierMap.get(Number(formValues.supplierId)) ?? formValues.supplierId}`
                  : 'No supplier selected'}
              </p>
            </div>

            {formError ? (
              <div className="form-alert purchase-form-wide" role="alert">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="form-alert form-alert-success purchase-form-wide" role="status">
                {formSuccess}
              </div>
            ) : null}

            <div className="form-actions purchase-form-wide">
              <button className="primary-action" disabled={isSaving} type="submit">
                {isSaving ? 'Saving...' : editingOrder ? 'Save as New Order' : 'Create Order'}
              </button>
              <button className="secondary-action" onClick={resetForm} type="button">
                Clear
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="table-panel" aria-labelledby="purchase-session-title">
        <div className="table-toolbar">
          <div>
            <h2 id="purchase-session-title">Recent Purchase Orders</h2>
            <p>Orders created during this browser session.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table supplier-history-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Supplier</th>
                <th scope="col">Branch</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>PO-{order.id}</strong>
                    <span className="employee-email">{order.notes || 'No notes'}</span>
                  </td>
                  <td>{supplierMap.get(order.supplierId) ?? `Supplier ${order.supplierId}`}</td>
                  <td>Branch {order.branchId}</td>
                  <td>
                    {order.items.length} lines
                    <span className="employee-email">
                      {order.items.reduce((total, item) => total + item.quantity, 0)} units
                      {' / '}
                      {order.items.reduce(
                        (total, item) => total + (item.receivedQuantity ?? 0),
                        0,
                      )}{' '}
                      received
                    </span>
                  </td>
                  <td>{formatCurrency(order.totalAmount)}</td>
                  <td>
                    <span className={`status-pill purchase-status-${order.status}`}>
                      {formatLabel(order.status)}
                    </span>
                  </td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="table-action" onClick={() => editOrder(order)} type="button">
                        Edit
                      </button>
                      <button
                        className="table-action"
                        disabled={order.status !== 'draft' || processingOrderId === order.id}
                        onClick={() => updateOrderStatus(order)}
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="table-action"
                        disabled={
                          !['ordered', 'partially_received'].includes(order.status) ||
                          processingOrderId === order.id
                        }
                        onClick={() => openReceiveFlow(order)}
                        type="button"
                      >
                        Receive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentOrders.length === 0 ? (
          <div className="table-message">No purchase orders created in this session.</div>
        ) : null}
      </section>

      {receivingOrder ? (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-labelledby="receive-modal-title"
            className="modal-panel receive-modal"
            onSubmit={submitReceiveFlow}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Receive Stock</p>
                <h2 id="receive-modal-title">PO-{receivingOrder.id}</h2>
                <p>Enter the units arriving now for each purchase order line.</p>
              </div>
              <button
                aria-label="Close receive dialog"
                className="modal-close"
                disabled={processingOrderId === receivingOrder.id}
                onClick={closeReceiveFlow}
                type="button"
              >
                x
              </button>
            </div>

            <div className="receive-line-list">
              {receivingOrder.items.map((item, index) => {
                const receivedQuantity = item.receivedQuantity ?? 0;
                const remainingQuantity = item.remainingQuantity ?? item.quantity - receivedQuantity;

                return (
                  <div className="receive-line-row" key={item.id}>
                    <div>
                      <strong>
                        {products.find((product) => product.id === item.productId)?.name ??
                          `Product ${item.productId}`}
                      </strong>
                      <span className="employee-email">Line {index + 1}</span>
                    </div>
                    <div className="receive-line-metrics">
                      <span>Ordered {item.quantity}</span>
                      <span>Received {receivedQuantity}</span>
                      <span>Remaining {remainingQuantity}</span>
                    </div>
                    <label className="field" htmlFor={`receive-quantity-${item.id}`}>
                      Receive Now
                      <input
                        id={`receive-quantity-${item.id}`}
                        max={remainingQuantity}
                        min="0"
                        onChange={(event) => updateReceiveQuantity(item.id, event.target.value)}
                        required
                        step="1"
                        type="number"
                        value={receiveQuantities[item.id] ?? ''}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            {receiveError ? (
              <div className="form-alert receive-alert" role="alert">
                {receiveError}
              </div>
            ) : null}

            <div className="modal-actions">
              <button
                className="secondary-action"
                disabled={processingOrderId === receivingOrder.id}
                onClick={closeReceiveFlow}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary-action"
                disabled={processingOrderId === receivingOrder.id}
                type="submit"
              >
                {processingOrderId === receivingOrder.id ? 'Receiving...' : 'Save Receipt'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </MainLayout>
  );
}
