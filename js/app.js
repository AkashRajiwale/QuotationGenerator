/* Ak's Quotation Maker — fully client-side, no server, no build step. */

const $ = (id) => document.getElementById(id);

const LS_BUSINESS = "qm_business_v1";
const LS_DRAFT = "qm_draft_v1";
const LS_HISTORY = "qm_history_v1";
const LS_COUNTER = "qm_counter_v1";

const todayISO = () => new Date().toISOString().slice(0, 10);

/* Item catalog seeded from the reference estimate (Laxmi Garden Developments).
   Used to power the "type or pick" item dropdown — users can still type any
   new item name that isn't in this list. */
const ITEM_CATALOG = [
  { name: "Green drawf coconut 6 ft", price: 600 },
  { name: "Hapus mango 4ft", price: 400 },
  { name: "Kesar mango 4ft", price: 400 },
  { name: "Chadasa mango 3ft", price: 500 },
  { name: "Amrapali 3ft", price: 450 },
  { name: "Miyajaki 4ft", price: 1800 },
  { name: "Langada hapus 3ft", price: 400 },
  { name: "Chiku 3ft", price: 350 },
  { name: "Anar3ft", price: 220 },
  { name: "Sitaphal 4ft", price: 450 },
  { name: "Peru taiwan 3ft", price: 200 },
  { name: "Ramphal 5ft", price: 450 },
  { name: "Jackfruit 4ft", price: 700 },
  { name: "Neem 5ft", price: 150 },
  { name: "Moringa 2ft", price: 70 },
  { name: "Belpatta 5ft", price: 550 },
  { name: "Supari 6ft", price: 500 },
  { name: "Pimple 2ft", price: 120 },
  { name: "Lemon 3ft", price: 300 },
  { name: "Chinch 6ft", price: 600 },
  { name: "Kaju vengurla 4ft", price: 300 },
  { name: "Taiwan papaya 3ft", price: 120 },
  { name: "Keli 2ft", price: 90 },
  { name: "Avala 4ft", price: 300 },
  { name: "Fertilizer", price: 10000 },
  { name: "Lebour charge", price: 10000 },
  { name: "Transport charge", price: 11000 },
];

function filterCatalog(query) {
  const q = String(query || "").trim().toLowerCase();
  // Catalog is small (a couple dozen items) so show every match — the
  // dropdown scrolls — rather than hiding items past an arbitrary cutoff.
  return !q ? ITEM_CATALOG : ITEM_CATALOG.filter((it) => it.name.toLowerCase().includes(q));
}

function defaultBusiness() {
  return {
    name: "Laxmi Garden Developments",
    address: "At vasragaon post- kolad tal- roha dist- Raigad",
    phone: "7264950349",
    email: "dineshsanap2812@gmail.com",
    gstin: "",
    currency: "₹",
    logo: "",
    signature: "",
  };
}

/* Dummy-but-meaningful logo: a colored monogram built from the business
   name's initials, used whenever the user hasn't uploaded a real logo. */
