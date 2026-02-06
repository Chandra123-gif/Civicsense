import { useI18n, LANGUAGES } from '../contexts/I18nContext';
import { Globe } from 'lucide-react';

export default function LanguageToggleSidebar() {
  const { language, setLanguage } = useI18n();

  return (
    <aside className="fixed right-4 top-1/3 z-50">
      <div className="flex flex-col items-center space-y-2 bg-white/80 backdrop-blur rounded-lg p-2 shadow-lg border border-gray-100">
        <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center">
          <Globe className="w-4 h-4" />
        </div>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-3 py-1 rounded text-sm ${language === lang.code ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            title={lang.name}
          >
            {lang.nativeName}
          </button>
        ))}
      </div>
    </aside>
  );
}
