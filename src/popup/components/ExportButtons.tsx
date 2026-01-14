import React, { useState } from 'react';
import type { AttioData } from '../../shared/types';
import { exportAsJSON, exportContactsAsCSV, exportDealsAsCSV, exportTasksAsCSV } from '../../shared/storage';

interface ExportButtonsProps {
    data: AttioData;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ data }) => {
    const [isExporting, setIsExporting] = useState(false);

    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportJSON = async () => {
        setIsExporting(true);
        try {
            const jsonContent = exportAsJSON(data);
            downloadFile(jsonContent, `attio-data-${Date.now()}.json`, 'application/json');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            // Export each type as separate CSV
            if (data.contacts.length > 0) {
                downloadFile(exportContactsAsCSV(data.contacts), `attio-contacts-${Date.now()}.csv`, 'text/csv');
            }
            if (data.deals.length > 0) {
                setTimeout(() => {
                    downloadFile(exportDealsAsCSV(data.deals), `attio-deals-${Date.now()}.csv`, 'text/csv');
                }, 100);
            }
            if (data.tasks.length > 0) {
                setTimeout(() => {
                    downloadFile(exportTasksAsCSV(data.tasks), `attio-tasks-${Date.now()}.csv`, 'text/csv');
                }, 200);
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="border-t border-slate-700/50 p-4 bg-slate-900/50">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                    {data.contacts.length + data.deals.length + data.tasks.length} total records
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportJSON}
                        disabled={isExporting}
                        className="btn-secondary text-sm flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        JSON
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={isExporting}
                        className="btn-secondary text-sm flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        CSV
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportButtons;
