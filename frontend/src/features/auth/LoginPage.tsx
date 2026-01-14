import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm): Promise<void> => {
    try {
      setError(null);
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl font-semibold text-stone-900 mb-2">
          Welcome back
        </h1>
        <p className="text-stone-500 text-base">
          Sign in to continue your work
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 flex items-center gap-3 animate-fade-in">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className={`auth-input-warm w-full ${errors.email ? 'border-red-300 focus:border-red-500 focus:shadow-red-500/10' : ''}`}
            placeholder="you@company.com"
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-2">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-stone-700">
              Password
            </label>
            <button type="button" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
              Forgot?
            </button>
          </div>
          <input
            id="password"
            type="password"
            {...register('password')}
            className={`auth-input-warm w-full ${errors.password ? 'border-red-300 focus:border-red-500 focus:shadow-red-500/10' : ''}`}
            placeholder="Your password"
          />
          {errors.password && (
            <p className="text-sm text-red-600 mt-2">{errors.password.message}</p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-btn-primary w-full"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>

      {/* Sign Up Link */}
      <p className="mt-8 text-center text-stone-500">
        New here?{' '}
        <Link to="/register" className="font-medium text-stone-900 hover:underline underline-offset-4 transition-colors">
          Create an account
        </Link>
      </p>
    </div>
  );
}
