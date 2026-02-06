import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Supported languages
export type Language = 'en' | 'hi' | 'te';

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
];

// Translation interface
interface Translations {
    // Common
    appName: string;
    tagline: string;
    loading: string;
    submit: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    yes: string;
    no: string;

    // Auth
    signIn: string;
    signUp: string;
    signOut: string;
    email: string;
    password: string;
    forgotPassword: string;
    createAccount: string;
    alreadyHaveAccount: string;

    // Navigation
    reportIssue: string;
    dashboard: string;
    myReports: string;

    // Report Form
    reportCivicIssue: string;
    reportDescription: string;
    issueType: string;
    title: string;
    description: string;
    uploadImage: string;
    location: string;
    getCurrentLocation: string;
    locationCaptured: string;
    submitReport: string;
    reportSuccess: string;

    // Issue Types
    pothole: string;
    garbage: string;
    streetlight: string;
    drainage: string;
    roadDamage: string;
    other: string;

    // Status
    pending: string;
    inProgress: string;
    resolved: string;
    rejected: string;
    reopened: string;

    // Priority
    low: string;
    medium: string;
    high: string;
    critical: string;

    // Dashboard
    totalReports: string;
    overduesSLA: string;
    priorityDistribution: string;
    issuesByType: string;
    allReports: string;
    noReportsFound: string;

    // Feedback
    rateSolution: string;
    satisfied: string;
    notSatisfied: string;
    submitFeedback: string;
    reopenReport: string;

    // Roles
    citizen: string;
    wardOfficer: string;
    deptAdmin: string;
    cityAdmin: string;

    // Misc
    duplicate: string;
    duplicateWarning: string;
    reportAnyway: string;
    viewExisting: string;
    rateLimitReached: string;
    reportsRemaining: string;
    // Municipality / actions
    getDirections: string;
    copyMunicipality: string;
    contactMunicipality: string;
    change: string;
    backToCategories: string;
    termsAgreement: string;
    loadingApp: string;
}

// English translations (default)
const en: Translations = {
    appName: 'CivicSense AI',
    tagline: 'Smart City Management',
    loading: 'Loading...',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    yes: 'Yes',
    no: 'No',

    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',

    reportIssue: 'Report Issue',
    dashboard: 'Dashboard',
    myReports: 'My Reports',

    reportCivicIssue: 'Report a Civic Issue',
    reportDescription: 'Help make your city better by reporting problems',
    issueType: 'Issue Type',
    title: 'Title',
    description: 'Description',
    uploadImage: 'Upload Image',
    location: 'Location',
    getCurrentLocation: 'Get Current Location',
    locationCaptured: 'Location captured',
    submitReport: 'Submit Report',
    reportSuccess: 'Report submitted successfully! Thank you for your contribution.',

    pothole: 'Pothole',
    garbage: 'Garbage Overflow',
    streetlight: 'Streetlight Failure',
    drainage: 'Drainage Issue',
    roadDamage: 'Road Damage',
    other: 'Other',

    pending: 'Pending',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    rejected: 'Rejected',
    reopened: 'Reopened',

    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',

    totalReports: 'Total Reports',
    overduesSLA: 'Overdue SLA',
    priorityDistribution: 'Priority Distribution',
    issuesByType: 'Issues by Type',
    allReports: 'All Reports',
    noReportsFound: 'No reports found',

    rateSolution: 'Rate Resolution',
    satisfied: 'Satisfied',
    notSatisfied: 'Not Satisfied',
    submitFeedback: 'Submit Feedback',
    reopenReport: 'Reopen',

    citizen: 'Citizen',
    wardOfficer: 'Ward Officer',
    deptAdmin: 'Dept Admin',
    cityAdmin: 'City Admin',

    duplicate: 'Duplicate',
    duplicateWarning: 'A similar issue exists nearby',
    reportAnyway: 'Report Anyway',
    viewExisting: 'View Existing Report',
    rateLimitReached: 'Rate Limit Reached',
    reportsRemaining: 'reports remaining today',
    getDirections: 'Get directions',
    copyMunicipality: 'Copy municipality',
    contactMunicipality: 'Contact municipality',
    change: 'Change',
    backToCategories: 'Back to Categories',
    termsAgreement: 'By continuing, you agree to our Terms of Service and Privacy Policy',
    loadingApp: 'Loading CivicSense AI...',
};

