import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CatalogOption,
  type CategoryPayload,
} from '@/services/catalogService';

type CategoryListPageProps = {
  accessToken: string;
  userName?: string;
};

type CategoryFormValues = {
  name: string;
  parentId: string;
  description: string;
  status: string;
};

const PAGE_SIZE = 8;
const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];
const EMPTY_FORM_VALUES: CategoryFormValues = {
  name: '',
  parentId: '',
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

function getSearchText(category: CatalogOption, parentName: string) {
  return [category.id, category.name, parentName, category.description, category.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getFormValues(category: CatalogOption): CategoryFormValues {
  return {
    name: category.name,
    parentId: category.parentId ? String(category.parentId) : '',
    description: category.description ?? '',
    status: category.status ?? 'active',
  };
}

export function CategoryListPage({ accessToken, userName }: CategoryListPageProps) {
  const [categories, setCategories] = useState<CatalogOption[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<CatalogOption | null>(null);
  const [formValues, setFormValues] = useState<CategoryFormValues>(EMPTY_FORM_VALUES);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setIsLoading(true);
      setError('');

      try {
        const response = await listCategories(accessToken);

        if (isMounted) {
          setCategories(response.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load categories. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const parentOptions = useMemo(
    () => categories.filter((category) => category.id !== editingCategory?.id),
    [categories, editingCategory],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCategories = useMemo(
    () =>
      categories.filter((category) => {
        const parentName = category.parentId ? categoryMap.get(category.parentId) ?? '' : '';

        return !normalizedQuery || getSearchText(category, parentName).includes(normalizedQuery);
      }),
    [categories, categoryMap, normalizedQuery],
  );
  const pageCount = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleCategories = filteredCategories.slice(pageStart, pageStart + PAGE_SIZE);
  const resultStart = filteredCategories.length === 0 ? 0 : pageStart + 1;
  const resultEnd = Math.min(pageStart + PAGE_SIZE, filteredCategories.length);
  const activeCount = categories.filter((category) => category.status === 'active').length;

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  function openCreateForm() {
    setEditingCategory(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function openEditForm(category: CatalogOption) {
    setEditingCategory(category);
    setFormValues(getFormValues(category));
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingCategory(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(false);
  }

  function updateFormValue(field: keyof CategoryFormValues, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function buildPayload(): CategoryPayload | null {
    const name = formValues.name.trim();
    const parentId = formValues.parentId ? Number(formValues.parentId) : null;

    if (!name) {
      setFormError('Category name is required.');
      return null;
    }

    if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
      setFormError('Parent category is invalid.');
      return null;
    }

    if (editingCategory && parentId === editingCategory.id) {
      setFormError('Category cannot be its own parent.');
      return null;
    }

    return {
      name,
      parentId,
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
      const response = editingCategory
        ? await updateCategory(accessToken, editingCategory.id, payload)
        : await createCategory(accessToken, payload);

      setCategories((currentCategories) => {
        const exists = currentCategories.some((category) => category.id === response.data.id);
        const nextCategories = exists
          ? currentCategories.map((category) =>
              category.id === response.data.id ? response.data : category,
            )
          : [...currentCategories, response.data];

        return nextCategories.sort((first, second) => first.id - second.id);
      });
      setEditingCategory(response.data);
      setFormValues(getFormValues(response.data));
      setFormSuccess(editingCategory ? 'Category updated.' : 'Category created.');
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFormError(saveError.message);
      } else {
        setFormError('Unable to save category. Check your connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category: CatalogOption) {
    const confirmed = window.confirm(
      `Delete ${category.name}? Products using it may block this action.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(category.id);
    setError('');

    try {
      await deleteCategory(accessToken, category.id);
      setCategories((currentCategories) =>
        currentCategories.filter((currentCategory) => currentCategory.id !== category.id),
      );

      if (editingCategory?.id === category.id) {
        closeForm();
      }
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message);
      } else {
        setError('Unable to delete category. Check your connection and try again.');
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
          <h1>Category Management</h1>
          <p className="summary">
            {userName
              ? `Welcome back, ${userName}. Maintain product groups, hierarchy, and catalog availability.`
              : 'Maintain product groups, hierarchy, and catalog availability.'}
          </p>
        </div>
        <div className="product-stats">
          <div className="employee-stat" aria-label={`${categories.length} total categories`}>
            <span>{categories.length}</span>
            <p>Total categories</p>
          </div>
          <div className="employee-stat" aria-label={`${activeCount} active categories`}>
            <span>{activeCount}</span>
            <p>Active categories</p>
          </div>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="category-form-title">
        <div className="form-panel-header">
          <div>
            <h2 id="category-form-title">
              {isFormOpen
                ? editingCategory
                  ? 'Edit Category'
                  : 'Create Category'
                : 'Manage Category'}
            </h2>
            <p>
              {isFormOpen
                ? 'Set the category name, optional parent, description, and status.'
                : 'Create a catalog group or edit an existing category from the table.'}
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
              New Category
            </button>
          )}
        </div>

        {isFormOpen ? (
          <form className="catalog-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="category-name">
              Name
              <input
                id="category-name"
                onChange={(event) => updateFormValue('name', event.target.value)}
                required
                type="text"
                value={formValues.name}
              />
            </label>

            <label className="field" htmlFor="category-parent">
              Parent
              <select
                id="category-parent"
                onChange={(event) => updateFormValue('parentId', event.target.value)}
                value={formValues.parentId}
              >
                <option value="">No parent</option>
                {parentOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="category-status">
              Status
              <select
                id="category-status"
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

            <label className="field catalog-description" htmlFor="category-description">
              Description
              <textarea
                id="category-description"
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
                {isSaving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
              </button>
              {editingCategory ? (
                <button className="secondary-action" onClick={openCreateForm} type="button">
                  Create New
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className="table-panel" aria-labelledby="category-table-title">
        <div className="table-toolbar">
          <div>
            <h2 id="category-table-title">Category Directory</h2>
            <p>
              Showing {resultStart}-{resultEnd} of {filteredCategories.length}
            </p>
          </div>

          <label className="search-field" htmlFor="category-search">
            <span>Search categories</span>
            <input
              id="category-search"
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Name, parent, description"
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
            Loading categories...
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="table-wrap">
              <table className="data-table catalog-table">
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Parent</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCategories.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <strong>{category.name}</strong>
                        <span className="employee-email">
                          {category.description || 'No description'}
                        </span>
                      </td>
                      <td>
                        {category.parentId
                          ? categoryMap.get(category.parentId) ?? `Category ${category.parentId}`
                          : 'Top level'}
                      </td>
                      <td>
                        <span className={`status-pill status-${category.status ?? 'active'}`}>
                          {formatLabel(category.status ?? 'active')}
                        </span>
                      </td>
                      <td>
                        {category.updatedAt
                          ? new Date(category.updatedAt).toLocaleDateString()
                          : 'Not set'}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="table-action"
                            onClick={() => openEditForm(category)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="table-action danger-action"
                            disabled={deletingId === category.id}
                            onClick={() => handleDelete(category)}
                            type="button"
                          >
                            {deletingId === category.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {visibleCategories.length === 0 ? (
              <div className="table-message">No categories match your search.</div>
            ) : null}

            <div className="pagination" aria-label="Category list pagination">
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
