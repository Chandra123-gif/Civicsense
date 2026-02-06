import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Auth from './components/Auth';
import Header from './components/Header';
import ReportForm from './components/ReportForm';
import Dashboard from './components/Dashboard';
// Language selector moved into Header
import { AlertCircle } from 'lucide-react';

function AppContent() {
  const { user, loading, role } = useAuth();
  const { t } = useI18n();
  const [activeView, setActiveView] = useState<'report' | 'dashboard'>('report');

  // Redirect based on role
  useEffect(() => {
    if (user && role === 'city_admin') {
      setActiveView('dashboard');
    }
  }, [user, role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-primary rounded-2xl blur opacity-30 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-gray-600 font-medium">{t('loadingApp')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <Header activeView={activeView} setActiveView={setActiveView} />

      <main className="flex-1 py-6">
        {activeView === 'report' ? <ReportForm /> : <Dashboard />}
      </main>

      {/* Footer */}
      <footer className="glass border-t border-white/30 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700">CivicSense AI</h4>
                <p className="text-xs text-gray-400">Empowering citizens for a smarter city</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-gray-400">
              <a href="#" className="hover:text-gray-600 transition">Privacy Policy</a>
              <a href="#" className="hover:text-gray-600 transition">Terms of Service</a>
              <a href="#" className="hover:text-gray-600 transition">Help Center</a>
            </div>

            <p className="text-xs text-gray-400">
              © 2026 CivicSense. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </I18nProvider>
  );
}

export default App;
