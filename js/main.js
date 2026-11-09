/* ==========================================================
   billDsmart – Interaktivität
   - Sprache DE/EN
   - Mobile Navigation
   - Treuhand-Demo (Meilensteine melden, freigeben, beanstanden)
   - Zielgruppen-Tabs
   - Gebührenrechner
   - Kontaktformular
   ========================================================== */

/* ---------- Einstellungen: hier anpassen ---------- */
const CONFIG = {
  // Formspree-Endpunkt (z. B. "https://formspree.io/f/abcdwxyz").
  // Leer lassen: Das Formular öffnet dann das E-Mail-Programm.
  FORM_ENDPOINT: "",
  CONTACT_EMAIL: "contact@billDsmart.ch",
  FEE_RATE: 0.003, // 0,3 %
};

/* ---------- Texte für dynamische Inhalte ---------- */
const TEXT = {
  de: {
    title: "billDsmart – Sichere Zahlungen am Bau",
    milestones: ["Rohbau", "Dach und Fassade", "Elektro und Sanitär", "Innenausbau", "Schlussabnahme"],
    status: {
      open: "Offen – Unternehmer arbeitet",
      reported: "Fertig gemeldet – wartet auf Freigabe",
      disputed: "Beanstandet – Betrag bleibt im Treuhand",
      paid: "Ausbezahlt",
    },
    actions: {
      report: "Fertig melden",
      release: "Freigeben",
      dispute: "Beanstanden",
      fix: "Nachbesserung melden",
    },
    actionHints: {
      report: "als Unternehmer",
      release: "als Bauherrschaft",
      dispute: "als Bauherrschaft",
      fix: "als Unternehmer",
    },
    log: {
      start: "Die Bauherrschaft hat {total} auf das Treuhandkonto der Partnerbank eingezahlt.",
      report: "{name}: Der Unternehmer meldet die Arbeit als fertig. Die Bauherrschaft prüft jetzt.",
      release: "{name}: freigegeben. Die Partnerbank überweist {amount} an den Unternehmer.",
      dispute: "{name}: beanstandet. {amount} bleiben auf dem Treuhandkonto, bis sich beide einigen.",
      fix: "{name}: Nachbesserung gemeldet. Die Bauherrschaft prüft erneut.",
      done: "Alle Meilensteine sind abgenommen und ausbezahlt. Das Projekt ist abgeschlossen.",
    },
    shareOut: "{n} %",
    login: {
      missing: "Bitte geben Sie E-Mail und Passwort ein.",
      wrong: "E-Mail oder Passwort stimmt nicht. Nutzen Sie einen der Demo-Zugänge unten.",
      toApp: "Zur Plattform",
    },
    form: {
      nameMissing: "Bitte geben Sie Ihren Namen ein.",
      emailMissing: "Bitte geben Sie eine gültige E-Mail-Adresse ein, z. B. name@firma.ch.",
      roleMissing: "Bitte wählen Sie aus, wer Sie sind.",
      sending: "Anfrage wird gesendet …",
      success: "Danke. Ihre Anfrage ist bei uns eingegangen. Wir melden uns bei Ihnen.",
      mailto: "Ihr E-Mail-Programm öffnet sich mit der vorbereiteten Anfrage. Senden Sie sie dort ab.",
      error: "Die Anfrage konnte nicht gesendet werden. Schreiben Sie uns direkt an {email}.",
      subject: "Demo-Anfrage billDsmart",
    },
  },
  en: {
    title: "billDsmart – Secure construction payments",
    milestones: ["Structural work", "Roof and façade", "Electrical and plumbing", "Interior finishing", "Final acceptance"],
    status: {
      open: "Open – contractor at work",
      reported: "Marked as done – awaiting approval",
      disputed: "Disputed – amount stays in escrow",
      paid: "Paid out",
    },
    actions: {
      report: "Mark as done",
      release: "Approve",
      dispute: "Dispute",
      fix: "Report rework",
    },
    actionHints: {
      report: "as contractor",
      release: "as client",
      dispute: "as client",
      fix: "as contractor",
    },
    log: {
      start: "The client has deposited {total} into the partner bank's escrow account.",
      report: "{name}: the contractor marks the work as done. The client is reviewing it now.",
      release: "{name}: approved. The partner bank transfers {amount} to the contractor.",
      dispute: "{name}: disputed. {amount} stays in escrow until both parties agree.",
      fix: "{name}: rework reported. The client is reviewing it again.",
      done: "All milestones are approved and paid. The project is complete.",
    },
    shareOut: "{n}%",
    login: {
      missing: "Please enter your email and password.",
      wrong: "Email or password is incorrect. Use one of the demo accounts below.",
      toApp: "Go to platform",
    },
    form: {
      nameMissing: "Please enter your name.",
      emailMissing: "Please enter a valid email address, e.g. name@company.ch.",
      roleMissing: "Please choose who you are.",
      sending: "Sending your request …",
      success: "Thank you. We have received your request and will get back to you.",
      mailto: "Your email app opens with the prepared request. Send it from there.",
      error: "Your request couldn't be sent. Email us directly at {email}.",
      subject: "billDsmart demo request",
    },
  },
};

