import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  createSupplierPayment,
  getSupplierPurchaseHistory,
  type Supplier,
  type SupplierPaymentPayload,
  type SupplierPurchase,
} from '@/services/supplierService';

type SupplierDetailPageProps = {
  accessToken: string;
  supplier: Supplier;
  onBack: () => void;
  onSupplierChange: (supplier: Supplier) => void;
};

type PaymentFormValues = {
  amount: string;
  method: string;
  referenceNumber: string;
  paidAt: string;
  notes: string;
};

const PAYMENT_METHODS = [
  'Bank transfer',
  'Cash',
  'Card',
  'Cheque',
  'Credit note',
  'Other',
];

const EMPTY_PAYMENT_FORM: PaymentFormValues = {
  amount: '',
  method: PAYMENT_METHODS[0],
  referenceNumber: '',
  paidAt: '',
  notes: '',
};

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

function getItemCount(purchases: SupplierPurchase[]) {
  return purchases.reduce(
    (total, purchase) =>
      total + purchase.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
    0,
  );
}

export function SupplierDetailPage({
  accessToken,
  supplier,
  onBack,
  onSupplierChange,
}: SupplierDetailPageProps) {
  const [purchaseHistory, setPurchaseHistory] = useState<SupplierPurchase[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [paymentForm, setPaymentForm] = useState<PaymentFormValues>(EMPTY_PAYMENT_FORM);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setIsLoading(true);
      setError('');

      try {
        const response = await getSupplierPurchaseHistory(accessToken, supplier.id);

        if (isMounted) {
          setPurchaseHistory(response.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load supplier purchase history. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [accessToken, supplier.id]);

  const totalPurchased = useMemo(
    () =>
      purchaseHistory.reduce((total, purchase) => {
        const amount = Number(purchase.totalAmount);
        return Number.isFinite(amount) ? total + amount : total;
      }, 0),
    [purchaseHistory],
  );
  const receivedCount = purchaseHistory.filter((purchase) => purchase.status === 'received').length;
  const supplierBalance = Number(supplier.balance);
  const normalizedBalance = Number.isFinite(supplierBalance) ? supplierBalance : 0;
  const paymentAmount = Number(paymentForm.amount);
  const canSubmitPayment =
    paymentForm.amount.trim() !== '' &&
    Number.isFinite(paymentAmount) &&
    paymentAmount > 0 &&
    paymentAmount <= normalizedBalance &&
    !isSavingPayment;

  function updatePaymentForm(field: keyof PaymentFormValues, value: string) {
    setPaymentForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function buildPaymentPayload(): SupplierPaymentPayload | null {
    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return null;
    }

    if (amount > normalizedBalance) {
      setPaymentError('Payment amount cannot exceed the outstanding balance.');
      return null;
    }

    return {
      amount,
      method: paymentForm.method.trim() || null,
      referenceNumber: paymentForm.referenceNumber.trim() || null,
      paidAt: paymentForm.paidAt || null,
      notes: paymentForm.notes.trim() || null,
    };
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError('');
    setPaymentSuccess('');

    const payload = buildPaymentPayload();

    if (!payload) {
      return;
    }

    setIsSavingPayment(true);

    try {
      const response = await createSupplierPayment(accessToken, supplier.id, payload);
      const updatedSupplier = {
        ...supplier,
        balance: response.data.supplierBalance,
        updatedAt: response.data.createdAt,
      };

      onSupplierChange(updatedSupplier);
      setPaymentForm(EMPTY_PAYMENT_FORM);
      setPaymentSuccess(
        `${formatCurrency(response.data.amount)} payment recorded. New balance is ${formatCurrency(
          response.data.supplierBalance,
        )}.`,
      );
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setPaymentError(saveError.message);
      } else {
        setPaymentError('Unable to record payment. Check your connection and try again.');
      }
    } finally {
      setIsSavingPayment(false);
    }
  }

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Supplier Detail</p>
          <h1>{supplier.name}</h1>
          <p className="summary">
            Track contact details, outstanding balance, payments, and purchase history for this
            supplier.
          </p>
        </div>
        <button className="secondary-action" onClick={onBack} type="button">
          Back to Suppliers
        </button>
      </section>

      <section className="supplier-detail-grid" aria-label="Supplier account summary">
        <div className="supplier-profile-panel">
          <div className="section-heading">
            <div>
              <h2>Supplier Profile</h2>
              <p>
                <span className={`status-pill status-${supplier.status}`}>
                  {formatLabel(supplier.status)}
                </span>
              </p>
            </div>
          </div>

          <dl className="detail-list">
            <div>
              <dt>Phone</dt>
              <dd>{supplier.contactNumber || 'No phone recorded'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{supplier.email || 'No email recorded'}</dd>
            </div>
            <div>
              <dt>Tax ID</dt>
              <dd>{supplier.taxId || 'Not set'}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{supplier.address || 'No address recorded'}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{supplier.notes || 'No notes recorded'}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDateTime(supplier.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="supplier-account-panel">
          <div className="account-stat">
            <span>Outstanding</span>
            <strong>{formatCurrency(normalizedBalance)}</strong>
          </div>
          <div className="account-stat">
            <span>Total purchased</span>
            <strong>{formatCurrency(totalPurchased)}</strong>
          </div>
          <div className="account-stat">
            <span>Purchase orders</span>
            <strong>{purchaseHistory.length}</strong>
          </div>
          <div className="account-stat">
            <span>Received orders</span>
            <strong>{receivedCount}</strong>
          </div>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="supplier-payment-title">
        <div className="form-panel-header">
          <div>
            <h2 id="supplier-payment-title">Record Payment</h2>
            <p>Apply supplier payments against the current outstanding balance.</p>
          </div>
        </div>

        <form className="supplier-payment-form" onSubmit={handlePaymentSubmit}>
          <label className="field" htmlFor="supplier-payment-amount">
            Amount
            <input
              id="supplier-payment-amount"
              max={normalizedBalance}
              min="0.01"
              onChange={(event) => updatePaymentForm('amount', event.target.value)}
              step="0.01"
              type="number"
              value={paymentForm.amount}
            />
          </label>

          <label className="field" htmlFor="supplier-payment-method">
            Method
            <select
              id="supplier-payment-method"
              onChange={(event) => updatePaymentForm('method', event.target.value)}
              value={paymentForm.method}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>

          <label className="field" htmlFor="supplier-payment-reference">
            Reference
            <input
              id="supplier-payment-reference"
              onChange={(event) => updatePaymentForm('referenceNumber', event.target.value)}
              type="text"
              value={paymentForm.referenceNumber}
            />
          </label>

          <label className="field" htmlFor="supplier-payment-date">
            Paid At
            <input
              id="supplier-payment-date"
              onChange={(event) => updatePaymentForm('paidAt', event.target.value)}
              type="datetime-local"
              value={paymentForm.paidAt}
            />
          </label>

          <label className="field supplier-form-wide" htmlFor="supplier-payment-notes">
            Notes
            <textarea
              id="supplier-payment-notes"
              onChange={(event) => updatePaymentForm('notes', event.target.value)}
              rows={3}
              value={paymentForm.notes}
            />
          </label>

          {paymentError ? (
            <div className="form-alert supplier-form-wide" role="alert">
              {paymentError}
            </div>
          ) : null}

          {paymentSuccess ? (
            <div className="form-alert form-alert-success supplier-form-wide" role="status">
              {paymentSuccess}
            </div>
          ) : null}

          <div className="form-actions supplier-form-wide">
            <button className="primary-action" disabled={!canSubmitPayment} type="submit">
              {isSavingPayment ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </section>

      <section className="table-panel" aria-labelledby="supplier-history-title">
        <div className="table-toolbar">
          <div>
            <h2 id="supplier-history-title">Purchase History</h2>
            <p>
              {purchaseHistory.length} orders with {getItemCount(purchaseHistory)} purchased units
            </p>
          </div>
        </div>

        {error ? (
          <div className="table-message table-message-error" role="alert">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="table-message" role="status">
            Loading purchase history...
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="table-wrap">
              <table className="data-table supplier-history-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Items</th>
                    <th scope="col">Total</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>
                        <strong>PO-{purchase.id}</strong>
                        <span className="employee-email">Supplier #{purchase.supplierId}</span>
                      </td>
                      <td>Branch {purchase.branchId}</td>
                      <td>
                        {purchase.items.length} lines
                        <span className="employee-email">
                          {purchase.items.reduce((total, item) => total + item.quantity, 0)} units
                        </span>
                      </td>
                      <td>{formatCurrency(purchase.totalAmount)}</td>
                      <td>
                        <span className={`status-pill purchase-status-${purchase.status}`}>
                          {formatLabel(purchase.status)}
                        </span>
                      </td>
                      <td>{formatDateTime(purchase.createdAt)}</td>
                      <td>{purchase.notes || 'No notes'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {purchaseHistory.length === 0 ? (
              <div className="table-message">No purchases recorded for this supplier.</div>
            ) : null}
          </>
        ) : null}
      </section>
    </MainLayout>
  );
}
