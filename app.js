// ===== GraphicSuite Pro : app.js (version améliorée) =====
const STORAGE_KEY = "graphicsuite_data";
const STATUSES = {
  todo: "À faire",
  "in-progress": "En cours",
  review: "En révision",
  done: "Livré & payé",
};
const TEMPLATES = [
  "classic",
  "modern",
  "minimal",
  "elegant",
  "bold",
  "corporate",
];
const TEMPLATE_LABELS = {
  classic: "Classique",
  modern: "Moderne",
  minimal: "Minimaliste",
  elegant: "Élégant",
  bold: "Créatif",
  corporate: "Corporate",
};
const CURRENCIES = { FCFA: "FCFA", EUR: "€", USD: "$" };

const defaultState = () => ({
  currency: "FCFA",
  docTemplate: "classic",
  docAccent: "#d4af37",
  company: {
    name: "STUDIO CREATIVE",
    tagline: "Infographie & Graphic Design",
    contact: "Dakar, Sénégal | contact@studiocreative.sn",
    legal: "",
    logo: "",
    vatEnabled: false,
    vatRate: 18,
  },
  counters: { DEVIS: 0, FACTURE: 0 },
  clients: [
    {
      id: "1",
      name: "Tech Solutions",
      email: "contact@techsol.sn",
      phone: "+221 77 123 45 67",
    },
    {
      id: "2",
      name: "Restaurant Le Lagon",
      email: "info@lelagon.sn",
      phone: "+221 77 987 65 43",
    },
  ],
  projects: [
    {
      id: "p1",
      title: "Refonte Logo & Charte",
      clientId: "1",
      type: "Logo / Identité Visuelle",
      price: 150000,
      status: "in-progress",
      deadline: "2026-11-20",
    },
    {
      id: "p2",
      title: "Menu Plastifié A4",
      clientId: "2",
      type: "Flyer / Affiche",
      price: 45000,
      status: "done",
      deadline: "2026-11-02",
    },
  ],
});

let state = defaultState();

// ---------- Utilitaires ----------
const expensesOf = (p) => (Array.isArray(p.expenses) ? p.expenses : []);
const sumExpenses = (p) =>
  expensesOf(p).reduce((s, e) => s + (Number(e.amount) || 0), 0);
let expenseProjectId = null;
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);
const clientOf = (id) => state.clients.find((c) => c.id === id);

// Protège contre l'injection HTML (XSS) : à utiliser sur toute donnée saisie
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

function formatMoney(amount) {
  const n = new Intl.NumberFormat("fr-FR").format(Number(amount) || 0);
  return `${n} ${CURRENCIES[state.currency] || state.currency}`;
}

// ---------- Persistance ----------
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      saved &&
      Array.isArray(saved.clients) &&
      Array.isArray(saved.projects)
    ) {
      state = {
        ...defaultState(),
        ...saved,
        counters: { ...defaultState().counters, ...saved.counters },
        company: { ...defaultState().company, ...saved.company },
      };
    }
  } catch (e) {
    console.error("Erreur de chargement des données", e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    alert("Impossible d'enregistrer les données (stockage plein ou bloqué).");
  }
  renderAll();
}

// ---------- Navigation ----------
const TITLES = {
  dashboard: ["Tableau de bord", "Aperçu général de votre activité créative"],
  expenses: ["Dépenses", "Suivez ce que chaque projet vous coûte"],
  projects: ["Projets & Kanban", "Gérez l'avancement de vos travaux"],
  clients: ["Répertoire Clients", "Vos contacts et leur historique d'achats"],
  billing: [
    "Devis & Facturation",
    "Éditez des documents professionnels imprimables",
  ],
};

