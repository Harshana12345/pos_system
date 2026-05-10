import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import {
  createEmployee,
  listEmployees,
  updateEmployee,
  type Employee,
  type EmployeePayload,
} from '@/services/employeeService';

type EmployeeListPageProps = {
  accessToken: string;
  userBranchId?: number;
  userName?: string;
};

const PAGE_SIZE = 8;
const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];
const SEEDED_ROLE_OPTIONS = [
  { id: 1, name: 'admin' },
  { id: 2, name: 'manager' },
  { id: 3, name: 'cashier' },
  { id: 4, name: 'inventory_manager' },
];
const SEEDED_BRANCH_OPTIONS = [{ id: 1, name: 'Default Branch' }];

type SelectOption = {
  id: number;
  name: string;
};

type EmployeeFormValues = {
  name: string;
  email: string;
  password: string;
  roleId: string;
  branchId: string;
  salary: string;
  shift: string;
  status: string;
};

const EMPTY_FORM_VALUES: EmployeeFormValues = {
  name: '',
  email: '',
  password: '',
  roleId: '',
  branchId: '',
  salary: '',
  shift: '',
  status: 'active',
};

function formatCurrency(value: Employee['salary']) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
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

function getAttendanceLabel(employee: Employee) {
  return formatLabel(employee.attendance?.currentStatus ?? 'not_recorded');
}

