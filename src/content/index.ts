// Content Script Entry Point for Attio CRM Data Extractor
// This script runs on Attio pages and handles data extraction

import { detectCurrentView, isAttioPage } from './detector';
import { extractContactsWithWait } from './extractors/contacts';
import { extractDealsWithWait } from './extractors/deals';
import { extractTasksWithWait } from './extractors/tasks';
import { showExtracting, showSuccess, showError, showProgress, removeIndicator } from './indicator';
import { saveContacts, saveDeals, saveTasks } from '../shared/storage';
import type { MessageAction, ViewType, Contact, Deal, Task } from '../shared/types';

console.log('[Attio Extractor] Content script loaded on:', window.location.href);

// ALWAYS register message listener first, regardless of page check
chrome.runtime.onMessage.addListener((message: MessageAction, _sender, sendResponse) => {
    console.log('[Attio Extractor] Received message:', message);

    if (message.action === 'EXTRACT_NOW') {
        handleExtraction(message.viewType)
            .then(sendResponse)
            .catch((error) => {
                console.error('[Attio Extractor] Extraction error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep channel open for async response
    }

    if (message.action === 'GET_CURRENT_VIEW') {
        const viewType = detectCurrentView();
        sendResponse({ viewType });
        return true;
    }

    return false;
});

// Check if we're on an Attio page for additional setup
if (isAttioPage()) {
    console.log('[Attio Extractor] Attio page detected, setting up observer...');
    setupMutationObserver();
} else {
    console.log('[Attio Extractor] Not a recognized Attio page');
}

/**
 * Handle extraction request
 */
async function handleExtraction(requestedView?: ViewType): Promise<{
    success: boolean;
    data?: { contacts?: Contact[]; deals?: Deal[]; tasks?: Task[] };
    error?: string;
}> {
    try {
        // Detect current view
        const currentView = requestedView || detectCurrentView();
        console.log('[Attio Extractor] Current view:', currentView);

        // Show extraction indicator
        showExtracting(`Scanning ${currentView} view...`);

        let contacts: Contact[] = [];
        let deals: Deal[] = [];
        let tasks: Task[] = [];

        // Extract based on view type or extract all if unknown
        if (currentView === 'people' || currentView === 'companies' || currentView === 'unknown') {
            showProgress(1, 3, 'contacts');
            contacts = await extractContactsWithWait();
            if (contacts.length > 0) {
                await saveContacts(contacts);
            }
        }

        if (currentView === 'deals' || currentView === 'unknown') {
            showProgress(2, 3, 'deals');
            deals = await extractDealsWithWait();
            if (deals.length > 0) {
                await saveDeals(deals);
            }
        }

        if (currentView === 'tasks' || currentView === 'unknown') {
            showProgress(3, 3, 'tasks');
            tasks = await extractTasksWithWait();
            if (tasks.length > 0) {
                await saveTasks(tasks);
            }
        }

        const totalExtracted = contacts.length + deals.length + tasks.length;

        if (totalExtracted > 0) {
            showSuccess(`Extracted ${totalExtracted} records`);

            // Notify background script of successful extraction
            chrome.runtime.sendMessage({
                action: 'EXTRACTION_COMPLETE',
                data: { contacts, deals, tasks },
                success: true,
            }).catch(() => {
                // Background might not be listening, that's okay
            });

            return {
                success: true,
                data: { contacts, deals, tasks },
            };
        } else {
            showError('No data found on this page');
            return {
                success: false,
                error: 'No data found. Make sure you are on an Attio list view with visible data.',
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showError(errorMessage);
        throw error;
    }
}

/**
 * Set up mutation observer for dynamic content
 */
function setupMutationObserver(): void {
    let debounceTimer: number | null = null;

    const observer = new MutationObserver((_mutations) => {
        // Debounce to avoid excessive processing
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = window.setTimeout(() => {
            console.log('[Attio Extractor] DOM changed, new content may be available');
        }, 1000);
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    console.log('[Attio Extractor] Mutation observer active');
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    removeIndicator();
});
