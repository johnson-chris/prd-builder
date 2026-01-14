import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/authStore';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm): Promise<void> => {
    try {
      setError(null);
      await registerUser(data.email, data.password, data.name);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl font-semibold text-stone-900 mb-2">
          Create account
        </h1>
        <p className="text-stone-500 text-base">
          Start building better PRDs today
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-2">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className={`auth-input-warm w-full ${errors.name ? 'border-red-300 focus:border-red-500 focus:shadow-red-500/10' : ''}`}
            placeholder="John Doe"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-2">{errors.name.message}</p>
          )}
        </div>

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
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className={`auth-input-warm w-full ${errors.password ? 'border-red-300 focus:border-red-500 focus:shadow-red-500/10' : ''}`}
            placeholder="Min 12 characters"
          />
          {errors.password && (
            <p className="text-sm text-red-600 mt-2">{errors.password.message}</p>
          )}
          <p className="text-xs text-stone-400 mt-2">
            Include uppercase, lowercase, number, and special character
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700 mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className={`auth-input-warm w-full ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:shadow-red-500/10' : ''}`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600 mt-2">{errors.confirmPassword.message}</p>
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
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </div>
      </form>

      {/* Sign In Link */}
      <p className="mt-8 text-center text-stone-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-stone-900 hover:underline underline-offset-4 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
