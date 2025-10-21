let currentTabEvent = null;

async function logEvent(event) {
  const { events = [] } = await chrome.storage.local.get("events");
  events.push(event);
  await chrome.storage.local.set({ events });
}

async function switchTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab) return;

  const now = Date.now();
  if (currentTabEvent) {
    currentTabEvent.duration = (now - currentTabEvent.start) / 1000;
    await logEvent(currentTabEvent);
  }

  currentTabEvent = normalizeEvent(tab);
}

chrome.tabs.onActivated.addListener(({ tabId }) => switchTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.title) switchTab(tabId);
});


function normalizeEvent(raw) {
  const url = raw.url || "";
  const title = raw.tabTitle || raw.title || "";
  let category = "other";
  let type = "";
  let name = "";

  if (url.includes("mail.google.com")) {
    const hash = url.split("#")[1] || "";
    if (url.includes("?compose=")) {
      return; // already managed in content.js
    } else if (hash === "inbox") {
      category = "gmail";
      type = "reading_inbox";
    } else if (/^inbox\/.+/.test(hash)) {
      category = "gmail";
      type = "reading_email";
    }
  } else if (url.includes("odoo.com/odoo/")) {
    category = "odoo";
    const match = url.match(/odoo\.com\/odoo\/([^\/?#]+)/);
    const app = match?.[1] || "unknown";
    return { ...raw, category, app, url, start: Date.now() };
  } else if (url.includes("discord.com")) {
    category = "discord";
    const parts = title.split(" | ").map(s => s.trim());
    if (parts[1]?.startsWith("@")) { type = "person"; name = parts[1]; }
    else if (parts[1]?.startsWith("#")) { type = "text_channel"; name = parts[1]; }
    else if (parts[1]?.startsWith('"')) { type = "thread"; name = parts[1]; }
    else { type = "voice_channel"; name = parts[1] || ""; }
  }

  return { ...raw, category, type, name, url, tabTitle: title, start: Date.now() };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse ) => {
  if (msg.category === "gmail" && msg.action === "composing_email") {
    logEvent(msg);
  } 
  // else if (msg.action === "get_events") { 
  //   chrome.storage.local.get("events", ({ events = [] }) => {
  //     sendResponse({ events });
  //   });
  //   return true;
  // };
});

chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg.action === "get_events") {
    // Read all stored events
    chrome.storage.local.get("events", ({ events = [] }) => {
      sendResponse({ events });
    });

    // Must return true for async response
    return true;
  }
});
