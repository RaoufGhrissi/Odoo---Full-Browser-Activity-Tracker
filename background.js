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

  // Generic type detection
  let type = "other";
  let details = {};

  const url = tab.url || "";
  const title = tab.title || "";

  if (url.includes("mail.google.com/inbox")) type = "gmail_read";
  else if (url.includes("discord.com")) type = "discord";
  else if (url.includes("odoo.com")) type = "odoo";

  currentTabEvent = {
    url,
    title,
    type,
    details,
    start: now,
    tabId: tab.id
  };
}

chrome.tabs.onActivated.addListener(({ tabId }) => switchTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.title) switchTab(tabId);
});

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  await logEvent(msg);
});
