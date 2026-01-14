import React, { useState, useEffect, useCallback } from 'react';
import type { AttioData, DataType, Contact, Deal, Task } from '../shared/types';
import Header from './components/Header';
import Tabs from './components/Tabs';
import SearchBar from './components/SearchBar';
import ContactsList from './components/ContactsList';
import DealsList from './components/DealsList';
import TasksList from './components/TasksList';
import ExportButtons from './components/ExportButtons';

type TabType = 'contacts' | 'deals' | 'tasks';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('contacts');
    const [data, setData] = useState<AttioData>({
        contacts: [],
        deals: [],
        tasks: [],
        lastSync: 0,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load data from storage
    const loadData = useCallback(async () => {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'GET_DATA' });
            if (response) {
                setData(response);
            }
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Listen for storage changes
    useEffect(() => {
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.attio_data?.newValue) {
                setData(changes.attio_data.newValue);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    // Handle extraction
    const handleExtract = async () => {
        setIsExtracting(true);
        setError(null);

        try {
            const response = await chrome.runtime.sendMessage({ action: 'EXTRACT_NOW' });

            if (response?.success) {
                await loadData();
            } else {
                setError(response?.error || 'Extraction failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extract data');
        } finally {
            setIsExtracting(false);
        }
    };

    // Handle delete
    const handleDelete = async (type: DataType, id: string) => {
        try {
            await chrome.runtime.sendMessage({ action: 'DELETE_RECORD', type, id });
            await loadData();
        } catch (err) {
            console.error('Failed to delete record:', err);
        }
    };

    // Filter data based on search query
    const filterData = <T extends Contact | Deal | Task>(items: T[], query: string): T[] => {
        if (!query.trim()) return items;

        const lowerQuery = query.toLowerCase();
        return items.filter((item) => {
            const searchableText = JSON.stringify(item).toLowerCase();
            return searchableText.includes(lowerQuery);
        });
    };

    const filteredContacts = filterData(data.contacts, searchQuery);
    const filteredDeals = filterData(data.deals, searchQuery);
    const filteredTasks = filterData(data.tasks, searchQuery);

    return (
        <div className="min-h-[540px] flex flex-col">
            {/* Header */}
            <Header
                lastSync={data.lastSync}
                isExtracting={isExtracting}
                onExtract={handleExtract}
            />

            {/* Error Message */}
            {error && (
                <div className="mx-4 mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fadeIn">
                    {error}
                </div>
            )}

            {/* Search Bar */}
            <div className="px-4 pt-4">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search across all data..."
                />
            </div>

            {/* Tabs */}
            <Tabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={{
                    contacts: data.contacts.length,
                    deals: data.deals.length,
                    tasks: data.tasks.length,
                }}
            />

            {/* Content */}
            <div className="flex-1 overflow-auto px-4 pb-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'contacts' && (
                            <ContactsList
                                contacts={filteredContacts}
                                onDelete={(id: string) => handleDelete('contacts', id)}
                            />
                        )}
                        {activeTab === 'deals' && (
                            <DealsList
                                deals={filteredDeals}
                                onDelete={(id: string) => handleDelete('deals', id)}
                            />
                        )}
                        {activeTab === 'tasks' && (
                            <TasksList
                                tasks={filteredTasks}
                                onDelete={(id: string) => handleDelete('tasks', id)}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Export Buttons */}
            {!isLoading && (data.contacts.length > 0 || data.deals.length > 0 || data.tasks.length > 0) && (
                <ExportButtons data={data} />
            )}
        </div>
    );
};

export default App;