// Hindi translations
const hi: Translations = {
    appName: 'CivicSense AI',
    tagline: 'स्मार्ट सिटी प्रबंधन',
    loading: 'लोड हो रहा है...',
    submit: 'जमा करें',
    cancel: 'रद्द करें',
    save: 'सेव करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    close: 'बंद करें',
    yes: 'हां',
    no: 'नहीं',

    signIn: 'साइन इन करें',
    signUp: 'साइन अप करें',
    signOut: 'साइन आउट',
    email: 'ईमेल',
    password: 'पासवर्ड',
    forgotPassword: 'पासवर्ड भूल गए?',
    createAccount: 'खाता बनाएं',
    alreadyHaveAccount: 'पहले से खाता है?',

    reportIssue: 'समस्या रिपोर्ट करें',
    dashboard: 'डैशबोर्ड',
    myReports: 'मेरी रिपोर्ट्स',

    reportCivicIssue: 'नागरिक समस्या की रिपोर्ट करें',
    reportDescription: 'समस्याओं की रिपोर्ट करके अपने शहर को बेहतर बनाने में मदद करें',
    issueType: 'समस्या का प्रकार',
    title: 'शीर्षक',
    description: 'विवरण',
    uploadImage: 'छवि अपलोड करें',
    location: 'स्थान',
    getCurrentLocation: 'वर्तमान स्थान प्राप्त करें',
    locationCaptured: 'स्थान प्राप्त हुआ',
    submitReport: 'रिपोर्ट जमा करें',
    reportSuccess: 'रिपोर्ट सफलतापूर्वक जमा की गई! आपके योगदान के लिए धन्यवाद।',

    pothole: 'गड्ढा',
    garbage: 'कूड़ा ओवरफ्लो',
    streetlight: 'स्ट्रीटलाइट खराबी',
    drainage: 'जल निकासी समस्या',
    roadDamage: 'सड़क क्षति',
    other: 'अन्य',

    pending: 'लंबित',
    inProgress: 'प्रगति में',
    resolved: 'हल किया गया',
    rejected: 'अस्वीकृत',
    reopened: 'पुनः खोला गया',

    low: 'कम',
    medium: 'मध्यम',
    high: 'उच्च',
    critical: 'गंभीर',

    totalReports: 'कुल रिपोर्ट्स',
    overduesSLA: 'SLA समय सीमा पार',
    priorityDistribution: 'प्राथमिकता वितरण',
    issuesByType: 'प्रकार के अनुसार समस्याएं',
    allReports: 'सभी रिपोर्ट्स',
    noReportsFound: 'कोई रिपोर्ट नहीं मिली',

    rateSolution: 'समाधान का मूल्यांकन करें',
    satisfied: 'संतुष्ट',
    notSatisfied: 'असंतुष्ट',
    submitFeedback: 'प्रतिक्रिया जमा करें',
    reopenReport: 'पुनः खोलें',

    citizen: 'नागरिक',
    wardOfficer: 'वार्ड अधिकारी',
    deptAdmin: 'विभाग प्रशासक',
    cityAdmin: 'शहर प्रशासक',

    duplicate: 'डुप्लीकेट',
    duplicateWarning: 'पास में समान समस्या मौजूद है',
    reportAnyway: 'फिर भी रिपोर्ट करें',
    viewExisting: 'मौजूदा रिपोर्ट देखें',
    rateLimitReached: 'सीमा पहुंच गई',
    reportsRemaining: 'आज बाकी रिपोर्ट्स',
    getDirections: 'निर्देश प्राप्त करें',
    copyMunicipality: 'नगर पालिका कॉपी करें',
    contactMunicipality: 'नगर पालिक से संपर्क करें',
    change: 'बदलें',
    backToCategories: 'श्रेणियों पर वापस जाएं',
    termsAgreement: 'जारी रखते हुए, आप हमारी सेवा शर्तें और गोपनीयता नीति से सहमत हैं',
    loadingApp: 'लोड हो रहा है CivicSense AI...',
};

