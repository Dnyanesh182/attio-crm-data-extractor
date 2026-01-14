// View Detector for Attio CRM
// Detects the current page view type and finds data rows

import type { ViewType } from '../shared/types';

/**
 * Detect the current Attio view type based on URL patterns and DOM elements
 */
export function detectCurrentView(): ViewType {
    const pathname = window.location.pathname.toLowerCase();
    const url = window.location.href.toLowerCase();

    // URL-based detection (primary method)
    if (pathname.includes('/people') || pathname.includes('/contacts') || pathname.includes('/person')) {
        return 'people';
    }
    if (pathname.includes('/companies') || pathname.includes('/company') || pathname.includes('/organizations')) {
        return 'companies';
    }
    if (pathname.includes('/deals') || pathname.includes('/pipeline') || pathname.includes('/opportunities')) {
        return 'deals';
    }
    if (pathname.includes('/tasks') || pathname.includes('/todo') || pathname.includes('/activities')) {
        return 'tasks';
    }

    // DOM-based fallback detection
    return detectViewFromDOM();
}

/**
 * Fallback: Detect view type from DOM elements
 */
function detectViewFromDOM(): ViewType {
    const pageTitle = document.querySelector('h1, [role="heading"]')?.textContent?.toLowerCase() || '';
    const documentTitle = document.title.toLowerCase();
    const bodyText = document.body.innerText.slice(0, 1000).toLowerCase();

    if (pageTitle.includes('people') || pageTitle.includes('contact') || documentTitle.includes('people')) {
        return 'people';
    }
    if (pageTitle.includes('compan') || documentTitle.includes('compan')) {
        return 'companies';
    }
    if (pageTitle.includes('deal') || pageTitle.includes('pipeline') || documentTitle.includes('deal')) {
        return 'deals';
    }
    if (pageTitle.includes('task') || documentTitle.includes('task') || bodyText.includes('due date')) {
        return 'tasks';
    }

    return 'unknown';
}

/**
 * Check if we're on an Attio page
 */
export function isAttioPage(): boolean {
    return window.location.hostname.includes('attio.com');
}

/**
 * Get all data rows from the current view - comprehensive approach
 */
export function getDataRows(): Element[] {
    console.log('[Attio Extractor] Scanning for data rows...');

    // Strategy 1: Find the main table/grid container first
    const container = findMainContainer();
    if (container) {
        const rows = findRowsInContainer(container);
        if (rows.length > 0) {
            console.log(`[Attio Extractor] Found ${rows.length} rows in container`);
            return rows;
        }
    }

    // Strategy 2: Look for row-like elements anywhere in the page
    const globalRows = findRowsGlobally();
    if (globalRows.length > 0) {
        console.log(`[Attio Extractor] Found ${globalRows.length} rows globally`);
        return globalRows;
    }

    console.log('[Attio Extractor] No data rows found');
    return [];
}

/**
 * Find the main data container
 */
function findMainContainer(): Element | null {
    const containerSelectors = [
        '[data-testid*="table"]',
        '[data-testid*="list"]',
        '[data-testid*="grid"]',
        '[role="grid"]',
        '[role="table"]',
        '[role="list"]',
        'main table',
        'main [class*="table"]',
        'main [class*="list"]',
        '[class*="TableBody"]',
        '[class*="ListBody"]',
    ];

    for (const selector of containerSelectors) {
        try {
            const container = document.querySelector(selector);
            if (container && container.children.length > 0) {
                return container;
            }
        } catch (e) {
            // Invalid selector, skip
        }
    }

    // Fallback: find main element
    return document.querySelector('main') || document.body;
}

/**
 * Find rows within a container
 */
function findRowsInContainer(container: Element): Element[] {
    const rowSelectors = [
        '[data-testid*="row"]',
        '[data-testid*="item"]',
        '[data-testid*="record"]',
        '[role="row"]',
        '[role="listitem"]',
        'tr',
        '[class*="Row"]:not([class*="Header"])',
        '[class*="row-"]:not([class*="header"])',
        '[class*="Item"]',
        '> div > div', // Direct children pattern for virtual lists
    ];

    for (const selector of rowSelectors) {
        try {
            const rows = container.querySelectorAll(selector);
            const filtered = filterValidRows(rows);
            if (filtered.length > 0) {
                return filtered;
            }
        } catch (e) {
            // Invalid selector
        }
    }

    return [];
}

/**
 * Find rows globally in the page
 */
function findRowsGlobally(): Element[] {
    // Look for elements that have multiple columns (likely data rows)
    const allElements = document.querySelectorAll('div, tr, li');
    const potentialRows: Element[] = [];

    allElements.forEach(el => {
        // Skip if too few children or too deep
        if (el.children.length < 2) return;

        const rect = el.getBoundingClientRect();
        // Skip elements not visible or too small
        if (rect.height < 30 || rect.height > 200) return;
        if (rect.width < 200) return;

        // Check if it looks like a data row (has siblings with similar structure)
        const parent = el.parentElement;
        if (parent && parent.children.length > 1) {
            const siblings = Array.from(parent.children);
            const similarSiblings = siblings.filter(s =>
                s.children.length >= 2 &&
                s.tagName === el.tagName
            );

            if (similarSiblings.length >= 1) {
                potentialRows.push(el);
            }
        }
    });

    return filterValidRows(potentialRows.slice(0, 50));
}

/**
 * Filter out invalid rows (headers, empty, etc.)
 */
function filterValidRows(rows: Element[] | NodeListOf<Element>): Element[] {
    return Array.from(rows).filter(row => {
        const text = row.textContent?.trim() || '';

        // Must have some content
        if (text.length < 3) return false;

        // Skip if it's clearly a header
        if (row.querySelector('th')) return false;
        if (row.getAttribute('role') === 'columnheader') return false;
        const classes = (row.className || '').toLowerCase();
        if (classes.includes('header') && !classes.includes('row')) return false;

        // Skip navigation items
        if (row.closest('nav, aside, [role="navigation"]')) return false;

        // Check visibility
        const rect = row.getBoundingClientRect();
        if (rect.height < 20) return false;

        return true;
    });
}

/**
 * Get list container element
 */
export function getListContainer(): Element | null {
    return findMainContainer();
}