function switchView(viewId) {
  document
    .querySelectorAll(".view")
    .forEach((v) =>
      v.classList.toggle("active-view", v.id === `view-${viewId}`),
    );
  document
    .querySelectorAll(".nav-btn[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === viewId));
  if (TITLES[viewId]) {
    $("page-title").textContent = TITLES[viewId][0];
    $("page-subtitle").textContent = TITLES[viewId][1];
  }
}

// ---------- Rendu ----------
function renderAll() {
  renderDashboard();
  renderKanban();
  renderClients();
  populateClientDropdowns();
  renderBrand();
  renderExpensesView();
  populateExpenseProjects();
  $("vat-group").hidden = !state.company.vatEnabled;
  updateInvoicePreview();
}

function renderDashboard() {
  const done = state.projects.filter((p) => p.status === "done");
  const open = state.projects.filter((p) => p.status !== "done");
  const sum = (list) => list.reduce((s, p) => s + Number(p.price || 0), 0);

  $("stat-revenue").textContent = formatMoney(sum(done));
  $("stat-active").textContent = open.length;
  $("stat-completed").textContent = done.length;
  $("stat-clients").textContent = state.clients.length;
  const totalExp = state.projects.reduce((s, p) => s + sumExpenses(p), 0);
  const profit = sum(done) - totalExp;
  $("stat-expenses").textContent = formatMoney(totalExp);
  $("stat-profit").textContent = formatMoney(profit);
  $("stat-profit").style.color = profit < 0 ? "var(--accent-red)" : "";
  if ($("stat-pending")) $("stat-pending").textContent = formatMoney(sum(open));

  $("recent-projects-tbody").innerHTML =
    state.projects
      .slice(-5)
      .reverse()
      .map((p) => {
        const c = clientOf(p.clientId);
        return `<tr>
      <td><strong>${esc(p.title)}</strong></td>
      <td>${esc(c ? c.name : "Inconnu")}</td>
      <td>${esc(p.type)}</td>
      <td>${formatMoney(p.price)}</td>
      <td><span class="badge badge-${esc(p.status)}">${STATUSES[p.status] || esc(p.status)}</span></td>
    </tr>`;
      })
      .join("") ||
    '<tr><td colspan="5" class="empty-hint">Aucun projet pour le moment</td></tr>';
}

function deadlineHTML(p) {
  if (!p.deadline) return "";
  const late = p.status !== "done" && p.deadline < today();
  const label = new Date(p.deadline).toLocaleDateString("fr-FR");
  return `<div class="card-deadline ${late ? "late" : ""}"><i class="fa-regular fa-calendar"></i> ${label}${late ? " · En retard" : ""}</div>`;
}

function cardHTML(p, clientName) {
  const options = Object.entries(STATUSES)
    .map(
      ([k, v]) =>
        `<option value="${k}" ${p.status === k ? "selected" : ""}>${v}</option>`,
    )
    .join("");
  return `<div class="project-card" draggable="true" data-id="${esc(p.id)}">
    <div class="card-tag">${esc(p.type)}</div>
    <h5>${esc(p.title)}</h5>
    <div class="card-client"><i class="fa-regular fa-building"></i> ${esc(clientName)}</div>
    ${deadlineHTML(p)}
    <div class="card-finance">Dépenses : ${formatMoney(sumExpenses(p))} · Marge : <strong class="${Number(p.price || 0) - sumExpenses(p) < 0 ? "neg" : ""}">${formatMoney(Number(p.price || 0) - sumExpenses(p))}</strong></div>
    <div class="card-footer">
      <span class="card-price">${formatMoney(p.price)}</span>
      <div class="card-actions">
        <select class="status-select" data-id="${esc(p.id)}">${options}</select>
      </div>
    </div>
    <div class="card-buttons">
      <button class="btn btn-secondary btn-sm btn-expenses" data-action="expenses-project" data-id="${esc(p.id)}"><i class="fa-solid fa-wallet"></i> Dépenses</button>
      <button class="btn-icon" data-action="invoice-project" data-id="${esc(p.id)}" title="Créer un devis/facture"><i class="fa-solid fa-file-invoice"></i></button>
      <button class="btn-icon" data-action="edit-project" data-id="${esc(p.id)}" title="Modifier"><i class="fa-solid fa-pen"></i></button>
      <button class="btn-icon" data-action="delete-project" data-id="${esc(p.id)}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}

function renderKanban() {
  const q = $("filter-search").value.trim().toLowerCase();
  const type = $("filter-type").value;
  const cols = Object.fromEntries(Object.keys(STATUSES).map((s) => [s, []]));

  state.projects.forEach((p) => {
    const name = clientOf(p.clientId)?.name || "Client inconnu";
    const match =
      p.title.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    if (match && (type === "all" || p.type === type) && cols[p.status])
      cols[p.status].push({ p, name });
  });

  Object.entries(cols).forEach(([status, items]) => {
    $(`count-${status}`).textContent = items.length;
    $(`cards-${status}`).innerHTML =
      items.map(({ p, name }) => cardHTML(p, name)).join("") ||
      '<p class="empty-hint">Aucun projet</p>';
  });
}

function renderClients() {
  $("clients-tbody").innerHTML =
    state.clients
      .map((c) => {
        const list = state.projects.filter((p) => p.clientId === c.id);
        const spent = list
          .filter((p) => p.status === "done")
          .reduce((s, p) => s + Number(p.price || 0), 0);
        return `<tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.email) || "-"}</td>
      <td>${esc(c.phone) || "-"}</td>
      <td><span class="count-badge">${list.length} projet${list.length > 1 ? "s" : ""}</span></td>
      <td><strong>${formatMoney(spent)}</strong></td>
      <td><button class="btn-icon" data-action="delete-client" data-id="${esc(c.id)}" title="Supprimer"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`;
      })
      .join("") ||
    '<tr><td colspan="6" class="empty-hint">Aucun client. Ajoutez-en un pour commencer.</td></tr>';
}

function populateClientDropdowns() {
  ["project-client", "doc-client"].forEach((id) => {
    const select = $(id);
    if (!select) return;
    const current = select.value;
    select.innerHTML =
      '<option value="">Sélectionner un client</option>' +
      state.clients
        .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
        .join("");
    select.value = state.clients.some((c) => c.id === current) ? current : "";
  });
}

// ---------- Actions projets / clients ----------
function updateProjectStatus(id, status) {
  const p = state.projects.find((x) => x.id === id);
  if (p && STATUSES[status]) {
    p.status = status;
    saveState();
  }
}

function openProjectModal(id = null) {
  if (!state.clients.length) {
    alert("Ajoutez d'abord un client.");
    $("modal-client").classList.add("active");
    return;
  }
  const form = $("form-project");
  form.reset();
  $("project-id").value = id || "";
  $("modal-project-title").textContent = id
    ? "Modifier le projet"
    : "Nouveau Projet";
  if (id) {
    const p = state.projects.find((x) => x.id === id);
    if (!p) return;
    $("project-name").value = p.title;
    $("project-client").value = p.clientId;
    $("project-type").value = p.type;
    $("project-price").value = p.price;
    $("project-status").value = p.status;
    $("project-deadline").value = p.deadline || "";
  }
  $("modal-project").classList.add("active");
}

function closeModals() {
  document
    .querySelectorAll(".modal")
    .forEach((m) => m.classList.remove("active"));
}

function deleteProject(id) {
  if (confirm("Voulez-vous vraiment supprimer ce projet ?")) {
    state.projects = state.projects.filter((p) => p.id !== id);
    saveState();
  }
}

function deleteClient(id) {
  if (
    confirm(
      "Supprimer ce client supprimera aussi ses projets rattachés. Continuer ?",
    )
  ) {
    state.clients = state.clients.filter((c) => c.id !== id);
    state.projects = state.projects.filter((p) => p.clientId !== id);
    saveState();
  }
}

// ---------- Dépenses par projet ----------
function renderExpenses() {
  const p = state.projects.find((x) => x.id === expenseProjectId);
  if (!p) return;
  const total = sumExpenses(p);
  const margin = Number(p.price || 0) - total;
  $("expenses-title").textContent = `Dépenses : ${p.title}`;
  $("expenses-summary").innerHTML =
    `Prix convenu : <strong>${formatMoney(p.price)}</strong> · Dépenses : <strong>${formatMoney(total)}</strong> · Marge : <strong class="${margin < 0 ? "neg" : ""}">${formatMoney(margin)}</strong>`;
  $("expenses-list").innerHTML =
    expensesOf(p)
      .map(
        (e) => `<li>
      <span>${esc(e.label)}<small>${e.date ? new Date(e.date).toLocaleDateString("fr-FR") : ""}</small></span>
      <strong>${formatMoney(e.amount)}</strong>
      <button type="button" class="btn-icon" data-action="delete-expense" data-id="${esc(e.id)}" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
    </li>`,
      )
      .join("") || '<li class="empty-hint">Aucune dépense enregistrée</li>';
}

function populateExpenseProjects() {
  const sel = $("expense-project");
  sel.innerHTML = state.projects
    .map((p) => `<option value="${esc(p.id)}">${esc(p.title)}</option>`)
    .join("");
  if (state.projects.some((p) => p.id === expenseProjectId))
    sel.value = expenseProjectId;
}

function renderExpensesView() {
  const rows = [];
  state.projects.forEach((p) =>
    expensesOf(p).forEach((e) => rows.push({ p, e })),
  );
  rows.sort((a, b) => (b.e.date || "").localeCompare(a.e.date || ""));
  $("expenses-tbody").innerHTML =
    rows
      .map(
        ({ p, e }) => `<tr>
      <td>${e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "-"}</td>
      <td>${esc(p.title)}</td>
      <td>${esc(e.label)}</td>
      <td><strong>${formatMoney(e.amount)}</strong></td>
      <td><button class="btn-icon" data-action="delete-expense" data-id="${esc(e.id)}" data-project="${esc(p.id)}" title="Supprimer"><i class="fa-solid fa-trash"></i></button></td>
    </tr>`,
      )
      .join("") ||
    '<tr><td colspan="5" class="empty-hint">Aucune dépense. Cliquez sur « Ajouter une dépense ».</td></tr>';
  $("expenses-total").textContent = formatMoney(
    rows.reduce((s, r) => s + (Number(r.e.amount) || 0), 0),
  );
}

function openExpenses(id) {
  if (!state.projects.length) return alert("Créez d'abord un projet.");
  expenseProjectId = id || state.projects[0].id;
  populateExpenseProjects();
  $("form-expense").reset();
  $("expense-date").value = today();
  renderExpenses();
  $("modal-expenses").classList.add("active");
}

// ---------- Devis & Factures ----------
function nextDocNumber(type) {
  const n = String((state.counters[type] || 0) + 1).padStart(3, "0");
  return `${type === "FACTURE" ? "FAC" : "DEV"}-${new Date().getFullYear()}-${n}`;
}

function addInvoiceRow(desc = "", qty = 1, price = 0) {
  const row = document.createElement("div");
  row.className = "invoice-item-row";
  row.innerHTML = `
    <input type="text" placeholder="Description du service" class="item-desc" required value="${esc(desc)}">
    <input type="number" placeholder="Qté" class="item-qty" value="${Number(qty)}" min="1" required>
    <input type="number" placeholder="Prix Unitaire" class="item-price" value="${Number(price)}" min="0" required>
    <button type="button" class="btn-icon remove-item" title="Supprimer la ligne"><i class="fa-solid fa-trash"></i></button>`;
  $("invoice-items").appendChild(row);
}

function invoiceFromProject(id) {
  const p = state.projects.find((x) => x.id === id);
  if (!p) return;
  switchView("billing");
  $("invoice-items").innerHTML = "";
  addInvoiceRow(`${p.title} (${p.type})`, 1, p.price);
  $("doc-client").value = p.clientId;
  updateInvoicePreview();
}

function computeTotals() {
  let ht = 0;
  document.querySelectorAll(".invoice-item-row").forEach((row) => {
    ht +=
      (Number(row.querySelector(".item-qty").value) || 0) *
      (Number(row.querySelector(".item-price").value) || 0);
  });
  const c = state.company;
  const useVat = !!c.vatEnabled && $("doc-vat").checked;
  const rate = useVat ? Number(c.vatRate) || 0 : 0;
  const vat = Math.round((ht * rate) / 100);
  const ttc = ht + vat;
  const val = Number($("doc-deposit").value) || 0;
  const raw =
    $("doc-deposit-mode").value === "percent"
      ? Math.round((ttc * val) / 100)
      : val;
  const deposit = Math.min(Math.max(raw, 0), ttc);
  return { ht, rate, useVat, vat, ttc, deposit, rest: ttc - deposit };
}

function renderBrand() {
  const c = state.company;
  const logo = (c.logo || "").startsWith("data:image/")
    ? `<img class="brand-logo" src="${esc(c.logo)}" alt="Logo">`
    : "";
  $("preview-brand").innerHTML =
    logo +
    `<h2>${esc(c.name)}</h2>` +
    (c.tagline ? `<p>${esc(c.tagline)}</p>` : "") +
    (c.contact ? `<p class="small-text">${esc(c.contact)}</p>` : "") +
    (c.legal ? `<p class="small-text">${esc(c.legal)}</p>` : "");
}

function updateInvoicePreview() {
  const accent = /^#[0-9a-f]{6}$/i.test(state.docAccent)
    ? state.docAccent
    : "#d4af37";
  $("invoice-paper").style.setProperty("--doc-accent", accent);
  document
    .querySelectorAll(".tpl-card")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.tpl === state.docTemplate),
    );
  $("invoice-paper").dataset.template = TEMPLATES.includes(state.docTemplate)
    ? state.docTemplate
    : "classic";
  const type = $("doc-type").value;
  const date = $("doc-date").value;
  const client = clientOf($("doc-client").value);

  $("preview-doc-type").textContent = type;
  $("preview-doc-number").textContent = $("doc-number").value;
  $("preview-doc-date").textContent = date
    ? new Date(date).toLocaleDateString("fr-FR")
    : "";
  $("preview-notes").textContent = $("doc-notes").value;
  $("preview-client-name").textContent = client ? client.name : "Nom du Client";
  $("preview-client-email").textContent = client?.email || "";
  $("preview-client-phone").textContent = client?.phone || "";

  $("preview-items-tbody").innerHTML = [
    ...document.querySelectorAll(".invoice-item-row"),
  ]
    .map((row) => {
      const desc =
        row.querySelector(".item-desc").value || "Prestation sans nom";
      const qty = Number(row.querySelector(".item-qty").value) || 0;
      const price = Number(row.querySelector(".item-price").value) || 0;
      return `<tr>
      <td>${esc(desc)}</td>
      <td class="text-center">${qty}</td>
      <td class="text-right">${formatMoney(price)}</td>
      <td class="text-right">${formatMoney(qty * price)}</td>
    </tr>`;
    })
    .join("");

  const t = computeTotals();
  const rows = [];
  if (t.useVat) {
    rows.push(
      ["Total HT", t.ht],
      [`TVA (${t.rate} %)`, t.vat],
      ["TOTAL TTC", t.ttc, "total"],
    );
  } else {
    rows.push(["TOTAL À PAYER", t.ttc, "total"]);
  }
  rows.push(["Acompte versé", -t.deposit], ["RESTE À PAYER", t.rest, "total"]);
  $("deposit-recap").innerHTML =
    `Total : <strong>${formatMoney(t.ttc)}</strong> · Acompte : <strong>${formatMoney(t.deposit)}</strong> · Reste à payer : <strong>${formatMoney(t.rest)}</strong>`;
  $("preview-summary").innerHTML = rows
    .map(
      ([label, amount, cls]) =>
        `<tr class="${cls || ""}"><td>${label}</td><td class="text-right">${amount < 0 ? "- " + formatMoney(-amount) : formatMoney(amount)}</td></tr>`,
    )
    .join("");
}

// ---------- Paramètres de la société ----------
let pendingLogo = "";

function showLogoPreview(src) {
  $("set-logo-preview").innerHTML =
    src && src.startsWith("data:image/")
      ? `<img src="${esc(src)}" alt="Logo">`
      : '<i class="fa-regular fa-image"></i>';
}

function openSettings() {
  const c = state.company;
  $("set-name").value = c.name;
  $("set-tagline").value = c.tagline;
  $("set-contact").value = c.contact;
  $("set-legal").value = c.legal;
  $("set-vat-enabled").checked = !!c.vatEnabled;
  $("set-vat-rate").value = c.vatRate;
  pendingLogo = c.logo || "";
  showLogoPreview(pendingLogo);
  $("modal-settings").classList.add("active");
}

// Redimensionne le logo (max 400 px) pour ne pas saturer le stockage local
function loadLogo(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 400 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale) || 1;
      canvas.height = Math.round(img.height * scale) || 1;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      pendingLogo = canvas.toDataURL("image/png");
      showLogoPreview(pendingLogo);
    };
    img.onerror = () =>
      alert("Image illisible. Essayez un fichier PNG ou JPG.");
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function saveSettings() {
  const wasVat = state.company.vatEnabled;
  state.company = {
    name: $("set-name").value.trim() || "Ma société",
    tagline: $("set-tagline").value.trim(),
    contact: $("set-contact").value.trim(),
    legal: $("set-legal").value.trim(),
    logo: pendingLogo,
    vatEnabled: $("set-vat-enabled").checked,
    vatRate: Math.min(100, Math.max(0, Number($("set-vat-rate").value) || 0)),
  };
  if (!wasVat && state.company.vatEnabled) $("doc-vat").checked = true;
  saveState();
  closeModals();
}

function printDocument() {
  const type = $("doc-type").value;
  if (!$("doc-client").value)
    return alert("Sélectionnez un client avant d’imprimer.");
  window.print();
  // Le numéro suivant est préparé après l'impression
  state.counters[type] = (state.counters[type] || 0) + 1;
  $("doc-number").value = nextDocNumber(type);
  saveState();
}

// ---------- Sauvegarde / restauration ----------
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `graphicsuite-sauvegarde-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.clients) || !Array.isArray(data.projects))
        throw new Error("format");
      if (
        !confirm(
          "Remplacer toutes les données actuelles par cette sauvegarde ?",
        )
      )
        return;
      state = {
        ...defaultState(),
        ...data,
        company: { ...defaultState().company, ...data.company },
      };
      $("currency-select").value = state.currency;
      saveState();
    } catch (e) {
      alert("Fichier invalide : sauvegarde GraphicSuite attendue.");
    }
  };
  reader.readAsText(file);
}

