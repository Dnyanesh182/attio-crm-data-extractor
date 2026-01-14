"use strict";
(() => {
  // src/content/detector.ts
  function detectCurrentView() {
    const pathname = window.location.pathname.toLowerCase();
    const url = window.location.href.toLowerCase();
    if (pathname.includes("/people") || pathname.includes("/contacts") || pathname.includes("/person")) {
      return "people";
    }
    if (pathname.includes("/companies") || pathname.includes("/company") || pathname.includes("/organizations")) {
      return "companies";
    }
    if (pathname.includes("/deals") || pathname.includes("/pipeline") || pathname.includes("/opportunities")) {
      return "deals";
    }
    if (pathname.includes("/tasks") || pathname.includes("/todo") || pathname.includes("/activities")) {
      return "tasks";
    }
    return detectViewFromDOM();
  }
  function detectViewFromDOM() {
    const pageTitle = document.querySelector('h1, [role="heading"]')?.textContent?.toLowerCase() || "";
    const documentTitle = document.title.toLowerCase();
    const bodyText = document.body.innerText.slice(0, 1e3).toLowerCase();
    if (pageTitle.includes("people") || pageTitle.includes("contact") || documentTitle.includes("people")) {
      return "people";
    }
    if (pageTitle.includes("compan") || documentTitle.includes("compan")) {
      return "companies";
    }
    if (pageTitle.includes("deal") || pageTitle.includes("pipeline") || documentTitle.includes("deal")) {
      return "deals";
    }
    if (pageTitle.includes("task") || documentTitle.includes("task") || bodyText.includes("due date")) {
      return "tasks";
    }
    return "unknown";
  }
  function isAttioPage() {
    return window.location.hostname.includes("attio.com");
  }
  function getDataRows() {
    console.log("[Attio Extractor] Scanning for data rows...");
    const container = findMainContainer();
    if (container) {
      const rows = findRowsInContainer(container);
      if (rows.length > 0) {
        console.log(`[Attio Extractor] Found ${rows.length} rows in container`);
        return rows;
      }
    }
    const globalRows = findRowsGlobally();
    if (globalRows.length > 0) {
      console.log(`[Attio Extractor] Found ${globalRows.length} rows globally`);
      return globalRows;
    }
    console.log("[Attio Extractor] No data rows found");
    return [];
  }
  function findMainContainer() {
    const containerSelectors = [
      '[data-testid*="table"]',
      '[data-testid*="list"]',
      '[data-testid*="grid"]',
      '[role="grid"]',
      '[role="table"]',
      '[role="list"]',
      "main table",
      'main [class*="table"]',
      'main [class*="list"]',
      '[class*="TableBody"]',
      '[class*="ListBody"]'
    ];
    for (const selector of containerSelectors) {
      try {
        const container = document.querySelector(selector);
        if (container && container.children.length > 0) {
          return container;
        }
      } catch (e) {
      }
    }
    return document.querySelector("main") || document.body;
  }
  function findRowsInContainer(container) {
    const rowSelectors = [
      '[data-testid*="row"]',
      '[data-testid*="item"]',
      '[data-testid*="record"]',
      '[role="row"]',
      '[role="listitem"]',
      "tr",
      '[class*="Row"]:not([class*="Header"])',
      '[class*="row-"]:not([class*="header"])',
      '[class*="Item"]',
      "> div > div"
      // Direct children pattern for virtual lists
    ];
    for (const selector of rowSelectors) {
      try {
        const rows = container.querySelectorAll(selector);
        const filtered = filterValidRows(rows);
        if (filtered.length > 0) {
          return filtered;
        }
      } catch (e) {
      }
    }
    return [];
  }
  function findRowsGlobally() {
    const allElements = document.querySelectorAll("div, tr, li");
    const potentialRows = [];
    allElements.forEach((el) => {
      if (el.children.length < 2) return;
      const rect = el.getBoundingClientRect();
      if (rect.height < 30 || rect.height > 200) return;
      if (rect.width < 200) return;
      const parent = el.parentElement;
      if (parent && parent.children.length > 1) {
        const siblings = Array.from(parent.children);
        const similarSiblings = siblings.filter(
          (s) => s.children.length >= 2 && s.tagName === el.tagName
        );
        if (similarSiblings.length >= 1) {
          potentialRows.push(el);
        }
      }
    });
    return filterValidRows(potentialRows.slice(0, 50));
  }
  function filterValidRows(rows) {
    return Array.from(rows).filter((row) => {
      const text = row.textContent?.trim() || "";
      if (text.length < 3) return false;
      if (row.querySelector("th")) return false;
      if (row.getAttribute("role") === "columnheader") return false;
      const classes = (row.className || "").toLowerCase();
      if (classes.includes("header") && !classes.includes("row")) return false;
      if (row.closest('nav, aside, [role="navigation"]')) return false;
      const rect = row.getBoundingClientRect();
      if (rect.height < 20) return false;
      return true;
    });
  }

  // src/shared/storage.ts
  var STORAGE_KEY = "attio_data";
  var getDefaultData = () => ({
    contacts: [],
    deals: [],
    tasks: [],
    lastSync: 0
  });
  function generateId(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36) + "_" + Date.now().toString(36);
  }
  async function getAllData() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || getDefaultData();
  }
  async function saveContacts(newContacts) {
    const data = await getAllData();
    const existingMap = new Map(data.contacts.map((c) => [c.id, c]));
    for (const contact of newContacts) {
      existingMap.set(contact.id, contact);
    }
    data.contacts = Array.from(existingMap.values());
    data.lastSync = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  }
  async function saveDeals(newDeals) {
    const data = await getAllData();
    const existingMap = new Map(data.deals.map((d) => [d.id, d]));
    for (const deal of newDeals) {
      existingMap.set(deal.id, deal);
    }
    data.deals = Array.from(existingMap.values());
    data.lastSync = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  }
  async function saveTasks(newTasks) {
    const data = await getAllData();
    const existingMap = new Map(data.tasks.map((t) => [t.id, t]));
    for (const task of newTasks) {
      existingMap.set(task.id, task);
    }
    data.tasks = Array.from(existingMap.values());
    data.lastSync = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  }

  // src/content/extractors/contacts.ts
  var EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  var PHONE_PATTERN = /(?:\+?[1-9]\d{0,2}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}(?:[-.\s]?\d{1,4})?/g;
  function extractContacts() {
    console.log("[Attio Extractor] Starting contact extraction...");
    const rows = getDataRows();
    const contacts = [];
    const seenNames = /* @__PURE__ */ new Set();
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
        console.error("[Attio Extractor] Error extracting contact:", error);
      }
    }
    if (contacts.length === 0) {
      console.log("[Attio Extractor] No contacts from rows, trying page scan...");
      const scannedContacts = scanPageForContacts(now);
      return scannedContacts;
    }
    console.log(`[Attio Extractor] Extracted ${contacts.length} contacts`);
    return contacts;
  }
  function extractContactFromElement(element, timestamp) {
    const fullText = element.textContent || "";
    if (fullText.length < 3) return null;
    const name = findName(element);
    if (!name || name.length < 2) return null;
    const emails = extractEmails(fullText);
    const phones = extractPhones(fullText);
    const idSource = name + (emails[0] || "") + timestamp.toString();
    return {
      id: generateId(idSource),
      name,
      emails,
      phones,
      extractedAt: timestamp
    };
  }
  function findName(element) {
    const nameSelectors = [
      '[class*="name" i]',
      '[class*="title" i]:not([class*="job"])',
      '[data-testid*="name"]',
      'a[href*="/person"]',
      'a[href*="/people"]',
      'a[href*="/contact"]'
    ];
    for (const selector of nameSelectors) {
      try {
        const nameEl = element.querySelector(selector);
        if (nameEl) {
          const text = nameEl.textContent?.trim();
          if (text && text.length >= 2 && text.length < 100 && !text.includes("@")) {
            return text;
          }
        }
      } catch (e) {
      }
    }
    const children = element.querySelectorAll("div, span, td, a, p");
    for (const child of children) {
      const text = child.textContent?.trim() || "";
      if (text.length >= 2 && text.length < 80 && !text.includes("@") && !text.match(/^\d+/) && // Doesn't start with number
      !text.match(/^[+\d\s()-]+$/) && // Not a phone number
      !text.includes("http")) {
        if (text.match(/[a-zA-Z]/)) {
          return text.split("\n")[0].trim();
        }
      }
    }
    const lines = (element.textContent || "").split("\n").filter((l) => l.trim());
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length >= 2 && trimmed.length < 80 && !trimmed.includes("@") && trimmed.match(/[a-zA-Z]/)) {
        return trimmed;
      }
    }
    return "";
  }
  function extractEmails(text) {
    const matches = text.match(EMAIL_PATTERN) || [];
    const emails = [...new Set(matches)].map((e) => e.toLowerCase().trim());
    return emails.slice(0, 5);
  }
  function extractPhones(text) {
    const matches = text.match(PHONE_PATTERN) || [];
    const phones = matches.map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => {
      const digits = p.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    });
    return [...new Set(phones)].slice(0, 3);
  }
  function scanPageForContacts(timestamp) {
    const contacts = [];
    const seenEmails = /* @__PURE__ */ new Set();
    const pageText = document.body.innerText;
    const allEmails = pageText.match(EMAIL_PATTERN) || [];
    for (const email of allEmails) {
      const lowerEmail = email.toLowerCase();
      if (seenEmails.has(lowerEmail)) continue;
      seenEmails.add(lowerEmail);
      const emailEl = findElementContaining(email);
      let name = "";
      if (emailEl) {
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
        name = email.split("@")[0].replace(/[._-]/g, " ");
      }
      contacts.push({
        id: generateId(email + timestamp.toString()),
        name,
        emails: [lowerEmail],
        phones: [],
        extractedAt: timestamp
      });
    }
    return contacts.slice(0, 50);
  }
  function findElementContaining(text) {
    const elements = document.querySelectorAll("*");
    for (const el of elements) {
      if (el.children.length === 0 && el.textContent?.includes(text)) {
        return el;
      }
    }
    return null;
  }
  function extractContactsWithWait(maxWait = 3e3) {
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

  // src/content/extractors/deals.ts
  var CURRENCY_PATTERN = /(?:[$€£¥₹]|USD|EUR|GBP|INR)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:[$€£¥₹]|USD|EUR|GBP|INR|k|K|M|m)/gi;
  var STAGE_KEYWORDS = [
    "lead",
    "prospect",
    "qualified",
    "proposal",
    "negotiation",
    "closed",
    "won",
    "lost",
    "open",
    "in progress",
    "pending",
    "discovery",
    "demo",
    "trial",
    "contract",
    "onboarding",
    "new",
    "contacted",
    "meeting",
    "quote",
    "decision"
  ];
  function extractDeals() {
    console.log("[Attio Extractor] Starting deal extraction...");
    const now = Date.now();
    const rows = getDataRows();
    const deals = [];
    const seenNames = /* @__PURE__ */ new Set();
    console.log(`[Attio Extractor] Processing ${rows.length} rows for deals`);
    for (const row of rows) {
      try {
        const deal = extractDealFromElement(row, now);
        if (deal && deal.name && !seenNames.has(deal.name.toLowerCase())) {
          deals.push(deal);
          seenNames.add(deal.name.toLowerCase());
        }
      } catch (error) {
        console.error("[Attio Extractor] Error extracting deal:", error);
      }
    }
    if (deals.length === 0) {
      console.log("[Attio Extractor] Trying kanban view extraction...");
      const kanbanDeals = extractFromKanban(now);
      if (kanbanDeals.length > 0) {
        return kanbanDeals;
      }
    }
    console.log(`[Attio Extractor] Extracted ${deals.length} deals`);
    return deals;
  }
  function extractDealFromElement(element, timestamp) {
    const fullText = element.textContent || "";
    if (fullText.length < 3) return null;
    const name = findDealName(element);
    if (!name) return null;
    const value = extractValue(fullText);
    const stage = extractStage(fullText) || "Unknown";
    const company = extractCompany(element);
    return {
      id: generateId(name + company + timestamp.toString()),
      name,
      value,
      stage,
      company
    };
  }
  function findDealName(element) {
    const nameSelectors = [
      '[class*="name" i]',
      '[class*="title" i]',
      '[data-testid*="name"]',
      'a[href*="/deal"]',
      'a[href*="/opportunit"]'
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
      } catch (e) {
      }
    }
    const children = element.querySelectorAll("div, span, td, a");
    for (const child of children) {
      const text = child.textContent?.trim() || "";
      if (text.length >= 2 && text.length < 150 && !text.match(/^[$€£¥₹\d,.]+$/) && !STAGE_KEYWORDS.some((s) => text.toLowerCase() === s)) {
        return text.split("\n")[0].trim();
      }
    }
    return "";
  }
  function extractValue(text) {
    const matches = text.match(CURRENCY_PATTERN);
    if (!matches || matches.length === 0) return null;
    let valueStr = matches[0];
    let multiplier = 1;
    if (valueStr.toLowerCase().includes("k")) {
      multiplier = 1e3;
    } else if (valueStr.toLowerCase().includes("m")) {
      multiplier = 1e6;
    }
    const numStr = valueStr.replace(/[^0-9.,]/g, "").replace(",", "");
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? null : parsed * multiplier;
  }
  function extractStage(text) {
    const lowerText = text.toLowerCase();
    for (const keyword of STAGE_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        return keyword.charAt(0).toUpperCase() + keyword.slice(1);
      }
    }
    return null;
  }
  function extractCompany(element) {
    const companySelectors = [
      '[class*="company" i]',
      '[class*="organization" i]',
      '[class*="account" i]',
      '[data-testid*="company"]'
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
      } catch (e) {
      }
    }
    return "";
  }
  function extractFromKanban(timestamp) {
    const deals = [];
    const seenNames = /* @__PURE__ */ new Set();
    const columnSelectors = [
      '[class*="column" i]',
      '[class*="lane" i]',
      '[class*="stage" i]',
      '[data-testid*="column"]'
    ];
    for (const colSelector of columnSelectors) {
      try {
        const columns = document.querySelectorAll(colSelector);
        for (const column of columns) {
          const header = column.querySelector('[class*="header" i], h2, h3, h4');
          const stageName = header?.textContent?.trim() || "Unknown";
          const cardSelectors = [
            '[class*="card" i]',
            '[class*="item" i]',
            '[draggable="true"]'
          ];
          for (const cardSelector of cardSelectors) {
            const cards = column.querySelectorAll(cardSelector);
            cards.forEach((card) => {
              const name = findDealName(card);
              if (name && !seenNames.has(name.toLowerCase())) {
                seenNames.add(name.toLowerCase());
                const fullText = card.textContent || "";
                deals.push({
                  id: generateId(name + stageName + timestamp.toString()),
                  name,
                  value: extractValue(fullText),
                  stage: stageName.length < 50 ? stageName : "Unknown",
                  company: extractCompany(card)
                });
              }
            });
            if (cards.length > 0) break;
          }
        }
        if (deals.length > 0) break;
      } catch (e) {
      }
    }
    return deals;
  }
  function extractDealsWithWait(maxWait = 3e3) {
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

  // src/content/extractors/tasks.ts
  var DATE_PATTERNS = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    // MM/DD/YYYY or DD-MM-YYYY
    /(\w+)\s+(\d{1,2}),?\s*(\d{4})?/i,
    // Month DD, YYYY
    /(\d{1,2})\s+(\w+),?\s*(\d{4})?/i,
    // DD Month YYYY
    /(\d{4})-(\d{2})-(\d{2})/
    // ISO format
  ];
  var RELATIVE_DATES = ["today", "tomorrow", "yesterday", "this week", "next week", "overdue", "due today", "due tomorrow"];
  function extractTasks() {
    console.log("[Attio Extractor] Starting task extraction...");
    const now = Date.now();
    const tableTasks = extractTasksFromTable(now);
    if (tableTasks.length > 0) {
      console.log(`[Attio Extractor] Extracted ${tableTasks.length} tasks from table view`);
      return tableTasks;
    }
    const listTasks = extractTasksFromList(now);
    if (listTasks.length > 0) {
      console.log(`[Attio Extractor] Extracted ${listTasks.length} tasks from list view`);
      return listTasks;
    }
    const scannedTasks = extractTasksAggressively(now);
    if (scannedTasks.length > 0) {
      console.log(`[Attio Extractor] Extracted ${scannedTasks.length} tasks via aggressive scan`);
      return scannedTasks;
    }
    console.log("[Attio Extractor] No tasks found in current view");
    return [];
  }
  function extractTasksFromTable(timestamp) {
    const rows = getDataRows();
    const tasks = [];
    console.log(`[Attio Extractor] Processing ${rows.length} rows for tasks...`);
    for (const row of rows) {
      try {
        const task = extractTaskFromRow(row, timestamp);
        if (task && task.title) {
          tasks.push(task);
        }
      } catch (error) {
        console.error("[Attio Extractor] Error extracting task from row:", error);
      }
    }
    return tasks;
  }
  function extractTasksFromList(timestamp) {
    const tasks = [];
    const itemSelectors = [
      '[data-testid*="task"]',
      '[data-testid*="item"]',
      '[class*="task-"]',
      '[class*="todo-"]',
      '[class*="Task"]',
      '[class*="activity"]',
      'li[class*="item"]',
      '[role="listitem"]'
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
            console.error("[Attio Extractor] Error extracting task from item:", error);
          }
        }
        if (tasks.length > 0) break;
      } catch (e) {
      }
    }
    return tasks;
  }
  function extractTasksAggressively(timestamp) {
    console.log("[Attio Extractor] Trying aggressive task extraction...");
    const tasks = [];
    const seenTitles = /* @__PURE__ */ new Set();
    const mainContent = document.querySelector("main") || document.body;
    const allElements = mainContent.querySelectorAll("div, span, p, td, li");
    const potentialRows = [];
    allElements.forEach((el) => {
      const text = (el.textContent || "").toLowerCase();
      if (RELATIVE_DATES.some((date) => text.includes(date))) {
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
      const fullText = row.textContent || "";
      const children = Array.from(row.querySelectorAll("div, span"));
      let title = "";
      for (const child of children) {
        const childText = child.textContent?.trim() || "";
        if (childText.length > 2 && childText.length < 200 && !RELATIVE_DATES.some((d) => childText.toLowerCase() === d) && !childText.match(/^\d{1,2}[\/\-]\d{1,2}/)) {
          if (childText.length > title.length) {
            title = childText;
          }
          break;
        }
      }
      if (!title || title.length < 2 || seenTitles.has(title)) continue;
      seenTitles.add(title);
      const dueDate = extractDueDate(fullText);
      const done = checkIfDone(row);
      const assignee = extractAssigneeGeneric(row);
      const id = generateId(title + (dueDate || "") + timestamp.toString());
      tasks.push({
        id,
        title: title.substring(0, 300),
        dueDate,
        assignee,
        done
      });
    }
    return tasks;
  }
  function extractTaskFromRow(row, timestamp) {
    const cells = Array.from(row.querySelectorAll('td, [role="gridcell"], [role="cell"], div[class*="cell"]'));
    if (cells.length === 0) {
      cells.push(...Array.from(row.children));
    }
    const fullText = row.textContent || "";
    const title = extractTitle(cells, row);
    if (!title) return null;
    const done = checkIfDone(row);
    const dueDate = extractDueDate(fullText);
    const assignee = extractAssignee(cells, row);
    const id = generateId(title + (dueDate || "") + timestamp.toString());
    return {
      id,
      title,
      dueDate,
      assignee,
      done
    };
  }
  function extractTaskFromItem(item, timestamp) {
    const fullText = item.textContent || "";
    const titleElement = item.querySelector('[class*="title"], [class*="name"], [class*="content"], label, span:first-child, div:first-child');
    let title = titleElement?.textContent?.trim() || "";
    if (!title) {
      title = fullText.split("\n")[0].trim();
    }
    if (!title || title.length > 300) return null;
    const done = checkIfDone(item);
    const dueDate = extractDueDate(fullText);
    const assignee = extractAssigneeGeneric(item);
    const id = generateId(title + (dueDate || "") + timestamp.toString());
    return {
      id,
      title: title.substring(0, 300),
      dueDate,
      assignee,
      done
    };
  }
  function extractTitle(cells, row) {
    if (cells.length > 0) {
      const firstCell = cells[0];
      const textElements = firstCell.querySelectorAll('span, label, a, [class*="title"], [class*="name"], div');
      for (const el of textElements) {
        const text2 = el.textContent?.trim();
        if (text2 && text2.length > 2 && text2.length < 300 && !text2.match(/^[\d\/\-]+$/)) {
          return text2;
        }
      }
      const text = firstCell.textContent?.trim() || "";
      if (text && text.length > 0 && text.length < 300) {
        return text.split("\n")[0].trim();
      }
    }
    const rowText = row.textContent?.trim() || "";
    const lines = rowText.split("\n").filter((l) => l.trim().length > 0);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 2 && trimmed.length < 300 && !RELATIVE_DATES.some((d) => trimmed.toLowerCase() === d)) {
        return trimmed;
      }
    }
    return "";
  }
  function checkIfDone(element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (checkbox instanceof HTMLInputElement) {
      return checkbox.checked;
    }
    const checkedEl = element.querySelector('[aria-checked="true"], [data-checked="true"], [data-completed="true"], [data-state="checked"]');
    if (checkedEl) return true;
    const classes = element.className?.toLowerCase() || "";
    if (classes.includes("complete") || classes.includes("done") || classes.includes("checked")) {
      return true;
    }
    if (element.querySelector('s, del, [style*="line-through"]')) return true;
    return false;
  }
  function extractDueDate(text) {
    const lowerText = text.toLowerCase();
    for (const relative of RELATIVE_DATES) {
      if (lowerText.includes(relative)) {
        const today = /* @__PURE__ */ new Date();
        if (relative.includes("today")) {
          return formatDate(today);
        }
        if (relative.includes("tomorrow")) {
          return formatDate(new Date(today.getTime() + 864e5));
        }
        if (relative === "yesterday") {
          return formatDate(new Date(today.getTime() - 864e5));
        }
        if (relative === "overdue") {
          return "Overdue";
        }
        return relative.charAt(0).toUpperCase() + relative.slice(1);
      }
    }
    for (const pattern of DATE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    return null;
  }
  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }
  function extractAssignee(cells, row) {
    const avatarSelectors = ['[class*="avatar"]', '[class*="assignee"]', '[class*="user"]', '[class*="owner"]', 'img[src*="avatar"]'];
    for (const selector of avatarSelectors) {
      const el = row.querySelector(selector);
      if (el) {
        const title = el.getAttribute("title") || el.getAttribute("alt");
        if (title) return title;
        const parent = el.parentElement;
        if (parent) {
          const text = parent.textContent?.trim();
          if (text && text.length < 100 && !text.includes("@") && text.length > 2) {
            return text;
          }
        }
      }
    }
    for (const cell of cells) {
      const classes = cell.className?.toLowerCase() || "";
      if (classes.includes("assignee") || classes.includes("owner") || classes.includes("user")) {
        const text = cell.textContent?.trim();
        if (text && text.length < 100 && text.length > 2) {
          return text;
        }
      }
    }
    return "";
  }
  function extractAssigneeGeneric(element) {
    const selectors = ['[class*="assignee"]', '[class*="avatar"]', '[class*="owner"]', '[class*="user"]', "img[alt]"];
    for (const selector of selectors) {
      const el = element.querySelector(selector);
      if (el) {
        const title = el.getAttribute("title") || el.getAttribute("alt");
        if (title && title.length > 2 && title.length < 100) return title;
        const text = el.textContent?.trim();
        if (text && text.length > 2 && text.length < 100) return text;
      }
    }
    return "";
  }
  function extractTasksWithWait(maxWait = 3e3) {
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

  // src/content/indicator.ts
  var INDICATOR_ID = "attio-extractor-indicator";
  var shadowRoot = null;
  var indicatorElement = null;
  function createIndicator() {
    removeIndicator();
    const host = document.createElement("div");
    host.id = INDICATOR_ID;
    host.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  `;
    shadowRoot = host.attachShadow({ mode: "closed" });
    shadowRoot.innerHTML = `
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      .indicator {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: #e2e8f0;
        animation: slideIn 0.3s ease-out;
        max-width: 320px;
        pointer-events: auto;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(20px);
        }
      }
      
      .indicator.hiding {
        animation: slideOut 0.3s ease-in forwards;
      }
      
      .icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(99, 102, 241, 0.3);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .check-icon {
        color: #22c55e;
      }
      
      .error-icon {
        color: #ef4444;
      }
      
      .content {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .status {
        font-weight: 500;
        color: #f8fafc;
      }
      
      .message {
        font-size: 11px;
        color: #94a3b8;
      }
      
      .progress-bar {
        width: 100%;
        height: 3px;
        background: rgba(99, 102, 241, 0.2);
        border-radius: 2px;
        margin-top: 6px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        border-radius: 2px;
        transition: width 0.3s ease;
      }
      
      .close-btn {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 18px;
        height: 18px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        color: #94a3b8;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.2s, background 0.2s;
      }
      
      .indicator:hover .close-btn {
        opacity: 1;
      }
      
      .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
    </style>
    
    <div class="indicator" id="indicator">
      <div class="icon">
        <div class="spinner"></div>
      </div>
      <div class="content">
        <span class="status">Initializing...</span>
        <span class="message"></span>
      </div>
      <button class="close-btn" id="closeBtn">\xD7</button>
    </div>
  `;
    document.body.appendChild(host);
    indicatorElement = shadowRoot.getElementById("indicator");
    const closeBtn = shadowRoot.getElementById("closeBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        hideIndicator();
      });
    }
  }
  function updateIndicator(update) {
    if (!shadowRoot || !indicatorElement) {
      createIndicator();
    }
    if (!shadowRoot) return;
    const iconContainer = shadowRoot.querySelector(".icon");
    const statusElement = shadowRoot.querySelector(".status");
    const messageElement = shadowRoot.querySelector(".message");
    if (!iconContainer || !statusElement || !messageElement) return;
    switch (update.state) {
      case "extracting":
        iconContainer.innerHTML = '<div class="spinner"></div>';
        statusElement.textContent = "Extracting data...";
        break;
      case "success":
        iconContainer.innerHTML = `
        <svg class="check-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
        </svg>
      `;
        statusElement.textContent = "Extraction complete!";
        break;
      case "error":
        iconContainer.innerHTML = `
        <svg class="error-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fill="currentColor"/>
        </svg>
      `;
        statusElement.textContent = "Extraction failed";
        break;
      default:
        iconContainer.innerHTML = '<div class="spinner"></div>';
    }
    if (update.message) {
      messageElement.textContent = update.message;
      messageElement.style.display = "block";
    } else {
      messageElement.style.display = "none";
    }
    if (update.progress) {
      let progressBar = shadowRoot.querySelector(".progress-bar");
      if (!progressBar) {
        const content = shadowRoot.querySelector(".content");
        if (content) {
          const bar = document.createElement("div");
          bar.className = "progress-bar";
          bar.innerHTML = '<div class="progress-fill" style="width: 0%"></div>';
          content.appendChild(bar);
          progressBar = bar;
        }
      }
      if (progressBar) {
        const fill = progressBar.querySelector(".progress-fill");
        if (fill) {
          const percent = Math.round(update.progress.current / update.progress.total * 100);
          fill.style.width = `${percent}%`;
        }
      }
    }
    if (update.state === "success" || update.state === "error") {
      setTimeout(() => {
        hideIndicator();
      }, update.state === "success" ? 2e3 : 4e3);
    }
  }
  function hideIndicator() {
    if (!indicatorElement) return;
    indicatorElement.classList.add("hiding");
    setTimeout(() => {
      removeIndicator();
    }, 300);
  }
  function removeIndicator() {
    const existing = document.getElementById(INDICATOR_ID);
    if (existing) {
      existing.remove();
    }
    shadowRoot = null;
    indicatorElement = null;
  }
  function showExtracting(message) {
    updateIndicator({ state: "extracting", message });
  }
  function showSuccess(message) {
    updateIndicator({ state: "success", message });
  }
  function showError(message) {
    updateIndicator({ state: "error", message });
  }
  function showProgress(current, total, type) {
    updateIndicator({
      state: "extracting",
      message: `Processing ${type}...`,
      progress: { current, total }
    });
  }

  // src/content/index.ts
  console.log("[Attio Extractor] Content script loaded on:", window.location.href);
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("[Attio Extractor] Received message:", message);
    if (message.action === "EXTRACT_NOW") {
      handleExtraction(message.viewType).then(sendResponse).catch((error) => {
        console.error("[Attio Extractor] Extraction error:", error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
    if (message.action === "GET_CURRENT_VIEW") {
      const viewType = detectCurrentView();
      sendResponse({ viewType });
      return true;
    }
    return false;
  });
  if (isAttioPage()) {
    console.log("[Attio Extractor] Attio page detected, setting up observer...");
    setupMutationObserver();
  } else {
    console.log("[Attio Extractor] Not a recognized Attio page");
  }
  async function handleExtraction(requestedView) {
    try {
      const currentView = requestedView || detectCurrentView();
      console.log("[Attio Extractor] Current view:", currentView);
      showExtracting(`Scanning ${currentView} view...`);
      let contacts = [];
      let deals = [];
      let tasks = [];
      if (currentView === "people" || currentView === "companies" || currentView === "unknown") {
        showProgress(1, 3, "contacts");
        contacts = await extractContactsWithWait();
        if (contacts.length > 0) {
          await saveContacts(contacts);
        }
      }
      if (currentView === "deals" || currentView === "unknown") {
        showProgress(2, 3, "deals");
        deals = await extractDealsWithWait();
        if (deals.length > 0) {
          await saveDeals(deals);
        }
      }
      if (currentView === "tasks" || currentView === "unknown") {
        showProgress(3, 3, "tasks");
        tasks = await extractTasksWithWait();
        if (tasks.length > 0) {
          await saveTasks(tasks);
        }
      }
      const totalExtracted = contacts.length + deals.length + tasks.length;
      if (totalExtracted > 0) {
        showSuccess(`Extracted ${totalExtracted} records`);
        chrome.runtime.sendMessage({
          action: "EXTRACTION_COMPLETE",
          data: { contacts, deals, tasks },
          success: true
        }).catch(() => {
        });
        return {
          success: true,
          data: { contacts, deals, tasks }
        };
      } else {
        showError("No data found on this page");
        return {
          success: false,
          error: "No data found. Make sure you are on an Attio list view with visible data."
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showError(errorMessage);
      throw error;
    }
  }
  function setupMutationObserver() {
    let debounceTimer = null;
    const observer = new MutationObserver((_mutations) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        console.log("[Attio Extractor] DOM changed, new content may be available");
      }, 1e3);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    console.log("[Attio Extractor] Mutation observer active");
  }
  window.addEventListener("beforeunload", () => {
    removeIndicator();
  });
})();
