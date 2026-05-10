import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type Customer,
  type CustomerPayload,
} from '@/services/customerService';

type CustomerListPageProps = {
  accessToken: string;
  userName?: string;
};

type CustomerFormValues = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  loyaltyPoints: string;
  creditBalance: string;
  dateOfBirth: string;
  customerGroupId: string;
  notes: string;
  status: string;
};

const PAGE_SIZE = 8;
const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];
const CUSTOMER_SUMMARY =
  'Maintain customer profiles, loyalty points, credit balances, and birthday details.';
const CUSTOMER_FORM_HELP =
  'Set contact details, loyalty values, credit balance, birthday, group, and account status.';
const EMPTY_FORM_VALUES: CustomerFormValues = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  loyaltyPoints: '0',
  creditBalance: '0',
  dateOfBirth: '',
  customerGroupId: '',
  notes: '',
  status: 'active',
};

function formatCurrency(value: Customer['creditBalance']) {
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

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(`${value}T00:00:00`);

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

function getSearchText(customer: Customer) {
  return [
    customer.id,
    customer.fullName,
    customer.phone,
    customer.email,
    customer.address,
    customer.notes,
    customer.status,
    customer.customerGroupId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getFormValues(customer: Customer): CustomerFormValues {
  return {
    fullName: customer.fullName,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    loyaltyPoints: String(customer.loyaltyPoints ?? 0),
    creditBalance: String(customer.creditBalance ?? 0),
    dateOfBirth: customer.dateOfBirth ?? '',
    customerGroupId: customer.customerGroupId ? String(customer.customerGroupId) : '',
    notes: customer.notes ?? '',
    status: customer.status,
  };
}

export function CustomerListPage({ accessToken, userName }: CustomerListPageProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formValues, setFormValues] = useState<CustomerFormValues>(EMPTY_FORM_VALUES);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCustomers() {
      setIsLoading(true);
      setError('');

      try {
        const response = await listCustomers(accessToken);

        if (isMounted) {
          setCustomers(response.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load customers. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const matchesSearch =
          !normalizedQuery || getSearchText(customer).includes(normalizedQuery);
        const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [customers, normalizedQuery, statusFilter],
  );
  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleCustomers = filteredCustomers.slice(pageStart, pageStart + PAGE_SIZE);
  const resultStart = filteredCustomers.length === 0 ? 0 : pageStart + 1;
  const resultEnd = Math.min(pageStart + PAGE_SIZE, filteredCustomers.length);
  const activeCount = customers.filter((customer) => customer.status === 'active').length;
  const totalLoyaltyPoints = customers.reduce(
    (total, customer) => total + Number(customer.loyaltyPoints || 0),
    0,
  );
  const totalCreditBalance = customers.reduce((total, customer) => {
    const balance = Number(customer.creditBalance);
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
    setEditingCustomer(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function openEditForm(customer: Customer) {
    setEditingCustomer(customer);
    setFormValues(getFormValues(customer));
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingCustomer(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(false);
  }

  function updateFormValue(field: keyof CustomerFormValues, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function buildPayload(): CustomerPayload | null {
    const fullName = formValues.fullName.trim();
    const loyaltyPoints = Number(formValues.loyaltyPoints || 0);
    const creditBalance = Number(formValues.creditBalance || 0);
    const customerGroupId =
      formValues.customerGroupId.trim() === '' ? null : Number(formValues.customerGroupId);

    if (!fullName) {
      setFormError('Customer full name is required.');
      return null;
    }

    if (!Number.isInteger(loyaltyPoints) || loyaltyPoints < 0) {
      setFormError('Loyalty points must be a non-negative whole number.');
      return null;
    }

    if (!Number.isFinite(creditBalance) || creditBalance < 0) {
      setFormError('Credit balance must be a non-negative number.');
      return null;
    }

    if (
      customerGroupId !== null &&
      (!Number.isInteger(customerGroupId) || customerGroupId <= 0)
    ) {
      setFormError('Customer group ID must be a positive whole number.');
      return null;
    }

    return {
      fullName,
      phone: formValues.phone.trim() || null,
      email: formValues.email.trim() || null,
      address: formValues.address.trim() || null,
      loyaltyPoints,
      creditBalance,
      dateOfBirth: formValues.dateOfBirth || null,
      notes: formValues.notes.trim() || null,
      status: formValues.status,
      customerGroupId,
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
      const response = editingCustomer
        ? await updateCustomer(accessToken, editingCustomer.id, payload)
        : await createCustomer(accessToken, payload);

      setCustomers((currentCustomers) => {
        const exists = currentCustomers.some((customer) => customer.id === response.data.id);
        const nextCustomers = exists
          ? currentCustomers.map((customer) =>
              customer.id === response.data.id ? response.data : customer,
            )
          : [...currentCustomers, response.data];

        return nextCustomers.sort((first, second) => first.id - second.id);
      });
      setEditingCustomer(response.data);
      setFormValues(getFormValues(response.data));
      setFormSuccess(editingCustomer ? 'Customer updated.' : 'Customer created.');
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFormError(saveError.message);
      } else {
        setFormError('Unable to save customer. Check your connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(customer: Customer) {
    const confirmed = window.confirm(
      `Delete ${customer.fullName}? Sales history may block this action.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(customer.id);
    setError('');

    try {
      await deleteCustomer(accessToken, customer.id);
      setCustomers((currentCustomers) =>
        currentCustomers.filter((currentCustomer) => currentCustomer.id !== customer.id),
      );

      if (editingCustomer?.id === customer.id) {
        closeForm();
      }
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message);
      } else {
        setError('Unable to delete customer. Check your connection and try again.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Customers</p>
          <h1>Customer Management</h1>
          <p className="summary">
            {userName ? `Welcome back, ${userName}. ${CUSTOMER_SUMMARY}` : CUSTOMER_SUMMARY}
          </p>
        </div>
        <div className="customer-stats" aria-label="Customer summary">
          <div className="employee-stat">
            <span>{customers.length}</span>
            <p>Total customers</p>
          </div>
          <div className="employee-stat">
            <span>{activeCount}</span>
            <p>Active</p>
          </div>
          <div className="employee-stat">
            <span>{totalLoyaltyPoints}</span>
            <p>Loyalty points</p>
          </div>
          <div className="employee-stat">
            <span>{formatCurrency(totalCreditBalance)}</span>
            <p>Credit balance</p>
          </div>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="customer-form-title">
        <div className="form-panel-header">
          <div>
            <h2 id="customer-form-title">
              {isFormOpen
                ? editingCustomer
                  ? 'Edit Customer'
                  : 'Create Customer'
                : 'Manage Customer'}
            </h2>
            <p>
              {isFormOpen
                ? CUSTOMER_FORM_HELP
                : 'Create a customer or edit an existing profile from the directory.'}
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
              New Customer
            </button>
          )}
        </div>

        {isFormOpen ? (
          <form className="customer-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="customer-full-name">
              Full Name
              <input
                id="customer-full-name"
                onChange={(event) => updateFormValue('fullName', event.target.value)}
                required
                type="text"
                value={formValues.fullName}
              />
            </label>

            <label className="field" htmlFor="customer-phone">
              Phone
              <input
                id="customer-phone"
                onChange={(event) => updateFormValue('phone', event.target.value)}
                type="tel"
                value={formValues.phone}
              />
            </label>

            <label className="field" htmlFor="customer-email">
              Email
              <input
                id="customer-email"
                onChange={(event) => updateFormValue('email', event.target.value)}
                type="email"
                value={formValues.email}
              />
            </label>

            <label className="field" htmlFor="customer-loyalty-points">
              Loyalty Points
              <input
                id="customer-loyalty-points"
                min="0"
                onChange={(event) => updateFormValue('loyaltyPoints', event.target.value)}
                step="1"
                type="number"
                value={formValues.loyaltyPoints}
              />
            </label>

            <label className="field" htmlFor="customer-credit-balance">
              Credit Balance
              <input
                id="customer-credit-balance"
                min="0"
                onChange={(event) => updateFormValue('creditBalance', event.target.value)}
                step="0.01"
                type="number"
                value={formValues.creditBalance}
              />
            </label>

            <label className="field" htmlFor="customer-date-of-birth">
              Date of Birth
              <input
                id="customer-date-of-birth"
                onChange={(event) => updateFormValue('dateOfBirth', event.target.value)}
                type="date"
                value={formValues.dateOfBirth}
              />
            </label>

            <label className="field" htmlFor="customer-group-id">
              Customer Group ID
              <input
                id="customer-group-id"
                min="1"
                onChange={(event) => updateFormValue('customerGroupId', event.target.value)}
                step="1"
                type="number"
                value={formValues.customerGroupId}
              />
            </label>

            <label className="field" htmlFor="customer-status">
              Status
              <select
                id="customer-status"
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

            <label className="field customer-form-wide" htmlFor="customer-address">
              Address
              <textarea
                id="customer-address"
                onChange={(event) => updateFormValue('address', event.target.value)}
                rows={3}
                value={formValues.address}
              />
            </label>

            <label className="field customer-form-wide" htmlFor="customer-notes">
              Notes
              <textarea
                id="customer-notes"
                onChange={(event) => updateFormValue('notes', event.target.value)}
                rows={3}
                value={formValues.notes}
              />
            </label>

            {formError ? (
              <div className="form-alert customer-form-wide" role="alert">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="form-alert form-alert-success customer-form-wide" role="status">
                {formSuccess}
              </div>
            ) : null}

            <div className="form-actions customer-form-wide">
              <button className="primary-action" disabled={isSaving} type="submit">
                {isSaving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Create Customer'}
              </button>
              {editingCustomer ? (
                <button className="secondary-action" onClick={openCreateForm} type="button">
                  Create New
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className="table-panel" aria-labelledby="customer-table-title">
        <div className="table-toolbar product-toolbar">
          <div>
            <h2 id="customer-table-title">Customer Directory</h2>
            <p>
              Showing {resultStart}-{resultEnd} of {filteredCustomers.length}
            </p>
          </div>

          <div className="customer-filters" aria-label="Customer filters">
            <label className="search-field" htmlFor="customer-search">
              <span>Search customers</span>
              <input
                id="customer-search"
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Name, phone, email"
                type="search"
                value={query}
              />
            </label>

            <label className="filter-field" htmlFor="customer-status-filter">
              <span>Status</span>
              <select
                id="customer-status-filter"
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
            Loading customers...
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="table-wrap">
              <table className="data-table customer-table">
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Loyalty</th>
                    <th scope="col">Credit</th>
                    <th scope="col">Birthday</th>
                    <th scope="col">Group</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.fullName}</strong>
                        <span className="employee-email">
                          {customer.address || 'No address recorded'}
                        </span>
                      </td>
                      <td>
                        {customer.phone || 'No phone'}
                        <span className="employee-email">{customer.email || 'No email'}</span>
                      </td>
                      <td>{customer.loyaltyPoints}</td>
                      <td>{formatCurrency(customer.creditBalance)}</td>
                      <td>{formatDate(customer.dateOfBirth)}</td>
                      <td>
                        {customer.customerGroupId
                          ? `Group ${customer.customerGroupId}`
                          : 'Not set'}
                      </td>
                      <td>
                        <span className={`status-pill status-${customer.status}`}>
                          {formatLabel(customer.status)}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="table-action"
                            onClick={() => openEditForm(customer)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="table-action danger-action"
                            disabled={deletingId === customer.id}
                            onClick={() => handleDelete(customer)}
                            type="button"
                          >
                            {deletingId === customer.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {visibleCustomers.length === 0 ? (
              <div className="table-message">No customers match your filters.</div>
            ) : null}

            <div className="pagination" aria-label="Customer list pagination">
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
