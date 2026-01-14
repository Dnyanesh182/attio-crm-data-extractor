// Tasks Extractor for Attio CRM
// Extracts task/to-do data from Attio's task views

import type { Task } from '../../shared/types';
import { generateId } from '../../shared/storage';
import { getDataRows } from '../detector';

// Date patterns for parsing due dates
const DATE_PATTERNS = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // MM/DD/YYYY or DD-MM-YYYY
    /(\w+)\s+(\d{1,2}),?\s*(\d{4})?/i,           // Month DD, YYYY
    /(\d{1,2})\s+(\w+),?\s*(\d{4})?/i,           // DD Month YYYY
    /(\d{4})-(\d{2})-(\d{2})/,                   // ISO format
];

// Relative date keywords
const RELATIVE_DATES = ['today', 'tomorrow', 'yesterday', 'this week', 'next week', 'overdue', 'due today', 'due tomorrow'];

/**
 * Extract tasks from the current Attio Tasks view
 */
export function extractTasks(): Task[] {
    console.log('[Attio Extractor] Starting task extraction...');
    const now = Date.now();

    // Try table view first
    const tableTasks = extractTasksFromTable(now);
    if (tableTasks.length > 0) {
        console.log(`[Attio Extractor] Extracted ${tableTasks.length} tasks from table view`);
        return tableTasks;
    }

    // Try list/card view
    const listTasks = extractTasksFromList(now);
    if (listTasks.length > 0) {
        console.log(`[Attio Extractor] Extracted ${listTasks.length} tasks from list view`);
        return listTasks;
    }

    // Try aggressive DOM scanning
    const scannedTasks = extractTasksAggressively(now);
    if (scannedTasks.length > 0) {
        console.log(`[Attio Extractor] Extracted ${scannedTasks.length} tasks via aggressive scan`);
        return scannedTasks;
    }

    console.log('[Attio Extractor] No tasks found in current view');
    return [];
}

/**
 * Extract tasks from table view
 */
function extractTasksFromTable(timestamp: number): Task[] {
    const rows = getDataRows();
    const tasks: Task[] = [];

    console.log(`[Attio Extractor] Processing ${rows.length} rows for tasks...`);

    for (const row of rows) {
        try {
            const task = extractTaskFromRow(row, timestamp);
            if (task && task.title) {
                tasks.push(task);
            }
        } catch (error) {
            console.error('[Attio Extractor] Error extracting task from row:', error);
        }
    }

    return tasks;
}

/**
 * Extract tasks from list/card view
 */
function extractTasksFromList(timestamp: number): Task[] {
    const tasks: Task[] = [];

    // Find task items
    const itemSelectors = [
        '[data-testid*="task"]',
        '[data-testid*="item"]',
        '[class*="task-"]',
        '[class*="todo-"]',
        '[class*="Task"]',
        '[class*="activity"]',
        'li[class*="item"]',
        '[role="listitem"]',
    ];

    for (const selector of itemSelectors) {
        try {
            const items = document.querySelectorAll(selector);

            for (const item of items) {
                try {
                    const task = extractTaskFromItem(item, timestamp);
                    if (task && task.title) {
                        tasks.push(task);
                    }
                } catch (error) {
                    console.error('[Attio Extractor] Error extracting task from item:', error);
                }
            }

            if (tasks.length > 0) break;
        } catch (e) {
            // Selector might be invalid
        }
    }

    return tasks;
}

/**
 * Aggressive extraction - scan entire page for task-like content
 */
