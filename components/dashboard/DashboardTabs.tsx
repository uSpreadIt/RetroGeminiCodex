import React from 'react';
import { localization } from '../../services/localization';

export type DashboardTab = 'ACTIONS' | 'RETROS' | 'HEALTH_CHECKS' | 'MEMBERS' | 'SETTINGS' | 'FEEDBACK';

interface Props {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

const TABS: { id: DashboardTab; labelKey: string; icon: string }[] = [
  { id: 'ACTIONS', labelKey: 'tabActions', icon: 'check_circle' },
  { id: 'RETROS', labelKey: 'tabRetrospectives', icon: 'history' },
  { id: 'HEALTH_CHECKS', labelKey: 'tabHealthChecks', icon: 'monitoring' },
  { id: 'MEMBERS', labelKey: 'tabMembers', icon: 'groups' },
  { id: 'SETTINGS', labelKey: 'tabSettings', icon: 'settings' },
  { id: 'FEEDBACK', labelKey: 'tabFeedbackHub', icon: 'hub' }
];

const DashboardTabs: React.FC<Props> = ({ activeTab, onChange }) => (
  <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`dash-tab px-6 py-3 font-bold text-sm flex items-center transition whitespace-nowrap ${activeTab === tab.id ? 'active' : 'text-slate-500 hover:text-retro-primary'}`}
      >
        <span className="material-symbols-outlined mr-2">{tab.icon}</span>
        {localization.t(tab.labelKey)}
      </button>
    ))}
  </div>
);

export default DashboardTabs;
