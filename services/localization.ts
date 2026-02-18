export type AppLanguage = 'en' | 'fr';

const STORAGE_KEY = 'retro-language';

const MESSAGES: Record<AppLanguage, Record<string, string>> = {
  en: {
    language: 'Language',
    english: 'English',
    french: 'French',
    whatsNew: "What's New",
    user: 'User',
    logoutTeam: 'Logout Team',
    retrospective: 'Retrospective',
    healthCheck: 'Health Check',

    tabActions: 'Actions',
    tabRetrospectives: 'Retrospectives',
    tabHealthChecks: 'Health Checks',
    tabMembers: 'Members',
    tabSettings: 'Settings',
    tabFeedbackHub: 'Feedback Hub',
  },
  fr: {
    language: 'Langue',
    english: 'Anglais',
    french: 'Français',
    whatsNew: 'Nouveautés',
    user: 'Utilisateur',
    logoutTeam: "Déconnexion de l'équipe",
    retrospective: 'Rétrospective',
    healthCheck: 'Bilan de santé',

    tabActions: 'Actions',
    tabRetrospectives: 'Rétrospectives',
    tabHealthChecks: 'Bilans de santé',
    tabMembers: 'Membres',
    tabSettings: 'Paramètres',
    tabFeedbackHub: 'Retours',
  }
};

let currentLanguage: AppLanguage =
  (typeof window !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as AppLanguage)) || 'en';

if (currentLanguage !== 'en' && currentLanguage !== 'fr') {
  currentLanguage = 'en';
}

const listeners = new Set<(language: AppLanguage) => void>();

export const localization = {
  getLanguage: (): AppLanguage => currentLanguage,
  setLanguage: (language: AppLanguage) => {
    currentLanguage = language;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
    }
    listeners.forEach(listener => listener(language));
  },
  onLanguageChange: (listener: (language: AppLanguage) => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  t: (key: string): string => MESSAGES[currentLanguage][key] || MESSAGES.en[key] || key,
};