function extractTasksAggressively(timestamp: number): Task[] {
    console.log('[Attio Extractor] Trying aggressive task extraction...');
    const tasks: Task[] = [];
    const seenTitles = new Set<string>();

    // Find the main content area
    const mainContent = document.querySelector('main') || document.body;

    // Look for any divs that contain "today", "tomorrow", "due" etc.
    const allElements = mainContent.querySelectorAll('div, span, p, td, li');

    // Group elements by row structure
    const potentialRows: Element[] = [];

    allElements.forEach(el => {
        const text = (el.textContent || '').toLowerCase();
        // Look for elements that mention dates/due status
        if (RELATIVE_DATES.some(date => text.includes(date))) {
            // Find the row container (parent with multiple children)
            let rowEl = el.parentElement;
            while (rowEl && rowEl.children.length < 2) {
                rowEl = rowEl.parentElement;
            }
            if (rowEl && !potentialRows.includes(rowEl)) {
                potentialRows.push(rowEl);
            }
        }
    });

    console.log(`[Attio Extractor] Found ${potentialRows.length} potential task rows`);

    for (const row of potentialRows) {
        const fullText = row.textContent || '';

        // Extract task title - look for the main text content
        const children = Array.from(row.querySelectorAll('div, span'));
        let title = '';

        for (const child of children) {
            const childText = child.textContent?.trim() || '';
            // Skip date/status texts
            if (childText.length > 2 &&
                childText.length < 200 &&
                !RELATIVE_DATES.some(d => childText.toLowerCase() === d) &&
                !childText.match(/^\d{1,2}[\/\-]\d{1,2}/)) {
                // This looks like a title
                if (childText.length > title.length) {
                    title = childText;
                }
                break;
            }
        }

        if (!title || title.length < 2 || seenTitles.has(title)) continue;
        seenTitles.add(title);

        // Extract due date
        const dueDate = extractDueDate(fullText);

        // Check if done
        const done = checkIfDone(row);

        // Extract assignee
        const assignee = extractAssigneeGeneric(row);

        const id = generateId(title + (dueDate || '') + timestamp.toString());

        tasks.push({
            id,
            title: title.substring(0, 300),
            dueDate,
            assignee,
            done,
        });
    }

    return tasks;
}

/**
 * Extract a task from a table row
 */
function extractTaskFromRow(row: Element, timestamp: number): Task | null {
    const cells = Array.from(row.querySelectorAll('td, [role="gridcell"], [role="cell"], div[class*="cell"]'));
    if (cells.length === 0) {
        cells.push(...Array.from(row.children));
    }

    const fullText = row.textContent || '';

    // Extract title (first column or first text)
    const title = extractTitle(cells, row);
    if (!title) return null;

    // Check if done (look for checkbox)
    const done = checkIfDone(row);

    // Extract due date
    const dueDate = extractDueDate(fullText);

    // Extract assignee
    const assignee = extractAssignee(cells, row);

    // Generate ID
    const id = generateId(title + (dueDate || '') + timestamp.toString());

    return {
        id,
        title,
        dueDate,
        assignee,
        done,
    };
}

/**
 * Extract a task from a list item
 */
function extractTaskFromItem(item: Element, timestamp: number): Task | null {
    const fullText = item.textContent || '';

    // Extract title
    const titleElement = item.querySelector('[class*="title"], [class*="name"], [class*="content"], label, span:first-child, div:first-child');
    let title = titleElement?.textContent?.trim() || '';

    if (!title) {
        // Fallback: get first line of text
        title = fullText.split('\n')[0].trim();
    }

    if (!title || title.length > 300) return null;

    // Check if done
    const done = checkIfDone(item);

    // Extract due date
    const dueDate = extractDueDate(fullText);

    // Extract assignee
    const assignee = extractAssigneeGeneric(item);

    // Generate ID
    const id = generateId(title + (dueDate || '') + timestamp.toString());

    return {
        id,
        title: title.substring(0, 300),
        dueDate,
        assignee,
        done,
    };
}

/**
 * Extract task title from cells
 */
function extractTitle(cells: Element[], row: Element): string {
    // Try cells first
    if (cells.length > 0) {
        const firstCell = cells[0];
        // Look for text elements
        const textElements = firstCell.querySelectorAll('span, label, a, [class*="title"], [class*="name"], div');
        for (const el of textElements) {
            const text = el.textContent?.trim();
            if (text && text.length > 2 && text.length < 300 && !text.match(/^[\d\/\-]+$/)) {
                return text;
            }
        }

        // Fallback: direct text
        const text = firstCell.textContent?.trim() || '';
        if (text && text.length > 0 && text.length < 300) {
            return text.split('\n')[0].trim();
        }
    }

    // Try row directly
    const rowText = row.textContent?.trim() || '';
    const lines = rowText.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 2 && trimmed.length < 300 && !RELATIVE_DATES.some(d => trimmed.toLowerCase() === d)) {
            return trimmed;
        }
    }

    return '';
}