function initialsFromName(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "QM";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
function defaultLogoDataUri(name) {
  const initials = initialsFromName(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
<rect width="120" height="120" rx="22" fill="#2f6f4f"/>
<text x="60" y="66" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700" fill="#ffffff">${initials}</text>
</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function blankItem() {
  return { name: "", hsn: "", qty: 1, price: 0 };
}

function defaultState(nextNo) {
  return {
    business: defaultBusiness(),
    docTitle: "Quotation",
    quoteNo: String(nextNo || 1),
    quoteDate: todayISO(),
    validUntil: "",
    client: { name: "", address: "", phone: "", email: "" },
    items: [blankItem()],
    showHsn: false,
    discountPct: 0,
    taxPct: 0,
    terms: "Thank you for doing business with us.",
    notes: "",
  };
}

function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Failed to parse", key, e);
    return null;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextCounter() {
  const n = parseInt(localStorage.getItem(LS_COUNTER) || "1", 10);
  return n;
}
function bumpCounter(current) {
  const n = parseInt(current, 10);
  if (!isNaN(n) && n >= nextCounter()) {
    localStorage.setItem(LS_COUNTER, String(n + 1));
  }
}

/* ============ Number to words (Indian numbering system) ============ */
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function segmentWords(n) {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  const rest = n % 100;
  return ONES[Math.floor(n / 100)] + " Hundred" + (rest ? " and " + segmentWords(rest) : "");
}

function integerToWordsIndian(num) {
  num = Math.floor(num);
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 1e7); num %= 1e7;
  const lakh = Math.floor(num / 1e5); num %= 1e5;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const rest = num;
  const parts = [];
  if (crore) parts.push(segmentWords(crore) + " Crore");
  if (lakh) parts.push(segmentWords(lakh) + " Lakh");
  if (thousand) parts.push(segmentWords(thousand) + " Thousand");
  if (rest) parts.push(segmentWords(rest));
  return parts.join(" ");
}

function amountToWords(amount, currencyLabel) {
  const rupees = Math.floor(amount + 1e-9);
  const paise = Math.round((amount - rupees) * 100);
  let words = integerToWordsIndian(rupees) + " " + currencyLabel;
  if (paise > 0) {
    words += " and " + integerToWordsIndian(paise) + " Paise";
  }
  return words + " only";
}

function currencyLabel(symbol) {
  if (symbol === "₹") return "Rupees";
  if (symbol === "$") return "Dollars";
  if (symbol === "€") return "Euros";
  if (symbol === "£") return "Pounds";
  return "Units";
}

function fmtMoney(amount, symbol) {
  const val = Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${val}`;
}

/* ============ State ============ */
let state = null;
let autosaveTimer = null;

function init() {
  const savedBusiness = loadJSON(LS_BUSINESS);
  const draft = loadJSON(LS_DRAFT);

  if (draft) {
    state = draft;
    if (savedBusiness) {
      state.business = { ...defaultBusiness(), ...savedBusiness };
    } else if (!state.business || !state.business.name || !state.business.name.trim()) {
      // Old draft from before default business details existed (or the name
      // was blanked out) — fall back to the built-in defaults instead of
      // leaving the business block empty forever.
      state.business = defaultBusiness();
    }
  } else {
    state = defaultState(nextCounter());
    if (savedBusiness) state.business = { ...defaultBusiness(), ...savedBusiness };
  }
  if (!state.items || state.items.length === 0) state.items = [blankItem()];

  bindStaticControls();
  populateFormFromState();
  renderItemsEditor();
  updatePreview();
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveJSON(LS_DRAFT, state);
    flashSaved("Draft saved");
  }, 500);
}

function flashSaved(text) {
  const el = $("saveIndicator");
  el.textContent = text || "Saved";
  el.classList.add("show");
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(() => el.classList.remove("show"), 1200);
}

/* ============ Bind simple inputs ============ */
function bindText(id, getter, setter) {
  const el = $(id);
  el.addEventListener("input", () => {
    setter(el.value);
    updatePreview();
    scheduleAutosave();
  });
}

function bindStaticControls() {
  bindText("bizName", null, (v) => (state.business.name = v));
  bindText("bizAddress", null, (v) => (state.business.address = v));
  bindText("bizPhone", null, (v) => (state.business.phone = v));
  bindText("bizEmail", null, (v) => (state.business.email = v));
  bindText("bizGstin", null, (v) => (state.business.gstin = v));
  bindText("currencySymbol", null, (v) => (state.business.currency = v || "₹"));

  bindText("quoteNo", null, (v) => (state.quoteNo = v));
  bindText("quoteDate", null, (v) => (state.quoteDate = v));
  bindText("validUntil", null, (v) => (state.validUntil = v));
  $("docTitle").addEventListener("change", (e) => {
    state.docTitle = e.target.value;
    updatePreview();
    scheduleAutosave();
  });

  bindText("clientName", null, (v) => (state.client.name = v));
  bindText("clientPhone", null, (v) => (state.client.phone = v));
  bindText("clientEmail", null, (v) => (state.client.email = v));
  bindText("clientAddress", null, (v) => (state.client.address = v));

  bindText("discountPct", null, (v) => (state.discountPct = parseFloat(v) || 0));
  bindText("taxPct", null, (v) => (state.taxPct = parseFloat(v) || 0));
  bindText("termsText", null, (v) => (state.terms = v));
  bindText("notesText", null, (v) => (state.notes = v));

  $("showHsn").addEventListener("change", (e) => {
    state.showHsn = e.target.checked;
    applyHsnVisibility();
    updatePreview();
    scheduleAutosave();
  });

  $("addItemBtn").addEventListener("click", () => {
    state.items.push(blankItem());
    renderItemsEditor();
    updatePreview();
    scheduleAutosave();
    const rows = document.querySelectorAll("#itemsBody .item-name-input");
    if (rows.length) rows[rows.length - 1].focus();
  });

  $("bizLogoInput").addEventListener("change", (e) => handleImageUpload(e, "logo"));
  $("signatureInput").addEventListener("change", (e) => handleImageUpload(e, "signature"));
  $("removeLogoBtn").addEventListener("click", () => {
    state.business.logo = "";
    $("bizLogoInput").value = "";
    refreshImagePreviews();
    updatePreview();
    scheduleAutosave();
  });
  $("removeSignatureBtn").addEventListener("click", () => {
    state.business.signature = "";
    $("signatureInput").value = "";
    refreshImagePreviews();
    updatePreview();
    scheduleAutosave();
  });

  $("saveDraftBtn").addEventListener("click", saveQuotation);
  $("clearFormBtn").addEventListener("click", clearForm);
  $("newQuoteBtn").addEventListener("click", startNewQuotation);
  $("printBtn").addEventListener("click", () => window.print());

  $("historyBtn").addEventListener("click", openHistory);
  $("closeHistoryBtn").addEventListener("click", closeHistory);
  $("historyModal").addEventListener("click", (e) => {
    if (e.target.id === "historyModal") closeHistory();
  });

  // Close any open item-name autocomplete dropdown when tapping/clicking elsewhere.
  document.addEventListener("pointerdown", (e) => {
    document.querySelectorAll(".autocomplete-list:not(.hidden)").forEach((list) => {
      const wrap = list.closest(".autocomplete-wrap");
      if (!wrap || !wrap.contains(e.target)) closeAutocompleteList(list);
    });
  });
}

function closeAutocompleteList(listEl) {
  listEl.classList.add("hidden");
  listEl.innerHTML = "";
}

/* Wires a text input to a dropdown of catalog matches. The input stays a
   free-text field — picking a suggestion just fills it in, it never locks
   the user to the list. */
function attachItemAutocomplete(wrapEl, inputEl, listEl, onPick) {
  let matches = [];
  let activeIndex = -1;

  function render(items) {
    matches = items;
    activeIndex = -1;
    if (items.length === 0) {
      closeAutocompleteList(listEl);
      return;
    }
    listEl.innerHTML = items
      .map(
        (it, i) =>
          `<div class="autocomplete-item" data-idx="${i}"><span>${escapeHtml(it.name)}</span><span class="ac-price">${fmtMoney(it.price, state.business.currency)}</span></div>`
      )
      .join("");
    listEl.classList.remove("hidden");
  }
  function setActive(idx) {
    activeIndex = idx;
    [...listEl.children].forEach((el, i) => el.classList.toggle("active", i === idx));
    const el = listEl.children[idx];
    if (el) el.scrollIntoView({ block: "nearest" });
  }
  function pick(match) {
    onPick(match);
    closeAutocompleteList(listEl);
  }

  inputEl.addEventListener("focus", () => render(filterCatalog(inputEl.value)));
  inputEl.addEventListener("input", () => render(filterCatalog(inputEl.value)));
  inputEl.addEventListener("keydown", (e) => {
    if (listEl.classList.contains("hidden")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0) {
        e.preventDefault();
        pick(matches[activeIndex]);
      }
    } else if (e.key === "Escape") {
      closeAutocompleteList(listEl);
    }
  });
  // mousedown (fires before the input's blur) so the click reliably registers
  listEl.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const item = e.target.closest(".autocomplete-item");
    if (!item) return;
    pick(matches[parseInt(item.dataset.idx, 10)]);
  });
}

function handleImageUpload(e, field) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 1.5 * 1024 * 1024) {
    alert("Please choose an image smaller than 1.5MB.");
    e.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.business[field] = reader.result;
    refreshImagePreviews();
    updatePreview();
    scheduleAutosave();
  };
  reader.readAsDataURL(file);
}

function refreshImagePreviews() {
  const logo = state.business.logo;
  const sig = state.business.signature;
  $("bizLogoPreviewWrap").classList.toggle("hidden", !logo);
  if (logo) $("bizLogoPreview").src = logo;
  $("signaturePreviewWrap").classList.toggle("hidden", !sig);
  if (sig) $("signaturePreview").src = sig;
}

function applyHsnVisibility() {
  const show = state.showHsn;
  document.querySelectorAll(".col-hsn").forEach((el) => el.classList.toggle("hidden-col", !show));
}

/* ============ Populate form from state (used on load / after switching quotations) ============ */
function populateFormFromState() {
  $("bizName").value = state.business.name;
  $("bizAddress").value = state.business.address;
  $("bizPhone").value = state.business.phone;
  $("bizEmail").value = state.business.email;
  $("bizGstin").value = state.business.gstin;
  $("currencySymbol").value = state.business.currency;

  $("quoteNo").value = state.quoteNo;
  $("quoteDate").value = state.quoteDate;
  $("validUntil").value = state.validUntil;
  $("docTitle").value = state.docTitle;

  $("clientName").value = state.client.name;
  $("clientPhone").value = state.client.phone;
  $("clientEmail").value = state.client.email;
  $("clientAddress").value = state.client.address;

  $("discountPct").value = state.discountPct;
  $("taxPct").value = state.taxPct;
  $("termsText").value = state.terms;
  $("notesText").value = state.notes;
  $("showHsn").checked = !!state.showHsn;

  refreshImagePreviews();
  applyHsnVisibility();
}

/* ============ Items editor (card-based, touch-friendly) ============ */
function renderItemsEditor() {
  const body = $("itemsBody");
  body.innerHTML = "";
  state.items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-card-head">
        <span class="item-index">${idx + 1}</span>
        <div class="autocomplete-wrap">
          <input type="text" class="item-name-input" placeholder="Type or pick an item" autocomplete="off">
          <div class="autocomplete-list hidden"></div>
        </div>
        <button type="button" class="del-row-btn" title="Remove item">🗑️</button>
      </div>
      <div class="item-card-fields col-hsn hidden-col">
        <label class="mini-field">HSN/SAC
          <input type="text" class="item-hsn-input" placeholder="Optional">
        </label>
      </div>
      <div class="item-card-fields">
        <label class="mini-field">Qty
          <input type="number" class="item-qty-input" min="0" step="any" inputmode="decimal">
        </label>
        <label class="mini-field">Price/Unit
          <input type="number" class="item-price-input" min="0" step="any" inputmode="decimal">
        </label>
        <div class="mini-field amount-field">Amount
          <span class="amount-view"></span>
        </div>
      </div>
    `;
    const wrap = card.querySelector(".autocomplete-wrap");
    const list = card.querySelector(".autocomplete-list");
    const nameInput = card.querySelector(".item-name-input");
    const hsnInput = card.querySelector(".item-hsn-input");
    const qtyInput = card.querySelector(".item-qty-input");
    const priceInput = card.querySelector(".item-price-input");
    const amountView = card.querySelector(".amount-view");
    const delBtn = card.querySelector(".del-row-btn");

    nameInput.value = item.name;
    hsnInput.value = item.hsn;
    qtyInput.value = item.qty;
    priceInput.value = item.price;

    const refreshAmount = () => {
      const amt = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
      amountView.textContent = fmtMoney(amt, state.business.currency);
    };
    refreshAmount();

    nameInput.addEventListener("input", () => { item.name = nameInput.value; updatePreview(); scheduleAutosave(); });
    hsnInput.addEventListener("input", () => { item.hsn = hsnInput.value; updatePreview(); scheduleAutosave(); });
    qtyInput.addEventListener("input", () => { item.qty = qtyInput.value; refreshAmount(); updatePreview(); scheduleAutosave(); });
    priceInput.addEventListener("input", () => { item.price = priceInput.value; refreshAmount(); updatePreview(); scheduleAutosave(); });
    delBtn.addEventListener("click", () => {
      state.items.splice(idx, 1);
      if (state.items.length === 0) state.items.push(blankItem());
      renderItemsEditor();
      updatePreview();
      scheduleAutosave();
    });

    attachItemAutocomplete(wrap, nameInput, list, (match) => {
      item.name = match.name;
      nameInput.value = match.name;
      if (!parseFloat(item.price)) {
        item.price = match.price;
        priceInput.value = match.price;
      }
      refreshAmount();
      updatePreview();
      scheduleAutosave();
      qtyInput.focus();
      qtyInput.select();
    });

    body.appendChild(card);
  });
  applyHsnVisibility();
}

