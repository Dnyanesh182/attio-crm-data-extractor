// Service Worker (Background Script) for Attio CRM Data Extractor
// Handles message routing, storage events, and cross-tab communication

import { getAllData, deleteRecord, exportAsJSON, exportContactsAsCSV, exportDealsAsCSV, exportTasksAsCSV } from '../shared/storage';
import type { MessageAction, DataType, AttioData } from '../shared/types';

console.log('[Attio Extractor] Service worker started');

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: MessageAction, sender, sendResponse) => {
    console.log('[Attio Extractor SW] Received message:', message.action);

    handleMessage(message, sender)
        .then(sendResponse)
        .catch((error) => {
            console.error('[Attio Extractor SW] Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        });

    return true; // Keep channel open for async response
});

/**
 * Handle incoming messages
 */
async function handleMessage(
    message: MessageAction,
    _sender: chrome.runtime.MessageSender
): Promise<unknown> {
    switch (message.action) {
        case 'EXTRACT_NOW':
            return handleExtractNow();

        case 'GET_DATA':
            return handleGetData();

        case 'DELETE_RECORD':
            return handleDeleteRecord(message.type, message.id);

        case 'EXPORT_DATA':
            return handleExportData(message.format);

        case 'EXTRACTION_COMPLETE':
            return handleExtractionComplete(message.data, message.success);

        default:
            console.warn('[Attio Extractor SW] Unknown message action');
            return { success: false, error: 'Unknown action' };
    }
}

/**
 * Trigger extraction on the active tab
 */
async function handleExtractNow(): Promise<{ success: boolean; error?: string; data?: unknown }> {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!activeTab?.id) {
            return { success: false, error: 'No active tab found' };
        }

        if (!activeTab.url?.includes('attio.com')) {
            return { success: false, error: 'Please navigate to Attio CRM first' };
        }

        // First, try to send message to existing content script
        try {
            const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_NOW' });
            if (response) {
                return response;
            }
        } catch (err) {
            console.log('[Attio Extractor SW] Content script not loaded, injecting...');
        }

        // Content script not loaded - inject it programmatically
        try {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['src/content/index.js']
            });

            // Wait a moment for the script to initialize
            await new Promise(resolve => setTimeout(resolve, 500));

            // Try sending message again
            const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_NOW' });
            return response;
        } catch (injectError) {
            console.error('[Attio Extractor SW] Failed to inject script:', injectError);
            return {
                success: false,
                error: 'Please refresh the Attio page and try again'
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to communicate with page';
        console.error('[Attio Extractor SW] Extract error:', error);
        return { success: false, error: errorMessage };
    }
}

/**
 * Get all stored data
 */
async function handleGetData(): Promise<AttioData> {
    return getAllData();
}

/**
 * Delete a specific record
 */
async function handleDeleteRecord(
    type: DataType,
    id: string
): Promise<{ success: boolean }> {
    const success = await deleteRecord(type, id);
    return { success };
}

/**
 * Export data in the specified format
 */
async function handleExportData(
    format: 'csv' | 'json'
): Promise<{ success: boolean; data?: string; filename?: string }> {
    const data = await getAllData();

    if (format === 'json') {
        return {
            success: true,
            data: exportAsJSON(data),
            filename: `attio-export-${Date.now()}.json`,
        };
    }

    // For CSV, we'll export each type separately
    // Return contacts CSV by default (popup can request specific types)
    const csvData = {
        contacts: exportContactsAsCSV(data.contacts),
        deals: exportDealsAsCSV(data.deals),
        tasks: exportTasksAsCSV(data.tasks),
    };

    return {
        success: true,
        data: JSON.stringify(csvData),
        filename: `attio-export-${Date.now()}.csv`,
    };
}

/**
 * Handle extraction complete notification
 */
async function handleExtractionComplete(
    data: Partial<AttioData>,
    success: boolean
): Promise<{ success: boolean }> {
    console.log('[Attio Extractor SW] Extraction complete:', { success, data });

    // Could trigger notifications here
    // Could update badge icon

    return { success: true };
}

// Listen for storage changes for real-time sync
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.attio_data) {
        console.log('[Attio Extractor SW] Storage updated:', changes.attio_data);

        // Broadcast to all Attio tabs that data has changed
        chrome.tabs.query({ url: 'https://app.attio.com/*' }, (tabs) => {
            for (const tab of tabs) {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'DATA_UPDATED',
                        newValue: changes.attio_data.newValue,
                    }).catch(() => {
                        // Tab might not have content script loaded
                    });
                }
            }
        });
    }
});

// Set up alarm for potential periodic sync (optional feature)
chrome.alarms.create('attio-sync-check', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'attio-sync-check') {
        console.log('[Attio Extractor SW] Periodic sync check');
        // Could implement auto-sync here
    }
});

// Handle extension icon click (when popup is not default action)
chrome.action.onClicked.addListener((_tab) => {
    console.log('[Attio Extractor SW] Extension icon clicked');
    // Popup will open by default due to manifest config
});

// Initialize on install
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[Attio Extractor SW] Extension installed:', details.reason);

    if (details.reason === 'install') {
        // Initialize empty storage
        chrome.storage.local.get('attio_data', (result) => {
            if (!result.attio_data) {
                chrome.storage.local.set({
                    attio_data: {
                        contacts: [],
                        deals: [],
                        tasks: [],
                        lastSync: 0,
                    },
                });
            }
        });
    }
});