// Telugu translations
const te: Translations = {
    appName: 'CivicSense AI',
    tagline: 'స్మార్ట్ సిటీ నిర్వహణ',
    loading: 'లోడ్ అవుతోంది...',
    submit: 'సమర్పించు',
    cancel: 'రద్దు చేయి',
    save: 'సేవ్ చేయి',
    delete: 'తొలగించు',
    edit: 'మార్చు',
    close: 'మూసివేయి',
    yes: 'అవును',
    no: 'కాదు',

    signIn: 'సైన్ ఇన్',
    signUp: 'సైన్ అప్',
    signOut: 'సైన్ అవుట్',
    email: 'ఇమెయిల్',
    password: 'పాస్‌వర్డ్',
    forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?',
    createAccount: 'ఖాతా సృష్టించు',
    alreadyHaveAccount: 'ఇప్పటికే ఖాతా ఉందా?',

    reportIssue: 'సమస్యను నివేదించండి',
    dashboard: 'డ్యాష్‌బోర్డ్',
    myReports: 'నా నివేదికలు',

    reportCivicIssue: 'పౌర సమస్యను నివేదించండి',
    reportDescription: 'సమస్యలను నివేదించడం ద్వారా మీ నగరాన్ని మెరుగ్గా చేయడంలో సహాయపడండి',
    issueType: 'సమస్య రకం',
    title: 'శీర్షిక',
    description: 'వివరణ',
    uploadImage: 'చిత్రాన్ని అప్‌లోడ్ చేయండి',
    location: 'స్థానం',
    getCurrentLocation: 'ప్రస్తుత స్థానాన్ని పొందండి',
    locationCaptured: 'స్థానం పొందబడింది',
    submitReport: 'నివేదికను సమర్పించండి',
    reportSuccess: 'నివేదిక విజయవంతంగా సమర్పించబడింది! మీ సహకారానికి ధన్యవాదాలు.',

    pothole: 'గోతి',
    garbage: 'చెత్త ఓవర్‌ఫ్లో',
    streetlight: 'వీధి దీపం వైఫల్యం',
    drainage: 'డ్రైనేజీ సమస్య',
    roadDamage: 'రోడ్డు నష్టం',
    other: 'ఇతర',

    pending: 'పెండింగ్',
    inProgress: 'ప్రగతిలో',
    resolved: 'పరిష్కారమైంది',
    rejected: 'తిరస్కరించబడింది',
    reopened: 'తిరిగి తెరవబడింది',

    low: 'తక్కువ',
    medium: 'మధ్యస్థం',
    high: 'ఉన్నత',
    critical: 'క్లిష్టమైన',

    totalReports: 'మొత్తం నివేదికలు',
    overduesSLA: 'SLA గడువు దాటింది',
    priorityDistribution: 'ప్రాధాన్యత పంపిణీ',
    issuesByType: 'రకం వారీగా సమస్యలు',
    allReports: 'అన్ని నివేదికలు',
    noReportsFound: 'నివేదికలు కనుగొనబడలేదు',

    rateSolution: 'పరిష్కారాన్ని రేట్ చేయండి',
    satisfied: 'సంతృప్తి',
    notSatisfied: 'అసంతృప్తి',
    submitFeedback: 'అభిప్రాయాన్ని సమర్పించండి',
    reopenReport: 'తిరిగి తెరువు',

    citizen: 'పౌరుడు',
    wardOfficer: 'వార్డు అధికారి',
    deptAdmin: 'విభాగ నిర్వాహకుడు',
    cityAdmin: 'నగర నిర్వాహకుడు',

    duplicate: 'నకిలీ',
    duplicateWarning: 'సమీపంలో సారూప్య సమస్య ఉంది',
    reportAnyway: 'ఎలాగైనా నివేదించు',
    viewExisting: 'ఇప్పటికే ఉన్న నివేదికను చూడండి',
    rateLimitReached: 'పరిమితి చేరుకుంది',
    reportsRemaining: 'ఈరోజు మిగిలిన నివేదికలు',
    getDirections: 'దిశ తెలుసుకోండి',
    copyMunicipality: 'పాలక సంస్థను కాపీ చేయి',
    contactMunicipality: 'పాలక సంస్థకు సంబంధించండి',
    change: 'మార్చు',
    backToCategories: 'వర్గాలకు తిరుగు',
    termsAgreement: 'కొనసాగితే, మీరు మా సేవా నిబంధనలు మరియు గోప్యతా విధానాన్ని అంగీకరిస్తారు',
    loadingApp: 'CivicSense AI లోడ్ అవుతుంది...',
};

const translations: Record<Language, Translations> = { en, hi, te };

// Context
interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Provider
export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        // Try to get from localStorage or detect from browser
        const saved = localStorage.getItem('civicsense_language') as Language;
        if (saved && translations[saved]) {
            return saved;
        }

        // Detect from browser
        const browserLang = navigator.language.split('-')[0];
        if (browserLang === 'hi') return 'hi';
        if (browserLang === 'te') return 'te';
        return 'en';
    });

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('civicsense_language', lang);
        document.documentElement.lang = lang;
    }, []);

    const t = useCallback((key: keyof Translations): string => {
        return translations[language][key] || translations.en[key] || key;
    }, [language]);

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}

// Hook
export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}

// Language selector component
export function LanguageSelector() {
    const { language, setLanguage } = useI18n();

    return (
        <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
            {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                </option>
            ))}
        </select>
    );
}