// ---------- Initialisation ----------
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  $("currency-select").value = state.currency;
  $("doc-date").valueAsDate = new Date();
  $("doc-number").value = nextDocNumber("DEVIS");
  renderAll();

  document
    .querySelectorAll(".nav-btn")
    .forEach((b) =>
      b.addEventListener("click", () => switchView(b.dataset.view)),
    );

  $("currency-select").addEventListener("change", (e) => {
    state.currency = e.target.value;
    saveState();
  });

  // Modales
  $("btn-quick-project").addEventListener("click", () => openProjectModal());
  $("btn-quick-client").addEventListener("click", () =>
    $("modal-client").classList.add("active"),
  );
  $("btn-add-client").addEventListener("click", () =>
    $("modal-client").classList.add("active"),
  );
  document
    .querySelectorAll(".close-modal, .close-modal-btn")
    .forEach((b) => b.addEventListener("click", closeModals));
  document.querySelectorAll(".modal").forEach((m) =>
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModals();
    }),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModals();
  });

  $("form-project").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      title: $("project-name").value.trim(),
      clientId: $("project-client").value,
      type: $("project-type").value,
      price: Number($("project-price").value) || 0,
      status: $("project-status").value,
      deadline: $("project-deadline").value,
    };
    const id = $("project-id").value;
    if (id) Object.assign(state.projects.find((p) => p.id === id) || {}, data);
    else state.projects.push({ id: "p_" + Date.now(), ...data });
    saveState();
    closeModals();
  });

  $("form-client").addEventListener("submit", (e) => {
    e.preventDefault();
    state.clients.push({
      id: "c_" + Date.now(),
      name: $("client-name").value.trim(),
      email: $("client-email").value.trim(),
      phone: $("client-phone").value.trim(),
    });
    saveState();
    closeModals();
    e.target.reset();
  });

  $("btn-add-expense").addEventListener("click", () => openExpenses());
  $("expense-project").addEventListener("change", (e) => {
    expenseProjectId = e.target.value;
    renderExpenses();
  });
  $("form-expense").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = state.projects.find((x) => x.id === expenseProjectId);
    if (!p) return;
    p.expenses = expensesOf(p);
    p.expenses.push({
      id: "e_" + Date.now(),
      label: $("expense-label").value.trim(),
      amount: Number($("expense-amount").value) || 0,
      date: $("expense-date").value,
    });
    saveState();
    renderExpenses();
    e.target.reset();
    $("expense-date").value = today();
  });

  // Filtres
  $("filter-search").addEventListener("input", renderKanban);
  $("filter-type").addEventListener("change", renderKanban);

  // Clics délégués (boutons générés dynamiquement)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === "edit-project") openProjectModal(id);
    if (action === "delete-project") deleteProject(id);
    if (action === "delete-client") deleteClient(id);
    if (action === "invoice-project") invoiceFromProject(id);
    if (action === "expenses-project") openExpenses(id);
    if (action === "delete-expense") {
      if (btn.dataset.project) expenseProjectId = btn.dataset.project;
      const p = state.projects.find((x) => x.id === expenseProjectId);
      if (p) {
        p.expenses = expensesOf(p).filter((x) => x.id !== id);
        saveState();
        renderExpenses();
      }
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.matches(".status-select"))
      updateProjectStatus(e.target.dataset.id, e.target.value);
  });

  // Glisser-déposer Kanban
  document.addEventListener("dragstart", (e) => {
    const card = e.target.closest?.(".project-card");
    if (card) e.dataTransfer.setData("text/plain", card.dataset.id);
  });
  document.querySelectorAll(".kanban-column").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      updateProjectStatus(
        e.dataTransfer.getData("text/plain"),
        col.dataset.status,
      );
    });
  });

  // Facturation
  $("btn-add-item").addEventListener("click", () => {
    addInvoiceRow();
    updateInvoicePreview();
  });
  $("invoice-items").addEventListener("click", (e) => {
    const rm = e.target.closest(".remove-item");
    if (!rm) return;
    if (document.querySelectorAll(".invoice-item-row").length > 1)
      rm.closest(".invoice-item-row").remove();
    updateInvoicePreview();
  });
  $("invoice-form").addEventListener("input", updateInvoicePreview);
  $("doc-client").addEventListener("change", updateInvoicePreview);
  $("doc-type").addEventListener("change", () => {
    $("doc-number").value = nextDocNumber($("doc-type").value);
    updateInvoicePreview();
  });
  $("btn-print").addEventListener("click", printDocument);

  // Paramètres société
  $("btn-settings").addEventListener("click", openSettings);
  $("btn-pick-logo").addEventListener("click", () => $("set-logo").click());
  $("set-logo").addEventListener("change", (e) => {
    loadLogo(e.target.files[0]);
    e.target.value = "";
  });
  $("btn-remove-logo").addEventListener("click", () => {
    pendingLogo = "";
    showLogoPreview("");
  });
  $("form-settings").addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings();
  });
  $("doc-vat").checked = !!state.company.vatEnabled;
  $("template-gallery").innerHTML = TEMPLATES.map(
    (t) =>
      `<button type="button" class="tpl-card" data-tpl="${t}"><span class="tpl-thumb tpl-${t}"><i></i><b></b><b></b></span><small>${TEMPLATE_LABELS[t]}</small></button>`,
  ).join("");
  $("template-gallery").addEventListener("click", (e) => {
    const b = e.target.closest(".tpl-card");
    if (b) {
      state.docTemplate = b.dataset.tpl;
      saveState();
    }
  });
  $("doc-accent").value = /^#[0-9a-f]{6}$/i.test(state.docAccent)
    ? state.docAccent
    : "#d4af37";
  $("doc-accent").addEventListener("input", (e) => {
    state.docAccent = e.target.value;
    saveState();
  });
  $("btn-reset-accent").addEventListener("click", () => {
    state.docAccent = "#d4af37";
    $("doc-accent").value = "#d4af37";
    saveState();
  });
  updateInvoicePreview();

  // Sauvegarde
  $("btn-export").addEventListener("click", exportData);
  $("btn-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", (e) => {
    importData(e.target.files[0]);
    e.target.value = "";
  });
});
