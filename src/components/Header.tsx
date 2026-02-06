import { LogOut, AlertCircle, BarChart3, Shield, PlusCircle, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../lib/database.types';
import { useI18n, LanguageSelector } from '../contexts/I18nContext';

interface HeaderProps {
  activeView: 'report' | 'dashboard';
  setActiveView: (view: 'report' | 'dashboard') => void;
}

const ROLE_CONFIG: Record<UserRole, { label: string; bgClass: string; textClass: string }> = {
  citizen: { label: 'Citizen', bgClass: 'bg-gray-100', textClass: 'text-gray-700' },
  ward_officer: { label: 'Ward Officer', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  dept_admin: { label: 'Dept Admin', bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
  city_admin: { label: 'City Admin', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
};

export default function Header({ activeView, setActiveView }: HeaderProps) {
  const { signOut, user, role, isOfficer } = useAuth();
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleConfig = ROLE_CONFIG[role];

  return (
    <header className="glass-dark sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow-sm border border-gray-200">
              <div className="text-blue-700 font-semibold text-sm">Gov</div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-white">CivicSense</h1>
              <p className="text-xs text-white/80 -mt-0.5">Government Services Portal</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-3">
            <NavButton
              active={activeView === 'report'}
              onClick={() => setActiveView('report')}
              icon={<PlusCircle className="w-4 h-4" />}
              label={t('reportIssue')}
            />
            <NavButton
              active={activeView === 'dashboard'}
              onClick={() => setActiveView('dashboard')}
              icon={<BarChart3 className="w-4 h-4" />}
              label={isOfficer ? t('dashboard') : t('myReports')}
            />
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-white/5 border border-white/5 text-white`}> 
              <Shield className="w-3 h-3" />
              {roleConfig.label}
            </div>

            {/* Language Selector */}
            <div className="hidden md:block">
              <LanguageSelector />
            </div>

            {/* User Info */}
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                {user?.email?.split('@')[0]}
              </span>
              <span className="text-xs text-gray-400">
                {user?.email?.split('@')[1]}
              </span>
            </div>

            {/* Sign Out */}
            <button
              onClick={() => signOut()}
              className="btn btn-ghost text-gray-600 hover:text-red-600 hover:bg-red-50"
              title={t('signOut')}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('signOut')}</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-100 animate-slideDown">
            <div className="flex flex-col gap-1">
              <MobileNavButton
                active={activeView === 'report'}
                onClick={() => {
                  setActiveView('report');
                  setMobileMenuOpen(false);
                }}
                icon={<PlusCircle className="w-4 h-4" />}
                label="Report Issue"
              />
              <MobileNavButton
                active={activeView === 'dashboard'}
                onClick={() => {
                  setActiveView('dashboard');
                  setMobileMenuOpen(false);
                }}
                icon={<BarChart3 className="w-4 h-4" />}
                label={isOfficer ? 'Dashboard' : 'My Reports'}
              />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 px-2">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${roleConfig.bgClass} ${roleConfig.textClass}`}>
                <Shield className="w-3 h-3" />
                {roleConfig.label}
              </div>
              <span className="text-xs text-gray-500 truncate">{user?.email}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function NavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${active
          ? 'bg-gradient-primary text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-50'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