const chf = (value) => "CHF " + new Intl.NumberFormat(lang === "en" ? "en-GB" : "de-CH", { maximumFractionDigits: 0 }).format(Math.round(value));
const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));

let lang = "de";
const t = () => TEXT[lang];

/* ---------- Sprache ---------- */
function setLang(next) {
  lang = next === "en" ? "en" : "de";
  document.documentElement.lang = lang;
  document.title = t().title;
  document.querySelectorAll("[data-set-lang]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.setLang === lang));
  });
  document.querySelectorAll("option[data-de]").forEach((opt) => {
    opt.textContent = opt.dataset[lang];
  });
  try { localStorage.setItem("billDsmart-lang", lang); } catch (e) { /* Speicher nicht verfügbar */ }
  renderDemo();
  updateCalc();
}

function initLang() {
  let stored = null;
  try { stored = localStorage.getItem("billDsmart-lang"); } catch (e) { /* ignorieren */ }
  document.querySelectorAll("[data-set-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.setLang));
  });
  setLang(stored || "de"); // Standard: Deutsch
}

/* ---------- Navigation ---------- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;
  const close = () => { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); };
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
  });
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

/* ---------- Treuhand-Demo ---------- */
const AMOUNTS = [420000, 210000, 260000, 230000, 80000];
const TOTAL = AMOUNTS.reduce((a, b) => a + b, 0);
let demoState = AMOUNTS.map(() => "open");
let lastEvent = { type: "start" };
let justPaid = -1;

function demoAction(index, action) {
  const transitions = {
    report: ["open", "reported"],
    release: ["reported", "paid"],
    dispute: ["reported", "disputed"],
    fix: ["disputed", "reported"],
  };
  const [from, to] = transitions[action];
  if (demoState[index] !== from) return;
  demoState[index] = to;
  justPaid = action === "release" ? index : -1;
  lastEvent = demoState.every((s) => s === "paid") ? { type: "done" } : { type: action, index };
  renderDemo();
  // Fokus auf die nächste sinnvolle Aktion setzen (Tastaturbedienung)
  const next = document.querySelector(`.milestone[data-index="${index}"] .ms-btn`) ||
               document.querySelector(".milestone:not(.is-paid) .ms-btn");
  if (next) next.focus({ preventScroll: true });
}

