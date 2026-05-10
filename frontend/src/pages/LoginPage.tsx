import { useState, type FormEvent } from 'react';
import { ApiError } from '@/services/apiClient';
import { login, type LoginSession } from '@/services/authService';

type LoginPageProps = {
  onLogin: (session: LoginSession) => void;
};

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginForm(values: LoginFormValues) {
  const errors: LoginFormErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  }

  return errors;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasFieldErrors = Object.keys(errors).length > 0;

  function updateField(field: keyof LoginFormValues, value: string) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateLoginForm(values);
    setErrors(validationErrors);
    setFormError('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      onLogin(response.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Unable to sign in. Check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-copy">
          <p className="eyebrow">POS System</p>
          <h1 id="login-title">Sign in to your register</h1>
          <p className="summary">
            Access sales, products, customers, and reports from a secure staff account.
          </p>
        </div>

        <form className="login-form" noValidate onSubmit={handleSubmit}>
          {formError ? (
            <div className="form-alert" role="alert">
              {formError}
            </div>
          ) : null}

          <label className="field" htmlFor="email">
            <span>Email</span>
            <input
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              id="email"
              name="email"
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="name@company.com"
              type="email"
              value={values.email}
            />
            {errors.email ? (
              <span className="field-error" id="email-error">
                {errors.email}
              </span>
            ) : null}
          </label>

          <label className="field" htmlFor="password">
            <span>Password</span>
            <input
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={Boolean(errors.password)}
              autoComplete="current-password"
              id="password"
              name="password"
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Enter your password"
              type="password"
              value={values.password}
            />
            {errors.password ? (
              <span className="field-error" id="password-error">
                {errors.password}
              </span>
            ) : null}
          </label>

          <button className="primary-action" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>

          {hasFieldErrors ? (
            <p className="form-hint" role="status">
              Review the highlighted fields before continuing.
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
