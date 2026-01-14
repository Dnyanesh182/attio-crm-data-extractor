// Contacts Extractor for Attio CRM
// Extracts contact/people data from any visible list view

import type { Contact } from '../../shared/types';
import { generateId } from '../../shared/storage';
import { getDataRows } from '../detector';

// Email regex pattern - comprehensive
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Phone number patterns (various formats)
const PHONE_PATTERN = /(?:\+?[1-9]\d{0,2}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}(?:[-.\s]?\d{1,4})?/g;

/**
 * Extract contacts from the current view
 */
export function extractContacts(): Contact[] {
    console.log('[Attio Extractor] Starting contact extraction...');

    const rows = getDataRows();
    const contacts: Contact[] = [];
    const seenNames = new Set<string>();
    const now = Date.now();

    console.log(`[Attio Extractor] Processing ${rows.length} rows for contacts`);

    for (const row of rows) {
        try {
            const contact = extractContactFromElement(row, now);
            if (contact && contact.name && !seenNames.has(contact.name.toLowerCase())) {
                contacts.push(contact);
                seenNames.add(contact.name.toLowerCase());
            }
        } catch (error) {
            console.error('[Attio Extractor] Error extracting contact:', error);
        }
    }

    // If no contacts found via rows, try scanning visible text
    if (contacts.length === 0) {
        console.log('[Attio Extractor] No contacts from rows, trying page scan...');
        const scannedContacts = scanPageForContacts(now);
        return scannedContacts;
    }

    console.log(`[Attio Extractor] Extracted ${contacts.length} contacts`);
    return contacts;
}

/**
 * Extract a contact from any element
 */
function extractContactFromElement(element: Element, timestamp: number): Contact | null {
    const fullText = element.textContent || '';
    if (fullText.length < 3) return null;

    // Find name - look for the most prominent text
    const name = findName(element);
    if (!name || name.length < 2) return null;

    // Extract emails from full text
    const emails = extractEmails(fullText);

    // Extract phone numbers
    const phones = extractPhones(fullText);

    // Generate unique ID
    const idSource = name + (emails[0] || '') + timestamp.toString();

    return {
        id: generateId(idSource),
        name,
        emails,
        phones,
        extractedAt: timestamp,
    };
}

/**
 * Find the name from an element
 */
function findName(element: Element): string {
    // Strategy 1: Look for specific name elements
    const nameSelectors = [
        '[class*="name" i]',
        '[class*="title" i]:not([class*="job"])',
        '[data-testid*="name"]',
        'a[href*="/person"]',
        'a[href*="/people"]',
        'a[href*="/contact"]',
    ];

    for (const selector of nameSelectors) {
        try {
            const nameEl = element.querySelector(selector);
            if (nameEl) {
                const text = nameEl.textContent?.trim();
                if (text && text.length >= 2 && text.length < 100 && !text.includes('@')) {
                    return text;
                }
            }
        } catch (e) {
            // Invalid selector
        }
    }

    // Strategy 2: Find first text content that looks like a name
    const children = element.querySelectorAll('div, span, td, a, p');
    for (const child of children) {
        const text = child.textContent?.trim() || '';

        // Name heuristics: 2+ words, no @ symbol, reasonable length
        if (text.length >= 2 &&
            text.length < 80 &&
            !text.includes('@') &&
            !text.match(/^\d+/) &&  // Doesn't start with number
            !text.match(/^[+\d\s()-]+$/) &&  // Not a phone number
            !text.includes('http')) {

            // Check if it looks like a name (has at least one letter)
            if (text.match(/[a-zA-Z]/)) {
                return text.split('\n')[0].trim();
            }
        }
    }

    // Strategy 3: First line of text content
    const lines = (element.textContent || '').split('\n').filter(l => l.trim());
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length >= 2 &&
            trimmed.length < 80 &&
            !trimmed.includes('@') &&
            trimmed.match(/[a-zA-Z]/)) {
            return trimmed;
        }
    }

    return '';
}

/**
 * Extract email addresses from text
 */
function extractEmails(text: string): string[] {
    const matches = text.match(EMAIL_PATTERN) || [];
    const emails = [...new Set(matches)].map(e => e.toLowerCase().trim());
    return emails.slice(0, 5); // Limit to 5 emails
}

/**
 * Extract phone numbers from text
 */
function extractPhones(text: string): string[] {
    const matches = text.match(PHONE_PATTERN) || [];

    const phones = matches
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(p => {
            const digits = p.replace(/\D/g, '');
            return digits.length >= 7 && digits.length <= 15;
        });

    return [...new Set(phones)].slice(0, 3); // Limit to 3 phones
}

/**
 * Scan the entire page for contact-like content
 */
function scanPageForContacts(timestamp: number): Contact[] {
    const contacts: Contact[] = [];
    const seenEmails = new Set<string>();

    // Find all emails on the page
    const pageText = document.body.innerText;
    const allEmails = pageText.match(EMAIL_PATTERN) || [];

    for (const email of allEmails) {
        const lowerEmail = email.toLowerCase();
        if (seenEmails.has(lowerEmail)) continue;
        seenEmails.add(lowerEmail);

        // Try to find a name near this email
        const emailEl = findElementContaining(email);
        let name = '';

        if (emailEl) {
            // Look for name in parent elements
            let parent = emailEl.parentElement;
            for (let i = 0; i < 3 && parent; i++) {
                const potentialName = findName(parent);
                if (potentialName && potentialName !== email) {
                    name = potentialName;
                    break;
                }
                parent = parent.parentElement;
            }
        }

        if (!name) {
            // Use email prefix as name
            name = email.split('@')[0].replace(/[._-]/g, ' ');
        }

        contacts.push({
            id: generateId(email + timestamp.toString()),
            name,
            emails: [lowerEmail],
            phones: [],
            extractedAt: timestamp,
        });
    }

    return contacts.slice(0, 50); // Limit results
}

/**
 * Find element containing specific text
 */
function findElementContaining(text: string): Element | null {
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
        if (el.children.length === 0 && el.textContent?.includes(text)) {
            return el;
        }
    }
    return null;
}

/**
 * Wait for dynamic content and extract contacts
 */
export function extractContactsWithWait(maxWait: number = 3000): Promise<Contact[]> {
    return new Promise((resolve) => {
        let lastCount = 0;
        let stableCount = 0;
        const checkInterval = 200;
        let elapsed = 0;

        const check = () => {
            const contacts = extractContacts();

            if (contacts.length === lastCount) {
                stableCount++;
            } else {
                stableCount = 0;
                lastCount = contacts.length;
            }

            elapsed += checkInterval;

            if (stableCount >= 3 || elapsed >= maxWait) {
                resolve(contacts);
            } else {
                setTimeout(check, checkInterval);
            }
        };

        check();
    });
}
