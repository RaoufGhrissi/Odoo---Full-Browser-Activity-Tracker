// Gmail tracking
let lastUrl = location.href;
let currentActivity = null;

const composeEmails = {};

const observer = new MutationObserver(() => {
  document.querySelectorAll('div[role="dialog"] form[id]').forEach(form => {
    const id = form.getAttribute('id');
    if (!composeEmails[id]) {
      composeEmails[id] = {
        id,
        started: Date.now(),
        ended: null,
        to: [],
        cc: [],
        bcc: [],
        observers: [],
      };
      console.log(`[Gmail] Started composing email id=${id}`);
      observeFormClosed(form);
    } else if (composeEmails[id].observers.length === 0) {
      observeFormChanges(form); // i observe in the else block because when created (if block), the dom is still not completely rendered
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });

function observeFormChanges(form) {
  const id = form.getAttribute('id');
  ['to', 'cc', 'bcc'].forEach(field => {
    // i create an observer for each field, to detect changes
    const container = form.querySelector(`div[name="${field}"]`);
    if (!container) return;

    const updateRecipients = () => {
      const chips = container.querySelectorAll(`div[role='option'][data-hovercard-id]`);
      composeEmails[id][field] = Array.from(chips).map(el => el.getAttribute('data-hovercard-id')).filter(Boolean);
    };

    updateRecipients();

    const mo = new MutationObserver(muts => {
      updateRecipients();
    });
    mo.observe(container, { childList: true, subtree: true });

    composeEmails[id].observers.push(mo);
  });
};

function observeFormClosed(form) {
  const id = form.getAttribute("id");
  if (!id) return;

  const mo = new MutationObserver(() => {
    if (!document.body.contains(form)) {
      sendComposeData(id);
      mo.disconnect();
    }
  });

  mo.observe(document.body, { childList: true, subtree: true });
}

function sendComposeData(id) {
  const data = composeEmails[id];
  if (!data) return;

  data.ended = Date.now();
  data.duration = (data.ended - data.started) / 1000;
  data.started = new Date(data.started).toISOString();
  data.ended = new Date(data.ended).toISOString();

  data.observers?.forEach(o => o.disconnect());
  delete data.observers;
  delete data.id;

  const payload = {
    category: "gmail",
    action: "composing_email",
    data,
  };

  if (chrome.runtime?.id) {
    try {
      chrome.runtime.sendMessage(payload);
      console.log(`[Gmail] Compose closed id=${id} (duration: ${data.duration.toFixed(1)}s)`);
    } catch (e) {
      queuePendingCompose(payload);
    }
  } else {
    queuePendingCompose(payload);
  }

  delete composeEmails[id];
}

// Store unsent compose events
function queuePendingCompose(payload) {
  try {
    const pending = JSON.parse(localStorage.getItem("pendingCompose") || "[]");
    pending.push(payload);
    localStorage.setItem("pendingCompose", JSON.stringify(pending));
  } catch (e) {
    console.error("Failed to store pending compose:", e);
  }
}
// ---- Pending compose queue helpers ----

function queuePendingCompose(payload) {
  try {
    const pending = JSON.parse(localStorage.getItem("pendingCompose") || "[]");
    pending.push(payload);
    localStorage.setItem("pendingCompose", JSON.stringify(pending));
    console.log(`[Gmail] Queued compose event for retry (${pending.length} pending).`);
  } catch (e) {
    console.error("[Gmail] Failed to queue compose:", e);
  }
}

// Try resending pending events when the context becomes valid again
function resendPendingCompose() {
  if (!chrome.runtime?.id) return; // still invalidated

  const pending = JSON.parse(localStorage.getItem("pendingCompose") || "[]");
  if (!pending.length) return;

  console.log(`[Gmail] Retrying ${pending.length} queued compose events...`);
  const stillPending = [];

  pending.forEach(p => {
    try {
      chrome.runtime.sendMessage(p);
    } catch (err) {
      stillPending.push(p);
    }
  });

  if (stillPending.length) {
    localStorage.setItem("pendingCompose", JSON.stringify(stillPending));
  } else {
    localStorage.removeItem("pendingCompose");
  }
}

setTimeout(resendPendingCompose, 3000);

// window.addEventListener("message", (event) => {
//   if (event.source !== window) return;
//   if (event.data?.action === "get_events") {
//     chrome.runtime.sendMessage({ action: "get_events" }, (response) => {
//       window.postMessage({ action: "extension_response", events: response.events }, "*");
//     });
//   }
// });

