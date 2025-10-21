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
  
  chrome.runtime.sendMessage({
    type: "gmail_event",
    action: "composing_email",
    data,
  });

  console.log(`[Gmail] Compose closed id=${id} (duration: ${data.duration.toFixed(1)}s)`);

  delete composeEmails[id];
}
