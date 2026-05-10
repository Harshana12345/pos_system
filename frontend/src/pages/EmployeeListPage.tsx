import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import { listEmployees, type Employee } from '@/services/employeeService';

type EmployeeListPageProps = {
  accessToken: string;
  userName?: string;
};

const PAGE_SIZE = 8;

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

export function EmployeeListPage({ accessToken, userName }: EmployeeListPageProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
