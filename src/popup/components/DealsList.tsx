import React, { useState } from 'react';
import type { Deal } from '../../shared/types';

interface DealsListProps {
    deals: Deal[];
    onDelete: (id: string) => void;
}

const DealsList: React.FC<DealsListProps> = ({ deals, onDelete }) => {
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const formatValue = (value: number | null): string => {
        if (value === null) return '—';

        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}K`;
        }
        return `$${value.toLocaleString()}`;
    };

    const getStageColor = (stage: string): string => {
        const lowerStage = stage.toLowerCase();
        if (lowerStage.includes('won') || lowerStage.includes('closed')) {
            return 'bg-emerald-500/20 text-emerald-400';
        }
        if (lowerStage.includes('lost')) {
            return 'bg-red-500/20 text-red-400';
        }
        if (lowerStage.includes('negotiat') || lowerStage.includes('proposal')) {
            return 'bg-amber-500/20 text-amber-400';
        }
        return 'bg-blue-500/20 text-blue-400';
    };

    if (deals.length === 0) {
        return (
            <div className="empty-state">
                <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="empty-state-title">No deals yet</h3>
                <p className="empty-state-text">Navigate to Attio's Deals/Pipeline view and click "Extract Now"</p>
            </div>
        );
    }

    const handleDelete = (id: string) => {
        if (deleteConfirm === id) {
            onDelete(id);
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(id);
            setTimeout(() => setDeleteConfirm(null), 3000);
        }
    };

    return (
        <div className="space-y-2 pt-3">
            {deals.map((deal, index) => (
                <div
                    key={deal.id}
                    className="card group animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <div className="flex items-start justify-between gap-3">
                        {/* Deal Info */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-white truncate">{deal.name}</h3>
                                <span className={`badge ${getStageColor(deal.stage)}`}>
                                    {deal.stage}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="text-emerald-400 font-medium">
                                    {formatValue(deal.value)}
                                </span>
                                {deal.company && (
                                    <>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-slate-400 truncate">{deal.company}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Delete Button */}
                        <button
                            onClick={() => handleDelete(deal.id)}
                            className={`btn-danger opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${deleteConfirm === deal.id ? 'opacity-100 !bg-red-500/30' : ''
                                }`}
                            title={deleteConfirm === deal.id ? 'Click again to confirm' : 'Delete'}
                        >
                            {deleteConfirm === deal.id ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DealsList;