function renderDemo() {
  const list = document.getElementById("milestones");
  const bar = document.getElementById("bar");
  if (!list || !bar) return;
  const tx = t();

  const paid = AMOUNTS.reduce((sum, a, i) => sum + (demoState[i] === "paid" ? a : 0), 0);
  document.getElementById("escrow-amount").textContent = chf(TOTAL - paid);
  document.getElementById("paid-amount").textContent = chf(paid);
  document.getElementById("total-amount").textContent = chf(TOTAL);

  bar.innerHTML = AMOUNTS.map((a, i) =>
    `<div class="seg is-${demoState[i]}${i === justPaid ? " just-paid" : ""}" style="flex-grow:${a}"></div>`
  ).join("");

  const actionsFor = {
    open: ["report"],
    reported: ["release", "dispute"],
    disputed: ["fix"],
    paid: [],
  };
  const btnClass = { report: "ms-btn-primary", release: "ms-btn-primary", dispute: "ms-btn-warn", fix: "" };

  list.innerHTML = AMOUNTS.map((a, i) => {
    const state = demoState[i];
    const buttons = actionsFor[state].map((act) =>
      `<button type="button" class="ms-btn ${btnClass[act]}" data-index="${i}" data-action="${act}"
         aria-label="${tx.actions[act]} (${tx.actionHints[act]}): ${tx.milestones[i]}"
         title="${tx.actionHints[act]}">${tx.actions[act]}</button>`
    ).join("");
    return `<li class="milestone is-${state}" data-index="${i}">
      <span class="ms-name">${tx.milestones[i]}<span class="ms-amount">${chf(a)}</span></span>
      <span class="ms-status">${tx.status[state]}</span>
      <span class="ms-actions">${buttons}</span>
    </li>`;
  }).join("");

  const log = document.getElementById("demo-log");
  const ev = lastEvent;
  const vars = ev.index !== undefined ? { name: tx.milestones[ev.index], amount: chf(AMOUNTS[ev.index]) } : { total: chf(TOTAL) };
  log.textContent = fill(tx.log[ev.type], vars);
}

function initDemo() {
  const list = document.getElementById("milestones");
  if (!list) return;
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".ms-btn");
    if (!btn) return;
    demoAction(Number(btn.dataset.index), btn.dataset.action);
  });
  document.getElementById("demo-reset").addEventListener("click", () => {
    demoState = AMOUNTS.map(() => "open");
    lastEvent = { type: "start" };
    justPaid = -1;
    renderDemo();
  });
  renderDemo();
}

/* ---------- Tabs ---------- */
function initTabs() {
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  if (!tabs.length) return;
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      let next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next); next.focus(); }
    });
  });
}

/* ---------- Gebührenrechner ---------- */
function updateCalc() {
  const volumeInput = document.getElementById("calc-volume");
  if (!volumeInput) return;
  const volume = Math.max(0, Number(volumeInput.value) || 0);
  const choice = document.querySelector('input[name="split"]:checked').value;
  const customShare = Number(document.getElementById("calc-share").value);
  const clientShare = choice === "custom" ? customShare : Number(choice);

  document.getElementById("custom-split").hidden = choice !== "custom";
  document.getElementById("share-out").textContent = fill(t().shareOut, { n: customShare });

  const fee = volume * CONFIG.FEE_RATE;
  const client = fee * clientShare / 100;
  document.getElementById("fee-total").textContent = chf(fee);
  document.getElementById("fee-client").textContent = chf(client);
  document.getElementById("fee-contractor").textContent = chf(fee - client);
}

function initCalc() {
  const volume = document.getElementById("calc-volume");
  const range = document.getElementById("calc-range");
  if (!volume || !range) return;
  volume.addEventListener("input", () => {
    range.value = Math.min(Number(range.max), Math.max(Number(range.min), Number(volume.value) || 0));
    updateCalc();
  });
  range.addEventListener("input", () => { volume.value = range.value; updateCalc(); });
  document.querySelectorAll('input[name="split"]').forEach((r) => r.addEventListener("change", updateCalc));
  document.getElementById("calc-share").addEventListener("input", updateCalc);
  updateCalc();
}

