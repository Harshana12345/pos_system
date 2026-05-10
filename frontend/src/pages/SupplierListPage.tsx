import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
  type Supplier,
  type SupplierPayload,
} from '@/services/supplierService';

type SupplierListPageProps = {
  accessToken: string;
  userName?: string;
  onOpenSupplier: (supplier: Supplier) => void;
};

type SupplierFormValues = {
  name: string;
  contactNumber: string;
  email: string;
  address: string;
  taxId: string;
  notes: string;
  balance: string;
  status: string;
};

const PAGE_SIZE = 8;
const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];
const EMPTY_FORM_VALUES: SupplierFormValues = {
  name: '',
  contactNumber: '',
  email: '',
  address: '',
  taxId: '',
  notes: '',
  balance: '0',
  status: 'active',
};

function formatCurrency(value: Supplier['balance']) {
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

function formatDate(value?: string) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
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

function getSearchText(supplier: Supplier) {
  return [
    supplier.id,
    supplier.name,
    supplier.contactNumber,
    supplier.email,
    supplier.address,
    supplier.taxId,
    supplier.notes,
    supplier.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getFormValues(supplier: Supplier): SupplierFormValues {
  return {
    name: supplier.name,
    contactNumber: supplier.contactNumber ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    taxId: supplier.taxId ?? '',
    notes: supplier.notes ?? '',
    balance: String(supplier.balance ?? 0),
    status: supplier.status,
  };
}

export function SupplierListPage({ accessToken, userName, onOpenSupplier }: SupplierListPageProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formValues, setFormValues] = useState<SupplierFormValues>(EMPTY_FORM_VALUES);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSuppliers() {
      setIsLoading(true);
      setError('');

      try {
        const response = await listSuppliers(accessToken);

        if (isMounted) {
          setSuppliers(response.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load suppliers. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSuppliers();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter((supplier) => {
        const matchesSearch =
          !normalizedQuery || getSearchText(supplier).includes(normalizedQuery);
        const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [normalizedQuery, statusFilter, suppliers],
  );
  const pageCount = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleSuppliers = filteredSuppliers.slice(pageStart, pageStart + PAGE_SIZE);
  const resultStart = filteredSuppliers.length === 0 ? 0 : pageStart + 1;
  const resultEnd = Math.min(pageStart + PAGE_SIZE, filteredSuppliers.length);
  const activeCount = suppliers.filter((supplier) => supplier.status === 'active').length;
  const outstandingBalance = suppliers.reduce((total, supplier) => {
    const balance = Number(supplier.balance);
    return Number.isFinite(balance) ? total + balance : total;
  }, 0);

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function openCreateForm() {
    setEditingSupplier(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function openEditForm(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormValues(getFormValues(supplier));
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingSupplier(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(false);
  }

  function updateFormValue(field: keyof SupplierFormValues, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function buildPayload(): SupplierPayload | null {
    const name = formValues.name.trim();
    const balance = Number(formValues.balance || 0);

    if (!name) {
      setFormError('Supplier name is required.');
      return null;
    }

    if (!Number.isFinite(balance) || balance < 0) {
      setFormError('Supplier balance must be a non-negative number.');
      return null;
    }

    return {
      name,
      contactNumber: formValues.contactNumber.trim() || null,
      email: formValues.email.trim() || null,
      address: formValues.address.trim() || null,
      taxId: formValues.taxId.trim() || null,
      notes: formValues.notes.trim() || null,
      balance,
      status: formValues.status,
    };
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
      const response = editingSupplier
        ? await updateSupplier(accessToken, editingSupplier.id, payload)
        : await createSupplier(accessToken, payload);

      setSuppliers((currentSuppliers) => {
        const exists = currentSuppliers.some((supplier) => supplier.id === response.data.id);
        const nextSuppliers = exists
          ? currentSuppliers.map((supplier) =>
              supplier.id === response.data.id ? response.data : supplier,
            )
          : [...currentSuppliers, response.data];

        return nextSuppliers.sort((first, second) => first.id - second.id);
      });
      setEditingSupplier(response.data);
      setFormValues(getFormValues(response.data));
      setFormSuccess(editingSupplier ? 'Supplier updated.' : 'Supplier created.');
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFormError(saveError.message);
      } else {
        setFormError('Unable to save supplier. Check your connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(supplier: Supplier) {
    const confirmed = window.confirm(
      `Delete ${supplier.name}? Purchase records may block this action.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(supplier.id);
    setError('');

    try {
      await deleteSupplier(accessToken, supplier.id);
      setSuppliers((currentSuppliers) =>
        currentSuppliers.filter((currentSupplier) => currentSupplier.id !== supplier.id),
      );

      if (editingSupplier?.id === supplier.id) {
        closeForm();
      }
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message);
      } else {
        setError('Unable to delete supplier. Check your connection and try again.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Purchasing</p>
          <h1>Supplier Management</h1>
          <p className="summary">
            {userName
              ? `Welcome back, ${userName}. Maintain suppliers, balances, and purchasing contacts.`
              : 'Maintain suppliers, balances, and purchasing contacts.'}
          </p>
        </div>
        <div className="supplier-stats" aria-label="Supplier summary">
          <div className="employee-stat">
            <span>{suppliers.length}</span>
            <p>Total suppliers</p>
          </div>
          <div className="employee-stat">
            <span>{activeCount}</span>
            <p>Active</p>
          </div>
          <div className="employee-stat">
            <span>{formatCurrency(outstandingBalance)}</span>
            <p>Outstanding</p>
          </div>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="supplier-form-title">
        <div className="form-panel-header">
          <div>
            <h2 id="supplier-form-title">
              {isFormOpen
                ? editingSupplier
                  ? 'Edit Supplier'
                  : 'Create Supplier'
                : 'Manage Supplier'}
            </h2>
            <p>
              {isFormOpen
                ? 'Set supplier contact details, status, notes, and opening balance.'
                : 'Create a supplier or edit an existing supplier from the directory.'}
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
              New Supplier
            </button>
          )}
        </div>

        {isFormOpen ? (
          <form className="supplier-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="supplier-name">
              Name
              <input
                id="supplier-name"
                onChange={(event) => updateFormValue('name', event.target.value)}
                required
                type="text"
                value={formValues.name}
              />
            </label>

            <label className="field" htmlFor="supplier-contact">
              Contact Number
              <input
                id="supplier-contact"
                onChange={(event) => updateFormValue('contactNumber', event.target.value)}
                type="tel"
                value={formValues.contactNumber}
              />
            </label>

            <label className="field" htmlFor="supplier-email">
              Email
              <input
                id="supplier-email"
                onChange={(event) => updateFormValue('email', event.target.value)}
                type="email"
                value={formValues.email}
              />
            </label>

            <label className="field" htmlFor="supplier-tax-id">
              Tax ID
              <input
                id="supplier-tax-id"
                onChange={(event) => updateFormValue('taxId', event.target.value)}
                type="text"
                value={formValues.taxId}
              />
            </label>

            <label className="field" htmlFor="supplier-balance">
              Balance
              <input
                id="supplier-balance"
                min="0"
                onChange={(event) => updateFormValue('balance', event.target.value)}
                step="0.01"
                type="number"
                value={formValues.balance}
              />
            </label>

            <label className="field" htmlFor="supplier-status">
              Status
              <select
                id="supplier-status"
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

            <label className="field supplier-form-wide" htmlFor="supplier-address">
              Address
              <textarea
                id="supplier-address"
                onChange={(event) => updateFormValue('address', event.target.value)}
                rows={3}
                value={formValues.address}
              />
            </label>

            <label className="field supplier-form-wide" htmlFor="supplier-notes">
              Notes
              <textarea
                id="supplier-notes"
                onChange={(event) => updateFormValue('notes', event.target.value)}
                rows={3}
                value={formValues.notes}
              />
            </label>

            {formError ? (
              <div className="form-alert supplier-form-wide" role="alert">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="form-alert form-alert-success supplier-form-wide" role="status">
                {formSuccess}
              </div>
            ) : null}

            <div className="form-actions supplier-form-wide">
              <button className="primary-action" disabled={isSaving} type="submit">
                {isSaving ? 'Saving...' : editingSupplier ? 'Save Changes' : 'Create Supplier'}
              </button>
              {editingSupplier ? (
                <button className="secondary-action" onClick={openCreateForm} type="button">
                  Create New
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className="table-panel" aria-labelledby="supplier-table-title">
        <div className="table-toolbar product-toolbar">
          <div>
            <h2 id="supplier-table-title">Supplier Directory</h2>
            <p>
              Showing {resultStart}-{resultEnd} of {filteredSuppliers.length}
            </p>
          </div>

          <div className="supplier-filters" aria-label="Supplier filters">
            <label className="search-field" htmlFor="supplier-search">
              <span>Search suppliers</span>
              <input
                id="supplier-search"
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Name, contact, email"
                type="search"
                value={query}
              />
            </label>

            <label className="filter-field" htmlFor="supplier-status-filter">
              <span>Status</span>
              <select
                id="supplier-status-filter"
                onChange={(event) => handleStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
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
            Loading suppliers...
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="table-wrap">
              <table className="data-table supplier-table">
                <thead>
                  <tr>
                    <th scope="col">Supplier</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Tax ID</th>
                    <th scope="col">Balance</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <strong>{supplier.name}</strong>
                        <span className="employee-email">
                          {supplier.address || 'No address recorded'}
                        </span>
                      </td>
                      <td>
                        {supplier.contactNumber || 'No phone'}
                        <span className="employee-email">{supplier.email || 'No email'}</span>
                      </td>
                      <td>{supplier.taxId || 'Not set'}</td>
                      <td>{formatCurrency(supplier.balance)}</td>
                      <td>
                        <span className={`status-pill status-${supplier.status}`}>
                          {formatLabel(supplier.status)}
                        </span>
                      </td>
                      <td>{formatDate(supplier.updatedAt)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="table-action"
                            onClick={() => onOpenSupplier(supplier)}
                            type="button"
                          >
                            View
                          </button>
                          <button
                            className="table-action"
                            onClick={() => openEditForm(supplier)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="table-action danger-action"
                            disabled={deletingId === supplier.id}
                            onClick={() => handleDelete(supplier)}
                            type="button"
                          >
                            {deletingId === supplier.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {visibleSuppliers.length === 0 ? (
              <div className="table-message">No suppliers match your filters.</div>
            ) : null}

            <div className="pagination" aria-label="Supplier list pagination">
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
