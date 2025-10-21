chrome.storage.local.get("events", ({ events = [] }) => {
  const gmailComposeBody = document.getElementById("gmailComposeBody");
  const gmailReadBody = document.getElementById("gmailReadBody");
  const odooBody = document.getElementById("odooBody");
  const discordBody = document.getElementById("discordBody");

  events.forEach(ev => {
    const dur = ev.duration?.toFixed(1) || 0;

    // --- Gmail ---
    if (ev.category === "gmail") {
      if (ev.action === "composing_email") {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${new Date(ev.data.started).toLocaleTimeString()}</td>
                        <td>${ev.data.ended ? new Date(ev.data.ended).toLocaleTimeString() : ""}</td>
                        <td>${(ev.data.to || []).join(", ")}</td>
                        <td>${(ev.data.cc || []).join(", ")}</td>
                        <td>${(ev.data.bcc || []).join(", ")}</td>
                        <td>${ev.data.duration}</td>`;
        gmailComposeBody.appendChild(tr);
      } else {
        // reading inbox or reading specific email
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${ev.tabTitle || ""}</td>
                        <td class="small">${ev.url || ""}</td>
                        <td>${dur}</td>`;
        gmailReadBody.appendChild(tr);
      }
    }
    else if (ev.category === "odoo") {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${ev.app || ""}</td>
                      <td class="small">${ev.url || ""}</td>
                      <td>${dur}</td>`;
      odooBody.appendChild(tr);
    }
    else if (ev.category === "discord") {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${ev.type || ""}</td>
                      <td>${ev.name || ""}</td>
                      <td>${ev.tabTitle || ""}</td>
                      <td class="small">${ev.url || ""}</td>
                      <td>${dur}</td>`;
      discordBody.appendChild(tr);
    }
  });
});