/* ---------- Kontaktformular ---------- */
function initForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = document.getElementById("form-status");
  const role = document.getElementById("cf-role");

  // "Premium anfragen" wählt automatisch "Generalunternehmer"
  document.querySelectorAll("[data-role-preset]").forEach((link) => {
    link.addEventListener("click", () => { role.value = link.dataset.rolePreset; });
  });

  const setError = (id, msg) => {
    const input = document.getElementById(id);
    const err = document.getElementById(id + "-error");
    input.closest(".field").classList.toggle("has-error", Boolean(msg));
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg) input.setAttribute("aria-describedby", id + "-error"); else input.removeAttribute("aria-describedby");
    if (err) err.textContent = msg || "";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tx = t().form;
    const data = Object.fromEntries(new FormData(form).entries());
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email || "");

    setError("cf-name", data.name.trim() ? "" : tx.nameMissing);
    setError("cf-email", emailOk ? "" : tx.emailMissing);
    setError("cf-role", data.role ? "" : tx.roleMissing);

    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid) { firstInvalid.focus(); status.textContent = ""; return; }

    const roleLabel = role.options[role.selectedIndex].textContent;
    status.className = "form-status";

    if (!CONFIG.FORM_ENDPOINT) {
      const body = [
        `Name: ${data.name}`,
        `Firma: ${data.company || "-"}`,
        `E-Mail: ${data.email}`,
        `Rolle: ${roleLabel}`,
        "",
        data.message || "",
      ].join("\n");
      window.location.href = `mailto:${CONFIG.CONTACT_EMAIL}?subject=${encodeURIComponent(tx.subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = tx.mailto;
      status.classList.add("is-success");
      return;
    }

    status.textContent = tx.sending;
    try {
      const res = await fetch(CONFIG.FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...data, role: roleLabel, _subject: tx.subject }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.textContent = tx.success;
      status.classList.add("is-success");
    } catch (err) {
      status.textContent = fill(tx.error, { email: CONFIG.CONTACT_EMAIL });
      status.classList.add("is-error");
    }
  });
}

/* ---------- Ablauf mit Handy-Mockup ---------- */
function initLifecycle() {
  const steps = Array.from(document.querySelectorAll(".lc-step"));
  const views = document.querySelectorAll(".phone-view");
  if (!steps.length) return;
  const show = (n) => {
    steps.forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.step === n)));
    views.forEach((v) => { v.hidden = v.dataset.view !== n; });
  };
  steps.forEach((s) => s.addEventListener("click", () => show(s.dataset.step)));
}

/* ---------- Login ---------- */
function initLogin() {
  const dialog = document.getElementById("login-dialog");
  if (!dialog || typeof Auth === "undefined") return;
  const form = document.getElementById("login-form");
  const email = document.getElementById("login-email");
  const pw = document.getElementById("login-password");
  const err = document.getElementById("login-error");

  const open = () => {
    const s = Auth.session();
    if (s) { window.location.href = "app.html"; return; }
    err.textContent = "";
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    email.focus();
  };
  const close = () => { if (dialog.open) dialog.close(); };

  document.querySelectorAll("[data-open-login]").forEach((b) => b.addEventListener("click", open));
  dialog.querySelector("[data-close-login]").addEventListener("click", close);
  dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
  dialog.querySelectorAll("[data-fill]").forEach((b) => b.addEventListener("click", () => {
    email.value = b.dataset.fill; pw.value = b.dataset.pw; err.textContent = "";
    form.querySelector(".login-submit").focus();
  }));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!email.value.trim() || !pw.value) { err.textContent = t().login.missing; return; }
    const s = Auth.login(email.value, pw.value);
    if (!s) { err.textContent = t().login.wrong; pw.select(); return; }
    window.location.href = "app.html";
  });
  if (location.hash === "#login") open();
  window.addEventListener("hashchange", () => { if (location.hash === "#login") open(); });
}

/* ---------- Start ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  initNav();
  initDemo();
  initTabs();
  initCalc();
  initForm();
  initLifecycle();
  initLogin();
  initLang();
});
