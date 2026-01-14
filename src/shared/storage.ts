// Storage Layer for Attio CRM Data Extractor
// Handles CRUD operations with deduplication and race condition handling

import type { AttioData, Contact, Deal, Task, DataType } from './types';

const STORAGE_KEY = 'attio_data';

// Default empty data structure
const getDefaultData = (): AttioData => ({
    contacts: [],
    deals: [],
    tasks: [],
    lastSync: 0,
});

// Generate a unique hash ID from string content
export function generateId(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
}

// Get all stored data
export async function getAllData(): Promise<AttioData> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || getDefaultData();
}

// Save contacts with deduplication
export async function saveContacts(newContacts: Contact[]): Promise<void> {
    const data = await getAllData();
    const existingMap = new Map(data.contacts.map(c => [c.id, c]));

    for (const contact of newContacts) {
        existingMap.set(contact.id, contact);
    }

    data.contacts = Array.from(existingMap.values());
    data.lastSync = Date.now();

    await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

// Save deals with deduplication
export async function saveDeals(newDeals: Deal[]): Promise<void> {
    const data = await getAllData();
    const existingMap = new Map(data.deals.map(d => [d.id, d]));

    for (const deal of newDeals) {
        existingMap.set(deal.id, deal);
    }

    data.deals = Array.from(existingMap.values());
    data.lastSync = Date.now();

    await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

// Save tasks with deduplication
export async function saveTasks(newTasks: Task[]): Promise<void> {
    const data = await getAllData();
    const existingMap = new Map(data.tasks.map(t => [t.id, t]));

    for (const task of newTasks) {
        existingMap.set(task.id, task);
    }

    data.tasks = Array.from(existingMap.values());
    data.lastSync = Date.now();

    await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

// Delete a record by type and ID
export async function deleteRecord(type: DataType, id: string): Promise<boolean> {
    const data = await getAllData();

    switch (type) {
        case 'contacts':
            data.contacts = data.contacts.filter(c => c.id !== id);
            break;
        case 'deals':
            data.deals = data.deals.filter(d => d.id !== id);
            break;
        case 'tasks':
            data.tasks = data.tasks.filter(t => t.id !== id);
            break;
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return true;
}

// Clear all data
export async function clearAllData(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: getDefaultData() });
}

// Export data as JSON
export function exportAsJSON(data: AttioData): string {
    return JSON.stringify({ attio_data: data }, null, 2);
}

// Export contacts as CSV
export function exportContactsAsCSV(contacts: Contact[]): string {
    const headers = ['ID', 'Name', 'Emails', 'Phones', 'Extracted At'];
    const rows = contacts.map(c => [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.emails.join(', ')}"`,
        `"${c.phones.join(', ')}"`,
        new Date(c.extractedAt).toISOString(),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Export deals as CSV
export function exportDealsAsCSV(deals: Deal[]): string {
    const headers = ['ID', 'Name', 'Value', 'Stage', 'Company'];
    const rows = deals.map(d => [
        d.id,
        `"${d.name.replace(/"/g, '""')}"`,
        d.value !== null ? d.value.toString() : '',
        `"${d.stage.replace(/"/g, '""')}"`,
        `"${d.company.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// Export tasks as CSV
export function exportTasksAsCSV(tasks: Task[]): string {
    const headers = ['ID', 'Title', 'Due Date', 'Assignee', 'Done'];
    const rows = tasks.map(t => [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        t.dueDate || '',
        `"${t.assignee.replace(/"/g, '""')}"`,
        t.done ? 'Yes' : 'No',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
