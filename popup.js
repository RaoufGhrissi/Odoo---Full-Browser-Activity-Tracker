chrome.storage.local.get("events", ({ events = [] }) => {
  const gmailBody = document.getElementById("gmailBody");
  const odooBody = document.getElementById("odooBody");
  const discordBody = document.getElementById("discordBody");

  events.forEach(ev => {
    const url = ev.url || "";
    const title = ev.title || "";
    const dur = ev.duration?.toFixed(1) || 0;

    // Gmail
    if (url.includes("mail.google.com/inbox")) {
      const details = ev.to ? `To: ${ev.to.join(", ")} CC: ${ev.cc?.join(", ")}` : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${ev.type}</td><td>${title}</td><td class="small">${url}</td><td class="small">${details}</td><td>${dur}</td>`;
      gmailBody.appendChild(tr);
    }

    // Odoo
    else if (url.includes("odoo.com")) {
      let project = "", task = "";
      const mProj = url.match(/project\/(\d+)/);
      const mTask = url.match(/tasks\/(\d+)/);
      if (mProj) project = mProj[1];
      if (mTask) task = mTask[1];
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>Odoo App</td><td>${title}</td><td class="small">${url}</td><td>${project}</td><td>${task}</td><td>${dur}</td>`;
      odooBody.appendChild(tr);
    }

    // Discord
    else if (url.includes("discord.com")) {
      let type = "unknown";
      let name = "";
      const parts = title.split(" | ").map(s => s.trim());
      if (parts[0] === "Discord") {
        if (parts[1]?.startsWith("@")) { type = "person"; name = parts[1]; }
        else if (parts[1]?.startsWith("#")) { type = "text_channel"; name = parts[1]; }
        else if (parts[1]?.startsWith('"')) { type = "thread"; name = parts[1]; }
        else { type = "voice_channel"; name = parts[1] || ""; }
      }
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${type}</td><td>${name}</td><td>${title}</td><td class="small">${url}</td><td>${dur}</td>`;
      discordBody.appendChild(tr);
    }
  });
});
