import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { AlertCircle, Lock, ArrowRight, Sparkles, User } from 'lucide-react';

export default function Auth() {

  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use role string as the username for mock auth (mockSupabase expects 'admin' or 'user')
      await signIn(role, password);
    } catch (err) {
      // The auth library / mock may throw plain objects (not instanceof Error).
      // Normalize and show a helpful message when available.
      const message = err instanceof Error ? err.message : (err as any)?.message || JSON.stringify(err) || 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-scaleIn">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl shadow-lg mb-4 transform hover:scale-105 transition-transform">
            <AlertCircle className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">{t('appName')}</h1>
          <p className="text-gray-500 mt-2 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            {t('tagline')}
            <Sparkles className="w-4 h-4 text-cyan-500" />
          </p>
        </div>

        {/* Card */}
        <div className="glass card-elevated p-8 animate-slideUp">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-gray-800">{t('signIn')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('tagline')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sign in as</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setRole('user')} className={`px-3 py-2 rounded-lg border ${role === 'user' ? 'bg-white shadow-sm border-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  User
                </button>
                <button type="button" onClick={() => setRole('admin')} className={`px-3 py-2 rounded-lg border ${role === 'admin' ? 'bg-white shadow-sm border-slate-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  Admin
                </button>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                  placeholder="••••••••"
                  className="input pl-11"
                />
              </div>

            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100 animate-slideDown">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-base group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {t('signIn')} ({role === 'admin' ? 'Admin' : 'User'})
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer - Forgot Password */}
          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              {t('forgotPassword')}
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-center text-xs text-gray-400 mt-6">
          {t('termsAgreement')}
        </p>
      </div>
    </div>
  );
}