/* ============ Totals ============ */
function computeTotals() {
  const items = state.items.map((it) => ({
    ...it,
    qty: parseFloat(it.qty) || 0,
    price: parseFloat(it.price) || 0,
  }));
  const totalQty = items.reduce((s, it) => s + it.qty, 0);
  const subTotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  const discountPct = parseFloat(state.discountPct) || 0;
  const taxPct = parseFloat(state.taxPct) || 0;
  const discountAmt = subTotal * (discountPct / 100);
  const taxable = subTotal - discountAmt;
  const taxAmt = taxable * (taxPct / 100);
  const grandTotal = taxable + taxAmt;
  return { items, totalQty, subTotal, discountPct, discountAmt, taxPct, taxAmt, grandTotal };
}

/* ============ Preview rendering ============ */
function updatePreview() {
  const symbol = state.business.currency || "₹";
  $("previewDocTitle").textContent = state.docTitle;
  document.title = `${state.docTitle} ${state.quoteNo ? "#" + state.quoteNo : ""} — ${state.client.name || "Ak's Quotation Maker"}`;

  // Business block
  $("previewBizName").textContent = state.business.name || "Your Business Name";
  $("previewBizAddress").textContent = state.business.address || "";
  const logoImg = $("previewLogo");
  logoImg.src = state.business.logo || defaultLogoDataUri(state.business.name);
  toggleWithText("previewBizPhoneWrap", "previewBizPhone", state.business.phone);
  toggleWithText("previewBizEmailWrap", "previewBizEmail", state.business.email);
  toggleWithText("previewBizGstinWrap", "previewBizGstin", state.business.gstin);

  // Meta block
  $("previewForLabel").textContent = `${state.docTitle} For:`;
  $("previewDetailsLabel").textContent = `${state.docTitle} Details:`;
  $("previewClientName").textContent = state.client.name || "Client Name";
  $("previewClientAddress").textContent = state.client.address || "";
  $("previewClientPhone").textContent = state.client.phone ? `Phone: ${state.client.phone}` : "";
  $("previewClientEmail").textContent = state.client.email ? `Email: ${state.client.email}` : "";
  $("previewQuoteNo").textContent = state.quoteNo || "";
  $("previewQuoteDate").textContent = formatDateDisplay(state.quoteDate);
  const validWrap = $("previewValidUntilWrap");
  if (state.validUntil) {
    validWrap.classList.remove("hidden");
    $("previewValidUntil").textContent = formatDateDisplay(state.validUntil);
  } else {
    validWrap.classList.add("hidden");
  }

  // Items table
  const totals = computeTotals();
  const body = $("previewItemsBody");
  body.innerHTML = "";
  totals.items.forEach((it, idx) => {
    const amt = it.qty * it.price;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-num">${idx + 1}</td>
      <td class="col-name">${escapeHtml(it.name || "")}</td>
      <td class="col-hsn hidden-col">${escapeHtml(it.hsn || "")}</td>
      <td class="col-qty">${formatQty(it.qty)}</td>
      <td class="col-price">${fmtMoney(it.price, symbol)}</td>
      <td class="col-amount">${fmtMoney(amt, symbol)}</td>
    `;
    body.appendChild(tr);
  });
  $("previewTotalQty").textContent = formatQty(totals.totalQty);
  $("previewTotalAmount").textContent = fmtMoney(totals.subTotal, symbol);

  // Totals box
  $("previewSubTotal").textContent = fmtMoney(totals.subTotal, symbol);
  const discLine = $("previewDiscountLine");
  if (totals.discountPct > 0) {
    discLine.classList.remove("hidden");
    $("previewDiscountPct").textContent = trimNum(totals.discountPct);
    $("previewDiscountAmt").textContent = "- " + fmtMoney(totals.discountAmt, symbol);
  } else {
    discLine.classList.add("hidden");
  }
  const taxLine = $("previewTaxLine");
  if (totals.taxPct > 0) {
    taxLine.classList.remove("hidden");
    $("previewTaxPct").textContent = trimNum(totals.taxPct);
    $("previewTaxAmt").textContent = "+ " + fmtMoney(totals.taxAmt, symbol);
  } else {
    taxLine.classList.add("hidden");
  }
  $("previewGrandTotal").textContent = fmtMoney(totals.grandTotal, symbol);

  // Amount in words
  $("previewAmountWords").textContent = amountToWords(totals.grandTotal, currencyLabel(symbol));

  // Notes
  const notesBlock = $("previewNotesBlock");
  if (state.notes && state.notes.trim()) {
    notesBlock.classList.remove("hidden");
    $("previewNotes").textContent = state.notes;
  } else {
    notesBlock.classList.add("hidden");
  }

  // Terms
  $("previewTerms").textContent = state.terms || "";

  // Signature
  $("previewSigFor").textContent = `For ${state.business.name || "Your Business"}:`;
  const sigImg = $("previewSignature");
  if (state.business.signature) {
    sigImg.src = state.business.signature;
    sigImg.classList.remove("hidden");
  } else {
    sigImg.classList.add("hidden");
  }

  applyHsnVisibility();
}

function toggleWithText(wrapId, textId, value) {
  const wrap = $(wrapId);
  if (value) {
    wrap.classList.remove("hidden");
    $(textId).textContent = value;
  } else {
    wrap.classList.add("hidden");
  }
}

function formatQty(n) {
  const v = Number(n || 0);
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}
function trimNum(n) {
  const v = Number(n);
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}
function formatDateDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============ Save / New / Clear ============ */
function saveQuotation() {
  if (!state.business.name.trim()) {
    alert("Please enter your Business Name before saving.");
    $("bizName").focus();
    return;
  }
  if (!state.client.name.trim()) {
    alert("Please enter the Client Name before saving.");
    $("clientName").focus();
    return;
  }
  saveJSON(LS_BUSINESS, state.business);
  bumpCounter(state.quoteNo);

  const history = loadJSON(LS_HISTORY) || [];
  const totals = computeTotals();
  const record = {
    quoteNo: state.quoteNo,
    docTitle: state.docTitle,
    clientName: state.client.name,
    date: state.quoteDate,
    total: totals.grandTotal,
    savedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(state)),
  };
  const idx = history.findIndex((h) => h.quoteNo === state.quoteNo);
  if (idx >= 0) history[idx] = record;
  else history.unshift(record);
  saveJSON(LS_HISTORY, history);
  saveJSON(LS_DRAFT, state);
  flashSaved("Quotation saved ✓");
}

function startNewQuotation() {
  if (!confirm("Start a new blank quotation? Your business details are kept, but current client/items will be cleared unless already saved.")) return;
  const biz = state.business;
  state = defaultState(nextCounter());
  state.business = biz;
  saveJSON(LS_DRAFT, state);
  populateFormFromState();
  renderItemsEditor();
  updatePreview();
  flashSaved("New quotation started");
}

function clearForm() {
  if (!confirm("Clear all fields including business details? This cannot be undone.")) return;
  localStorage.removeItem(LS_BUSINESS);
  state = defaultState(nextCounter());
  saveJSON(LS_DRAFT, state);
  populateFormFromState();
  renderItemsEditor();
  updatePreview();
  flashSaved("Cleared");
}

/* ============ History modal ============ */
function openHistory() {
  const history = loadJSON(LS_HISTORY) || [];
  const tbody = $("historyBody");
  tbody.innerHTML = "";
  $("historyEmpty").classList.toggle("hidden", history.length > 0);
  $("historyTable").classList.toggle("hidden", history.length === 0);

  history.forEach((rec) => {
    const tr = document.createElement("tr");
    const symbol = rec.data && rec.data.business ? rec.data.business.currency : "₹";
    tr.innerHTML = `
      <td>${escapeHtml(rec.quoteNo)}</td>
      <td>${escapeHtml(rec.clientName || "")}</td>
      <td>${formatDateDisplay(rec.date)}</td>
      <td>${fmtMoney(rec.total, symbol || "₹")}</td>
      <td class="history-actions">
        <button type="button" data-act="load">Open</button>
        <button type="button" data-act="dup">Duplicate</button>
        <button type="button" data-act="del" class="danger">Delete</button>
      </td>
    `;
    tr.querySelector('[data-act="load"]').addEventListener("click", () => {
      state = JSON.parse(JSON.stringify(rec.data));
      populateFormFromState();
      renderItemsEditor();
      updatePreview();
      saveJSON(LS_DRAFT, state);
      closeHistory();
      flashSaved("Quotation loaded");
    });
    tr.querySelector('[data-act="dup"]').addEventListener("click", () => {
      const copy = JSON.parse(JSON.stringify(rec.data));
      copy.quoteNo = String(nextCounter());
      copy.quoteDate = todayISO();
      state = copy;
      populateFormFromState();
      renderItemsEditor();
      updatePreview();
      saveJSON(LS_DRAFT, state);
      closeHistory();
      flashSaved("Duplicated as new quotation");
    });
    tr.querySelector('[data-act="del"]').addEventListener("click", () => {
      if (!confirm(`Delete quotation #${rec.quoteNo}? This cannot be undone.`)) return;
      const list = (loadJSON(LS_HISTORY) || []).filter((h) => h.quoteNo !== rec.quoteNo);
      saveJSON(LS_HISTORY, list);
      openHistory();
    });
    tbody.appendChild(tr);
  });

  $("historyModal").classList.remove("hidden");
}
function closeHistory() {
  $("historyModal").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", init);