function getSearchText(employee: Employee) {
  return [
    employee.id,
    employee.user.name,
    employee.user.email,
    employee.role.name,
    employee.branch.name,
    employee.shift,
    employee.status,
    employee.attendance?.currentStatus,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function uniqueOptions(options: SelectOption[]) {
  const optionMap = new Map<number, SelectOption>();

  options.forEach((option) => {
    if (!optionMap.has(option.id)) {
      optionMap.set(option.id, option);
    }
  });

  return Array.from(optionMap.values()).sort((first, second) =>
    first.name.localeCompare(second.name),
  );
}

function getFormValues(employee: Employee): EmployeeFormValues {
  return {
    name: employee.user.name,
    email: employee.user.email,
    password: '',
    roleId: String(employee.roleId),
    branchId: String(employee.branchId),
    salary: String(employee.salary ?? ''),
    shift: employee.shift ?? '',
    status: employee.status,
  };
}

export function EmployeeListPage({ accessToken, userBranchId, userName }: EmployeeListPageProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formValues, setFormValues] = useState<EmployeeFormValues>(EMPTY_FORM_VALUES);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadEmployees() {
      setIsLoading(true);
      setError('');

      try {
        const response = await listEmployees(accessToken);

        if (isMounted) {
          setEmployees(response.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load employees. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEmployees();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEmployees = useMemo(() => {
    if (!normalizedQuery) {
      return employees;
    }

    return employees.filter((employee) => getSearchText(employee).includes(normalizedQuery));
  }, [employees, normalizedQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleEmployees = filteredEmployees.slice(pageStart, pageStart + PAGE_SIZE);
  const resultStart = filteredEmployees.length === 0 ? 0 : pageStart + 1;
  const resultEnd = Math.min(pageStart + PAGE_SIZE, filteredEmployees.length);

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  const roleOptions = useMemo(
    () => uniqueOptions([...SEEDED_ROLE_OPTIONS, ...employees.map((employee) => employee.role)]),
    [employees],
  );
  const branchOptions = useMemo(
    () => {
      const fallbackBranchOptions = userBranchId
        ? [
            {
              id: userBranchId,
              name: userBranchId === 1 ? 'Default Branch' : `Branch ${userBranchId}`,
            },
          ]
        : SEEDED_BRANCH_OPTIONS;

      return uniqueOptions([
        ...fallbackBranchOptions,
        ...employees.map((employee) => employee.branch),
      ]);
    },
    [employees, userBranchId],
  );

  function openCreateForm() {
    setEditingEmployee(null);
    setFormValues({
      ...EMPTY_FORM_VALUES,
      branchId: branchOptions.length === 1 ? String(branchOptions[0].id) : '',
      roleId: roleOptions.length === 1 ? String(roleOptions[0].id) : '',
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function openEditForm(employee: Employee) {
    setEditingEmployee(employee);
    setFormValues(getFormValues(employee));
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingEmployee(null);
    setFormValues(EMPTY_FORM_VALUES);
    setFormError('');
    setIsFormOpen(false);
  }

  function updateFormValue(field: keyof EmployeeFormValues, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function buildPayload(): EmployeePayload | null {
    const name = formValues.name.trim();
    const email = formValues.email.trim();
    const roleId = Number(formValues.roleId);
    const branchId = Number(formValues.branchId);
    const salary = formValues.salary.trim() === '' ? 0 : Number(formValues.salary);

    if (!name || !email || !Number.isInteger(roleId) || !Number.isInteger(branchId)) {
      setFormError('Name, email, role, and branch are required.');
      return null;
    }

    if (!editingEmployee && formValues.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return null;
    }

    if (!Number.isFinite(salary) || salary < 0) {
      setFormError('Salary must be a non-negative number.');
      return null;
    }

    return {
      attendance: editingEmployee?.attendance ?? {},
      branchId,
      email,
      name,
      roleId,
      salary,
      shift: formValues.shift.trim() || null,
      status: formValues.status,
      ...(editingEmployee ? {} : { password: formValues.password }),
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
      const response = editingEmployee
        ? await updateEmployee(accessToken, editingEmployee.id, payload)
        : await createEmployee(accessToken, payload);

      setEmployees((currentEmployees) => {
        if (editingEmployee) {
          return currentEmployees.map((employee) =>
            employee.id === response.data.id ? response.data : employee,
          );
        }

        return [...currentEmployees, response.data].sort((first, second) => first.id - second.id);
      });
      setFormSuccess(editingEmployee ? 'Employee updated.' : 'Employee created.');
      setEditingEmployee(response.data);
      setFormValues(getFormValues(response.data));
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFormError(saveError.message);
      } else {
        setFormError('Unable to save employee. Check your connection and try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Employees</p>
          <h1>Employee List</h1>
          <p className="summary">
            {userName
              ? `Welcome back, ${userName}. Review staff assignments, shifts, and attendance.`
              : 'Review staff assignments, shifts, and attendance.'}
          </p>
        </div>
        <div className="employee-stat" aria-label={`${employees.length} total employees`}>
          <span>{employees.length}</span>
          <p>Total employees</p>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="employee-form-title">
        <div className="form-panel-header">
          <div>
            <h2 id="employee-form-title">
              {isFormOpen
                ? editingEmployee
                  ? 'Edit Employee'
                  : 'Create Employee'
                : 'Manage Employee'}
            </h2>
            <p>
              {isFormOpen
                ? 'Set profile details, assignment, compensation, and account status.'
                : 'Create a staff account or edit an existing employee from the directory.'}
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
              New Employee
            </button>
          )}
        </div>

        {isFormOpen ? (
          <form className="employee-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="employee-name">
              Name
              <input
                id="employee-name"
                onChange={(event) => updateFormValue('name', event.target.value)}
                required
                type="text"
                value={formValues.name}
              />
            </label>

            <label className="field" htmlFor="employee-email">
              Email
              <input
                id="employee-email"
                onChange={(event) => updateFormValue('email', event.target.value)}
                required
                type="email"
                value={formValues.email}
              />
            </label>

            {!editingEmployee ? (
              <label className="field" htmlFor="employee-password">
                Password
                <input
                  id="employee-password"
                  minLength={8}
                  onChange={(event) => updateFormValue('password', event.target.value)}
                  required
                  type="password"
                  value={formValues.password}
                />
              </label>
            ) : null}

            <label className="field" htmlFor="employee-role">
              Role
              <select
                id="employee-role"
                onChange={(event) => updateFormValue('roleId', event.target.value)}
                required
                value={formValues.roleId}
              >
                <option value="">Select role</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {formatLabel(role.name)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="employee-branch">
              Branch
              <select
                id="employee-branch"
                onChange={(event) => updateFormValue('branchId', event.target.value)}
                required
                value={formValues.branchId}
              >
                <option value="">Select branch</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="employee-status">
              Status
              <select
                id="employee-status"
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

            <label className="field" htmlFor="employee-salary">
              Salary
              <input
                id="employee-salary"
                min="0"
                onChange={(event) => updateFormValue('salary', event.target.value)}
                step="0.01"
                type="number"
                value={formValues.salary}
              />
            </label>

            <label className="field" htmlFor="employee-shift">
              Shift
              <input
                id="employee-shift"
                onChange={(event) => updateFormValue('shift', event.target.value)}
                placeholder="Morning, evening, weekend"
                type="text"
                value={formValues.shift}
              />
            </label>

            {formError ? (
              <div className="form-alert employee-form-alert" role="alert">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="form-alert form-alert-success employee-form-alert" role="status">
                {formSuccess}
              </div>
            ) : null}

            <div className="form-actions">
              <button className="primary-action" disabled={isSaving} type="submit">
                {isSaving ? 'Saving...' : editingEmployee ? 'Save Changes' : 'Create Employee'}
              </button>
              {editingEmployee ? (
                <button className="secondary-action" onClick={openCreateForm} type="button">
                  Create New
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      <section className="table-panel" aria-labelledby="employee-table-title">
        <div className="table-toolbar">
          <div>
            <h2 id="employee-table-title">Staff Directory</h2>
            <p>
              Showing {resultStart}-{resultEnd} of {filteredEmployees.length}
            </p>
          </div>

          <label className="search-field" htmlFor="employee-search">
            <span>Search employees</span>
            <input
              id="employee-search"
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Name, email, role, branch"
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
            Loading employees...
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Role</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Shift</th>
                    <th scope="col">Attendance</th>
                    <th scope="col">Salary</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <strong>{employee.user.name}</strong>
                        <span className="employee-email">{employee.user.email}</span>
                      </td>
                      <td>{formatLabel(employee.role.name)}</td>
                      <td>{employee.branch.name}</td>
                      <td>{formatLabel(employee.shift)}</td>
                      <td>{getAttendanceLabel(employee)}</td>
                      <td>{formatCurrency(employee.salary)}</td>
                      <td>
                        <span className={`status-pill status-${employee.status}`}>
                          {formatLabel(employee.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-action"
                          onClick={() => openEditForm(employee)}
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

            {visibleEmployees.length === 0 ? (
              <div className="table-message">No employees match your search.</div>
            ) : null}

            <div className="pagination" aria-label="Employee list pagination">
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
