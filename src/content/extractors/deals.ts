// Deals Extractor for Attio CRM
// Extracts deal/opportunity data from list and pipeline views

import type { Deal } from '../../shared/types';
import { generateId } from '../../shared/storage';
import { getDataRows } from '../detector';

// Currency value patterns
const CURRENCY_PATTERN = /(?:[$€£¥₹]|USD|EUR|GBP|INR)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:[$€£¥₹]|USD|EUR|GBP|INR|k|K|M|m)/gi;

// Common deal stage keywords
const STAGE_KEYWORDS = [
    'lead', 'prospect', 'qualified', 'proposal', 'negotiation',
    'closed', 'won', 'lost', 'open', 'in progress', 'pending',
    'discovery', 'demo', 'trial', 'contract', 'onboarding',
    'new', 'contacted', 'meeting', 'quote', 'decision'
];

/**
 * Extract deals from the current view
 */
export function extractDeals(): Deal[] {
    console.log('[Attio Extractor] Starting deal extraction...');
    const now = Date.now();

    // Try structured extraction first
    const rows = getDataRows();
    const deals: Deal[] = [];
    const seenNames = new Set<string>();

    console.log(`[Attio Extractor] Processing ${rows.length} rows for deals`);

    for (const row of rows) {
        try {
            const deal = extractDealFromElement(row, now);
            if (deal && deal.name && !seenNames.has(deal.name.toLowerCase())) {
                deals.push(deal);
                seenNames.add(deal.name.toLowerCase());
            }
        } catch (error) {
            console.error('[Attio Extractor] Error extracting deal:', error);
        }
    }

    // Try kanban view if no deals found
    if (deals.length === 0) {
        console.log('[Attio Extractor] Trying kanban view extraction...');
        const kanbanDeals = extractFromKanban(now);
        if (kanbanDeals.length > 0) {
            return kanbanDeals;
        }
    }

    console.log(`[Attio Extractor] Extracted ${deals.length} deals`);
    return deals;
}

/**
 * Extract a deal from any element
 */
function extractDealFromElement(element: Element, timestamp: number): Deal | null {
    const fullText = element.textContent || '';
    if (fullText.length < 3) return null;

    // Find deal name
    const name = findDealName(element);
    if (!name) return null;

    // Extract value
    const value = extractValue(fullText);

    // Extract stage
    const stage = extractStage(fullText) || 'Unknown';

    // Extract company
    const company = extractCompany(element);

    return {
        id: generateId(name + company + timestamp.toString()),
        name,
        value,
        stage,
        company,
    };
}

/**
 * Find deal name from element
 */
function findDealName(element: Element): string {
    // Try specific selectors first
    const nameSelectors = [
        '[class*="name" i]',
        '[class*="title" i]',
        '[data-testid*="name"]',
        'a[href*="/deal"]',
        'a[href*="/opportunit"]',
    ];

    for (const selector of nameSelectors) {
        try {
            const el = element.querySelector(selector);
            if (el) {
                const text = el.textContent?.trim();
                if (text && text.length >= 2 && text.length < 150) {
                    return text;
                }
            }
        } catch (e) { }
    }

    // Find first substantial text
    const children = element.querySelectorAll('div, span, td, a');
    for (const child of children) {
        const text = child.textContent?.trim() || '';
        if (text.length >= 2 &&
            text.length < 150 &&
            !text.match(/^[$€£¥₹\d,.]+$/) &&
            !STAGE_KEYWORDS.some(s => text.toLowerCase() === s)) {
            return text.split('\n')[0].trim();
        }
    }

    return '';
}

/**
 * Extract monetary value
 */
function extractValue(text: string): number | null {
    const matches = text.match(CURRENCY_PATTERN);
    if (!matches || matches.length === 0) return null;

    let valueStr = matches[0];
    let multiplier = 1;

    if (valueStr.toLowerCase().includes('k')) {
        multiplier = 1000;
    } else if (valueStr.toLowerCase().includes('m')) {
        multiplier = 1000000;
    }

    const numStr = valueStr.replace(/[^0-9.,]/g, '').replace(',', '');
    const parsed = parseFloat(numStr);

    return isNaN(parsed) ? null : parsed * multiplier;
}

/**
 * Extract deal stage
 */
function extractStage(text: string): string | null {
    const lowerText = text.toLowerCase();

    for (const keyword of STAGE_KEYWORDS) {
        if (lowerText.includes(keyword)) {
            return keyword.charAt(0).toUpperCase() + keyword.slice(1);
        }
    }

    return null;
}

/**
 * Extract company name
 */
function extractCompany(element: Element): string {
    const companySelectors = [
        '[class*="company" i]',
        '[class*="organization" i]',
        '[class*="account" i]',
        '[data-testid*="company"]',
    ];

    for (const selector of companySelectors) {
        try {
            const el = element.querySelector(selector);
            if (el) {
                const text = el.textContent?.trim();
                if (text && text.length >= 2 && text.length < 100) {
                    return text;
                }
            }
        } catch (e) { }
    }

    return '';
}

/**
 * Extract deals from kanban/pipeline view
 */
function extractFromKanban(timestamp: number): Deal[] {
    const deals: Deal[] = [];
    const seenNames = new Set<string>();

    // Find kanban columns
    const columnSelectors = [
        '[class*="column" i]',
        '[class*="lane" i]',
        '[class*="stage" i]',
        '[data-testid*="column"]',
    ];

    for (const colSelector of columnSelectors) {
        try {
            const columns = document.querySelectorAll(colSelector);

            for (const column of columns) {
                // Get stage from column header
                const header = column.querySelector('[class*="header" i], h2, h3, h4');
                const stageName = header?.textContent?.trim() || 'Unknown';

                // Find cards in column
                const cardSelectors = [
                    '[class*="card" i]',
                    '[class*="item" i]',
                    '[draggable="true"]',
                ];

                for (const cardSelector of cardSelectors) {
                    const cards = column.querySelectorAll(cardSelector);

                    cards.forEach(card => {
                        const name = findDealName(card);
                        if (name && !seenNames.has(name.toLowerCase())) {
                            seenNames.add(name.toLowerCase());

                            const fullText = card.textContent || '';
                            deals.push({
                                id: generateId(name + stageName + timestamp.toString()),
                                name,
                                value: extractValue(fullText),
                                stage: stageName.length < 50 ? stageName : 'Unknown',
                                company: extractCompany(card),
                            });
                        }
                    });

                    if (cards.length > 0) break;
                }
            }

            if (deals.length > 0) break;
        } catch (e) { }
    }

    return deals;
}

/**
 * Wait for dynamic content and extract deals
 */
export function extractDealsWithWait(maxWait: number = 3000): Promise<Deal[]> {
    return new Promise((resolve) => {
        let lastCount = 0;
        let stableCount = 0;
        const checkInterval = 200;
        let elapsed = 0;

        const check = () => {
            const deals = extractDeals();

            if (deals.length === lastCount) {
                stableCount++;
            } else {
                stableCount = 0;
                lastCount = deals.length;
            }

            elapsed += checkInterval;

            if (stableCount >= 3 || elapsed >= maxWait) {
                resolve(deals);
            } else {
                setTimeout(check, checkInterval);
            }
        };

        check();
    });
}
