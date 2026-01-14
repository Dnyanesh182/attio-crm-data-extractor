import React from 'react';

interface HeaderProps {
    lastSync: number;
    isExtracting: boolean;
    onExtract: () => void;
}

const Header: React.FC<HeaderProps> = ({ lastSync, isExtracting, onExtract }) => {
    const formatLastSync = (timestamp: number): string => {
        if (!timestamp) return 'Never synced';

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    return (
        <header className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between">
                {/* Logo & Title */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Attio Extractor</h1>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${lastSync ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            {formatLastSync(lastSync)}
                        </p>
                    </div>
                </div>

                {/* Extract Button */}
                <button
                    onClick={onExtract}
                    disabled={isExtracting}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExtracting ? (
                        <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Extracting...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span>Extract Now</span>
                        </>
                    )}
                </button>
            </div>
        </header>
    );
};

export default Header;