/**
 * Check if a task is marked as done
 */
function checkIfDone(element: Element): boolean {
    // Check for checked checkbox
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (checkbox instanceof HTMLInputElement) {
        return checkbox.checked;
    }

    // Check for checked state via attributes
    const checkedEl = element.querySelector('[aria-checked="true"], [data-checked="true"], [data-completed="true"], [data-state="checked"]');
    if (checkedEl) return true;

    // Check for completion-related classes
    const classes = element.className?.toLowerCase() || '';
    if (classes.includes('complete') || classes.includes('done') || classes.includes('checked')) {
        return true;
    }

    // Check for strikethrough text
    if (element.querySelector('s, del, [style*="line-through"]')) return true;

    return false;
}

/**
 * Extract due date from text
 */
function extractDueDate(text: string): string | null {
    const lowerText = text.toLowerCase();

    // Check for relative dates first
    for (const relative of RELATIVE_DATES) {
        if (lowerText.includes(relative)) {
            const today = new Date();
            if (relative.includes('today')) {
                return formatDate(today);
            }
            if (relative.includes('tomorrow')) {
                return formatDate(new Date(today.getTime() + 86400000));
            }
            if (relative === 'yesterday') {
                return formatDate(new Date(today.getTime() - 86400000));
            }
            if (relative === 'overdue') {
                return 'Overdue';
            }
            return relative.charAt(0).toUpperCase() + relative.slice(1);
        }
    }

    // Try date patterns
    for (const pattern of DATE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return null;
}

/**
 * Format date to ISO string (date only)
 */
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Extract assignee from cells
 */
function extractAssignee(cells: Element[], row: Element): string {
    // Look for avatar + name pattern
    const avatarSelectors = ['[class*="avatar"]', '[class*="assignee"]', '[class*="user"]', '[class*="owner"]', 'img[src*="avatar"]'];

    for (const selector of avatarSelectors) {
        const el = row.querySelector(selector);
        if (el) {
            const title = el.getAttribute('title') || el.getAttribute('alt');
            if (title) return title;

            const parent = el.parentElement;
            if (parent) {
                const text = parent.textContent?.trim();
                if (text && text.length < 100 && !text.includes('@') && text.length > 2) {
                    return text;
                }
            }
        }
    }

    // Check cells
    for (const cell of cells) {
        const classes = cell.className?.toLowerCase() || '';
        if (classes.includes('assignee') || classes.includes('owner') || classes.includes('user')) {
            const text = cell.textContent?.trim();
            if (text && text.length < 100 && text.length > 2) {
                return text;
            }
        }
    }

    return '';
}

/**
 * Generic assignee extraction from any element
 */
function extractAssigneeGeneric(element: Element): string {
    const selectors = ['[class*="assignee"]', '[class*="avatar"]', '[class*="owner"]', '[class*="user"]', 'img[alt]'];

    for (const selector of selectors) {
        const el = element.querySelector(selector);
        if (el) {
            const title = el.getAttribute('title') || el.getAttribute('alt');
            if (title && title.length > 2 && title.length < 100) return title;

            const text = el.textContent?.trim();
            if (text && text.length > 2 && text.length < 100) return text;
        }
    }

    return '';
}

/**
 * Wait for dynamic content and extract tasks
 */
export function extractTasksWithWait(maxWait: number = 3000): Promise<Task[]> {
    return new Promise((resolve) => {
        let lastCount = 0;
        let stableCount = 0;
        const checkInterval = 200;
        let elapsed = 0;

        const check = () => {
            const tasks = extractTasks();

            if (tasks.length === lastCount) {
                stableCount++;
            } else {
                stableCount = 0;
                lastCount = tasks.length;
            }

            elapsed += checkInterval;

            if (stableCount >= 3 || elapsed >= maxWait) {
                resolve(tasks);
            } else {
                setTimeout(check, checkInterval);
            }
        };

        check();
    });
}
