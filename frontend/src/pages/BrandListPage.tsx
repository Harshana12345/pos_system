import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
  type BrandPayload,
  type CatalogOption,
} from '@/services/catalogService';

type BrandListPageProps = {
  accessToken: string;
  userName?: string;
};

type BrandFormValues = {
  name: string;
  description: string;
  status: string;
};

const PAGE_SIZE = 8;
const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];
const EMPTY_FORM_VALUES: BrandFormValues = {
  name: '',
  description: '',
  status: 'active',
};

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

function getSearchText(brand: CatalogOption) {
  return [brand.id, brand.name, brand.description, brand.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getFormValues(brand: CatalogOption): BrandFormValues {
  return {
    name: brand.name,
    description: brand.description ?? '',
    status: brand.status ?? 'active',
  };
}

export function BrandListPage({ accessToken, userName }: BrandListPageProps) {
  const [brands, setBrands] = useState<CatalogOption[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingBrand, setEditingBrand] = useState<CatalogOption | null>(null);
  const [formValues, setFormValues] = useState<BrandFormValues>(EMPTY_FORM_VALUES);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBrands() {
      setIsLoading(true);
      setError('');

      try {
        const response = await listBrands(accessToken);

        if (isMounted) {
          setBrands(response.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load brands. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBrands();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredBrands = useMemo(
    () =>
      brands.filter(
        (brand) => !normalizedQuery || getSearchText(brand).includes(normalizedQuery),
      ),
    [brands, normalizedQuery],
  );
  const pageCount = Math.max(1, Math.ceil(filteredBrands.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleBrands = filteredBrands.slice(pageStart, pageStart + PAGE_SIZE);
  const resultStart = filteredBrands.length === 0 ? 0 : pageStart + 1;
  const resultEnd = Math.min(pageStart + PAGE_SIZE, filteredBrands.length);
  const activeCount = brands.filter((brand) => brand.status === 'active').length;

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  function openCreateForm() {
    setEditingBrand(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function openEditForm(brand: CatalogOption) {
    setEditingBrand(brand);
    setFormValues(getFormValues(brand));
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingBrand(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(false);
  }

  function updateFormValue(field: keyof BrandFormValues, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function buildPayload(): BrandPayload | null {
    const name = formValues.name.trim();

    if (!name) {
      setFormError('Brand name is required.');
      return null;
    }

    return {
      name,
      description: formValues.description.trim() || null,
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
      const response = editingBrand
        ? await updateBrand(accessToken, editingBrand.id, payload)
        : await createBrand(accessToken, payload);

      setBrands((currentBrands) => {
        const exists = currentBrands.some((brand) => brand.id === response.data.id);
        const nextBrands = exists
          ? currentBrands.map((brand) => (brand.id === response.data.id ? response.data : brand))
          : [...currentBrands, response.data];

        return nextBrands.sort((first, second) => first.id - second.id);
      });
      setEditingBrand(response.data);
      setFormValues(getFormValues(response.data));
      setFormSuccess(editingBrand ? 'Brand updated.' : 'Brand created.');
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFormError(saveError.message);
      } else {
        setFormError('Unable to save brand. Check your connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(brand: CatalogOption) {
    const confirmed = window.confirm(
      `Delete ${brand.name}? Products using it may block this action.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(brand.id);
    setError('');

    try {
      await deleteBrand(accessToken, brand.id);
      setBrands((currentBrands) =>
        currentBrands.filter((currentBrand) => currentBrand.id !== brand.id),
      );

      if (editingBrand?.id === brand.id) {
        closeForm();
      }
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message);
      } else {
        setError('Unable to delete brand. Check your connection and try again.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Brand Management</h1>
          <p className="summary">
            {userName
              ? `Welcome back, ${userName}. Maintain product makers, labels, and catalog availability.`
              : 'Maintain product makers, labels, and catalog availability.'}
          </p>
        </div>
        <div className="product-stats">
          <div className="employee-stat" aria-label={`${brands.length} total brands`}>
            <span>{brands.length}</span>
            <p>Total brands</p>
          </div>
          <div className="employee-stat" aria-label={`${activeCount} active brands`}>
            <span>{activeCount}</span>
            <p>Active brands</p>
          </div>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="brand-form-title">
        <div className="form-panel-header">
          <div>
            <h2 id="brand-form-title">
              {isFormOpen ? (editingBrand ? 'Edit Brand' : 'Create Brand') : 'Manage Brand'}
            </h2>
            <p>
              {isFormOpen
                ? 'Set the brand name, description, and active status.'
                : 'Create a brand or edit an existing brand from the directory.'}
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
              New Brand
            </button>
          )}
        </div>

        {isFormOpen ? (
          <form className="catalog-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="brand-name">
              Name
              <input
                id="brand-name"
                onChange={(event) => updateFormValue('name', event.target.value)}
                required
                type="text"
                value={formValues.name}
              />
            </label>

            <label className="field" htmlFor="brand-status">
              Status
              <select
                id="brand-status"
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

            <label className="field catalog-description" htmlFor="brand-description">
              Description
              <textarea
                id="brand-description"
                onChange={(event) => updateFormValue('description', event.target.value)}
                rows={3}
                value={formValues.description}
              />
            </label>

            {formError ? (
              <div className="form-alert catalog-form-wide" role="alert">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="form-alert form-alert-success catalog-form-wide" role="status">
                {formSuccess}
              </div>
            ) : null}

            <div className="form-actions catalog-form-wide">
              <button className="primary-action" disabled={isSaving} type="submit">
                {isSaving ? 'Saving...' : editingBrand ? 'Save Changes' : 'Create Brand'}
              </button>
              {editingBrand ? (
                <button className="secondary-action" onClick={openCreateForm} type="button">
                  Create New
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className="table-panel" aria-labelledby="brand-table-title">
        <div className="table-toolbar">
          <div>
            <h2 id="brand-table-title">Brand Directory</h2>
            <p>
              Showing {resultStart}-{resultEnd} of {filteredBrands.length}
            </p>
          </div>

          <label className="search-field" htmlFor="brand-search">
            <span>Search brands</span>
            <input
              id="brand-search"
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Name, description, status"
              type="search"
              value={query}
            />
          </label>
        </div>

        {error ? (
          <div className="table-message table-message-error" role="alert">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="table-message" role="status">
            Loading brands...
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="table-wrap">
              <table className="data-table catalog-table">
                <thead>
                  <tr>
                    <th scope="col">Brand</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBrands.map((brand) => (
                    <tr key={brand.id}>
                      <td>
                        <strong>{brand.name}</strong>
                        <span className="employee-email">
                          {brand.description || 'No description'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill status-${brand.status ?? 'active'}`}>
                          {formatLabel(brand.status ?? 'active')}
                        </span>
                      </td>
                      <td>
                        {brand.updatedAt
                          ? new Date(brand.updatedAt).toLocaleDateString()
                          : 'Not set'}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="table-action"
                            onClick={() => openEditForm(brand)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="table-action danger-action"
                            disabled={deletingId === brand.id}
                            onClick={() => handleDelete(brand)}
                            type="button"
                          >
                            {deletingId === brand.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {visibleBrands.length === 0 ? (
              <div className="table-message">No brands match your search.</div>
            ) : null}

            <div className="pagination" aria-label="Brand list pagination">
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
