"use strict";
(() => {
  // src/shared/storage.ts
  var STORAGE_KEY = "attio_data";
  var getDefaultData = () => ({
    contacts: [],
    deals: [],
    tasks: [],
    lastSync: 0
  });
  async function getAllData() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || getDefaultData();
  }
  async function deleteRecord(type, id) {
    const data = await getAllData();
    switch (type) {
      case "contacts":
        data.contacts = data.contacts.filter((c) => c.id !== id);
        break;
      case "deals":
        data.deals = data.deals.filter((d) => d.id !== id);
        break;
      case "tasks":
        data.tasks = data.tasks.filter((t) => t.id !== id);
        break;
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return true;
  }
  function exportAsJSON(data) {
    return JSON.stringify({ attio_data: data }, null, 2);
  }
  function exportContactsAsCSV(contacts) {
    const headers = ["ID", "Name", "Emails", "Phones", "Extracted At"];
    const rows = contacts.map((c) => [
      c.id,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.emails.join(", ")}"`,
      `"${c.phones.join(", ")}"`,
      new Date(c.extractedAt).toISOString()
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
  function exportDealsAsCSV(deals) {
    const headers = ["ID", "Name", "Value", "Stage", "Company"];
    const rows = deals.map((d) => [
      d.id,
      `"${d.name.replace(/"/g, '""')}"`,
      d.value !== null ? d.value.toString() : "",
      `"${d.stage.replace(/"/g, '""')}"`,
      `"${d.company.replace(/"/g, '""')}"`
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
  function exportTasksAsCSV(tasks) {
    const headers = ["ID", "Title", "Due Date", "Assignee", "Done"];
    const rows = tasks.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.dueDate || "",
      `"${t.assignee.replace(/"/g, '""')}"`,
      t.done ? "Yes" : "No"
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  // src/background/service-worker.ts
  console.log("[Attio Extractor] Service worker started");
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[Attio Extractor SW] Received message:", message.action);
    handleMessage(message, sender).then(sendResponse).catch((error) => {
      console.error("[Attio Extractor SW] Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  });
  async function handleMessage(message, _sender) {
    switch (message.action) {
      case "EXTRACT_NOW":
        return handleExtractNow();
      case "GET_DATA":
        return handleGetData();
      case "DELETE_RECORD":
        return handleDeleteRecord(message.type, message.id);
      case "EXPORT_DATA":
        return handleExportData(message.format);
      case "EXTRACTION_COMPLETE":
        return handleExtractionComplete(message.data, message.success);
      default:
        console.warn("[Attio Extractor SW] Unknown message action");
        return { success: false, error: "Unknown action" };
    }
  }
  async function handleExtractNow() {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        return { success: false, error: "No active tab found" };
      }
      if (!activeTab.url?.includes("attio.com")) {
        return { success: false, error: "Please navigate to Attio CRM first" };
      }
      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, { action: "EXTRACT_NOW" });
        if (response) {
          return response;
        }
      } catch (err) {
        console.log("[Attio Extractor SW] Content script not loaded, injecting...");
      }
      try {
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ["src/content/index.js"]
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        const response = await chrome.tabs.sendMessage(activeTab.id, { action: "EXTRACT_NOW" });
        return response;
      } catch (injectError) {
        console.error("[Attio Extractor SW] Failed to inject script:", injectError);
        return {
          success: false,
          error: "Please refresh the Attio page and try again"
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to communicate with page";
      console.error("[Attio Extractor SW] Extract error:", error);
      return { success: false, error: errorMessage };
    }
  }
  async function handleGetData() {
    return getAllData();
  }
  async function handleDeleteRecord(type, id) {
    const success = await deleteRecord(type, id);
    return { success };
  }
  async function handleExportData(format) {
    const data = await getAllData();
    if (format === "json") {
      return {
        success: true,
        data: exportAsJSON(data),
        filename: `attio-export-${Date.now()}.json`
      };
    }
    const csvData = {
      contacts: exportContactsAsCSV(data.contacts),
      deals: exportDealsAsCSV(data.deals),
      tasks: exportTasksAsCSV(data.tasks)
    };
    return {
      success: true,
      data: JSON.stringify(csvData),
      filename: `attio-export-${Date.now()}.csv`
    };
  }
  async function handleExtractionComplete(data, success) {
    console.log("[Attio Extractor SW] Extraction complete:", { success, data });
    return { success: true };
  }
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.attio_data) {
      console.log("[Attio Extractor SW] Storage updated:", changes.attio_data);
      chrome.tabs.query({ url: "https://app.attio.com/*" }, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: "DATA_UPDATED",
              newValue: changes.attio_data.newValue
            }).catch(() => {
            });
          }
        }
      });
    }
  });
  chrome.alarms.create("attio-sync-check", { periodInMinutes: 5 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "attio-sync-check") {
      console.log("[Attio Extractor SW] Periodic sync check");
    }
  });
  chrome.action.onClicked.addListener((_tab) => {
    console.log("[Attio Extractor SW] Extension icon clicked");
  });
  chrome.runtime.onInstalled.addListener((details) => {
    console.log("[Attio Extractor SW] Extension installed:", details.reason);
    if (details.reason === "install") {
      chrome.storage.local.get("attio_data", (result) => {
        if (!result.attio_data) {
          chrome.storage.local.set({
            attio_data: {
              contacts: [],
              deals: [],
              tasks: [],
              lastSync: 0
            }
          });
        }
      });
    }
  });
})();
