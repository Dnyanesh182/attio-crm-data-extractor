import React from 'react';

type TabType = 'contacts' | 'deals' | 'tasks';

interface TabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    counts: {
        contacts: number;
        deals: number;
        tasks: number;
    };
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange, counts }) => {
    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        {
            id: 'contacts',
            label: 'Contacts',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            id: 'deals',
            label: 'Deals',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            id: 'tasks',
            label: 'Tasks',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
        },
    ];

    return (
        <div className="px-4 pt-3">
            <div className="flex border-b border-slate-700/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`tab flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {counts[tab.id] > 0 && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'bg-slate-700/50 text-slate-400'
                                }`}>
                                {counts[tab.id]}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Tabs;
