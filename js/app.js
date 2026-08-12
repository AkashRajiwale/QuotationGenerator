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

/* Default logo shipped with the app, used when the user hasn't uploaded one.
   Relative path so it resolves under a GitHub Pages subpath too. */
const DEFAULT_LOGO_SRC = "assets/logo.png";

/* Fallback of last resort: a colored monogram from the business name's
   initials, used only if DEFAULT_LOGO_SRC fails to load. */
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

  // Decode the logo up front so the share tap has no slow async work to do —
  // iOS may reject navigator.share() if the user gesture has gone stale.
  loadImage(state.business.logo || DEFAULT_LOGO_SRC);
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
  $("shareBtn").addEventListener("click", shareQuotation);

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
  // If assets/logo.png is ever missing, fall back to the initials monogram
  // rather than showing a broken image. Guarded so it can't loop.
  logoImg.onerror = () => {
    logoImg.onerror = null;
    logoImg.src = defaultLogoDataUri(state.business.name);
  };
  logoImg.src = state.business.logo || DEFAULT_LOGO_SRC;
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

/* ============ Share as an image (WhatsApp, etc.) ============
   A WhatsApp URL can only carry text — an image cannot be attached to one.
   So the picture is shared through the Web Share API, which opens the
   native share sheet with WhatsApp in it (Android Chrome, iOS Safari 14.5+,
   HTTPS only). Desktop browsers without file sharing fall back to
   downloading the PNG and opening WhatsApp with a text summary.

   The quotation is drawn with the Canvas 2D API rather than rasterising the
   DOM: it keeps the app dependency-free and renders consistently on iOS,
   where SVG-foreignObject approaches are unreliable. */

const IMG_W = 760;
const IMG_PAD = 36;
const IC = {
  ink: "#1f2a24",
  muted: "#6b7a72",
  brandDark: "#204d37",
  border: "#dfe6e1",
  headBg: "#eef3f0",
  totalBg: "#f7faf8",
  white: "#ffffff",
  faint: "#b8c2bc",
};

/* Decoded images are cached so the share tap does as little async work as
   possible — iOS can reject navigator.share() if too much time passes
   between the user gesture and the call. */
const imageCache = new Map();
function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = () => { imageCache.set(src, null); resolve(null); };
    img.src = src;
  });
}

function iFont(weight, size) {
  return `${weight} ${size}px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
}

function wrapLines(ctx, str, maxWidth) {
  const src = String(str == null ? "" : str);
  if (!src.trim()) return [];
  const out = [];
  src.split("\n").forEach((para) => {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) return;
    let line = "";
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      // `!line` guarantees progress when a single word is wider than maxWidth
      if (!line || ctx.measureText(test).width <= maxWidth) line = test;
      else { out.push(line); line = w; }
    });
    if (line) out.push(line);
  });
  return out;
}

/* Lays out the whole quotation. Runs twice: once with draw=false purely to
   measure the height, then again to paint. All layout maths runs in both
   passes so the two agree exactly. Returns the required height. */
function drawQuotation(ctx, assets, draw) {
  const left = IMG_PAD;
  const right = IMG_W - IMG_PAD;
  const innerW = right - left;
  const t = computeTotals();
  const symbol = state.business.currency || "₹";
  let y = IMG_PAD;

  const rect = (x, yy, w, h, fill, stroke) => {
    if (!draw) return;
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, yy, w, h); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, yy + 0.5, w - 1, h - 1); }
  };
  const text = (str, x, yy, o) => {
    if (!draw) return;
    const opt = o || {};
    ctx.fillStyle = opt.color || IC.ink;
    ctx.font = opt.font || iFont(400, 13);
    ctx.textAlign = opt.align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(str, x, yy);
  };
  const cell = (str, x, w, yy, align, o) => {
    const p = 7;
    const tx = align === "right" ? x + w - p : align === "center" ? x + w / 2 : x + p;
    text(str, tx, yy, Object.assign({}, o, { align: align }));
  };

  /* ---- title ---- */
  text(state.docTitle, IMG_W / 2, y, { font: iFont(700, 26), color: IC.brandDark, align: "center" });
  y += 40;

  /* ---- business block ---- */
  const logo = assets.logo;
  let lw = 0, lh = 0;
  if (logo && logo.width && logo.height) {
    const r = Math.min(170 / logo.width, 56 / logo.height);
    lw = logo.width * r;
    lh = logo.height * r;
  }
  const btx = left + 14 + (lw ? lw + 14 : 0);
  const btw = right - 14 - btx;
  ctx.font = iFont(800, 18);
  const nameLines = wrapLines(ctx, state.business.name || "Your Business", btw);
  ctx.font = iFont(400, 13);
  const addrLines = wrapLines(ctx, state.business.address, btw);
  const contact = [];
  if (state.business.phone) contact.push("Phone: " + state.business.phone);
  if (state.business.email) contact.push("Email: " + state.business.email);
  if (state.business.gstin) contact.push("GSTIN: " + state.business.gstin);
  const contactLines = wrapLines(ctx, contact.join("    "), btw);
  const bizTextH = nameLines.length * 24 + addrLines.length * 18 + contactLines.length * 18;
  const bizH = Math.max(lh, bizTextH) + 26;
  rect(left, y, innerW, bizH, IC.white, IC.border);
  if (draw && logo) ctx.drawImage(logo, left + 14, y + (bizH - lh) / 2, lw, lh);
  let by = y + 13;
  nameLines.forEach((l) => { text(l, btx, by, { font: iFont(800, 18), color: IC.brandDark }); by += 24; });
  addrLines.forEach((l) => { text(l, btx, by, { color: IC.muted }); by += 18; });
  contactLines.forEach((l) => { text(l, btx, by); by += 18; });
  y += bizH + 14;

  /* ---- client / details ---- */
  const gap = 12;
  const colW = (innerW - gap) / 2;
  ctx.font = iFont(400, 13);
  const clientExtra = [];
  wrapLines(ctx, state.client.address, colW - 28).forEach((l) => clientExtra.push(l));
  if (state.client.phone) clientExtra.push("Phone: " + state.client.phone);
  if (state.client.email) clientExtra.push("Email: " + state.client.email);
  const detailRows = ["No: " + (state.quoteNo || ""), "Date: " + formatDateDisplay(state.quoteDate)];
  if (state.validUntil) detailRows.push("Valid Until: " + formatDateDisplay(state.validUntil));
  const metaH = Math.max(16 + 22 + clientExtra.length * 18, 16 + detailRows.length * 18) + 26;
  rect(left, y, colW, metaH, IC.white, IC.border);
  rect(left + colW + gap, y, colW, metaH, IC.white, IC.border);
  let ly = y + 13;
  text(`${state.docTitle} For:`.toUpperCase(), left + 13, ly, { font: iFont(700, 10), color: IC.muted });
  ly += 16;
  text(state.client.name || "Client Name", left + 13, ly, { font: iFont(700, 15) });
  ly += 22;
  clientExtra.forEach((l) => { text(l, left + 13, ly); ly += 18; });
  let ry = y + 13;
  const rx = left + colW + gap + 13;
  text(`${state.docTitle} Details:`.toUpperCase(), rx, ry, { font: iFont(700, 10), color: IC.muted });
  ry += 16;
  detailRows.forEach((l) => { text(l, rx, ry); ry += 18; });
  y += metaH + 14;

  /* ---- items table ---- */
  const showHsn = !!state.showHsn;
  const wNum = 34, wQty = 58, wPrice = 96, wAmt = 106, wHsn = showHsn ? 84 : 0;
  const wName = innerW - wNum - wQty - wPrice - wAmt - wHsn;
  const cols = [{ w: wNum, a: "center", h: "#" }, { w: wName, a: "left", h: "Item Name" }];
  if (showHsn) cols.push({ w: wHsn, a: "left", h: "HSN/SAC" });
  cols.push({ w: wQty, a: "center", h: "Qty" }, { w: wPrice, a: "right", h: "Price/Unit" }, { w: wAmt, a: "right", h: "Amount" });
  const xs = [];
  let cx = left;
  cols.forEach((c) => { xs.push(cx); cx += c.w; });

  const headH = 30;
  rect(left, y, innerW, headH, IC.headBg, IC.border);
  cols.forEach((c, i) => {
    rect(xs[i], y, c.w, headH, null, IC.border);
    cell(c.h.toUpperCase(), xs[i], c.w, y + 10, c.a, { font: iFont(700, 10), color: IC.brandDark });
  });
  y += headH;

  t.items.forEach((it, idx) => {
    ctx.font = iFont(400, 13);
    const lines = wrapLines(ctx, it.name, wName - 14);
    const shown = lines.length ? lines : [""];
    const rowH = Math.max(28, shown.length * 17 + 11);
    const vals = [String(idx + 1), null];
    if (showHsn) vals.push(it.hsn || "");
    vals.push(formatQty(it.qty), fmtMoney(it.price, symbol), fmtMoney(it.qty * it.price, symbol));
    cols.forEach((c, i) => {
      rect(xs[i], y, c.w, rowH, null, IC.border);
      if (vals[i] === null) {
        shown.forEach((l, li) => cell(l, xs[i], c.w, y + 6 + li * 17, "left"));
      } else {
        cell(vals[i], xs[i], c.w, y + (rowH - 13) / 2, c.a);
      }
    });
    y += rowH;
  });

  const totH = 30;
  rect(left, y, innerW, totH, IC.totalBg, IC.border);
  const labelW = wNum + wName + wHsn;
  rect(left, y, labelW, totH, null, IC.border);
  cell("Total", left, labelW, y + 9, "right", { font: iFont(700, 13) });
  const qtyIdx = showHsn ? 3 : 2;
  [qtyIdx, qtyIdx + 1, qtyIdx + 2].forEach((i) => rect(xs[i], y, cols[i].w, totH, null, IC.border));
  cell(formatQty(t.totalQty), xs[qtyIdx], cols[qtyIdx].w, y + 9, "center", { font: iFont(700, 13) });
  cell(fmtMoney(t.subTotal, symbol), xs[qtyIdx + 2], cols[qtyIdx + 2].w, y + 9, "right", { font: iFont(700, 13) });
  y += totH + 14;

  /* ---- totals box ---- */
  const tbW = 300;
  const tbX = right - tbW;
  const rows = [["Sub Total", fmtMoney(t.subTotal, symbol), false]];
  if (t.discountPct > 0) rows.push([`Discount (${trimNum(t.discountPct)}%)`, "- " + fmtMoney(t.discountAmt, symbol), false]);
  if (t.taxPct > 0) rows.push([`Tax (${trimNum(t.taxPct)}%)`, "+ " + fmtMoney(t.taxAmt, symbol), false]);
  rows.push(["Total", fmtMoney(t.grandTotal, symbol), true]);
  rows.forEach((r) => {
    const h = 30;
    rect(tbX, y, tbW, h, r[2] ? IC.headBg : IC.white, IC.border);
    text(r[0], tbX + 12, y + 9, { font: iFont(r[2] ? 800 : 400, 13), color: r[2] ? IC.brandDark : IC.ink });
    text(r[1], tbX + tbW - 12, y + 9, { font: iFont(r[2] ? 800 : 600, 13), color: r[2] ? IC.brandDark : IC.ink, align: "right" });
    y += h;
  });
  y += 16;

  /* ---- amount in words ---- */
  text("AMOUNT IN WORDS:", left, y, { font: iFont(700, 10), color: IC.muted });
  y += 15;
  ctx.font = iFont(600, 13);
  wrapLines(ctx, amountToWords(t.grandTotal, currencyLabel(symbol)), innerW).forEach((l) => {
    text(l, left, y, { font: iFont(600, 13) });
    y += 18;
  });
  y += 10;

  /* ---- notes ---- */
  if (state.notes && state.notes.trim()) {
    text("NOTES:", left, y, { font: iFont(700, 10), color: IC.muted });
    y += 15;
    ctx.font = iFont(400, 13);
    wrapLines(ctx, state.notes, innerW).forEach((l) => { text(l, left, y); y += 18; });
    y += 10;
  }

  /* ---- terms ---- */
  if (state.terms && state.terms.trim()) {
    text("TERMS AND CONDITIONS:", left, y, { font: iFont(700, 10), color: IC.muted });
    y += 15;
    ctx.font = iFont(400, 13);
    wrapLines(ctx, state.terms, innerW).forEach((l) => { text(l, left, y); y += 18; });
    y += 10;
  }

  /* ---- signature ---- */
  y += 18;
  const sig = assets.signature;
  text(`For ${state.business.name || "Your Business"}:`, right, y, { font: iFont(700, 12), color: IC.muted, align: "right" });
  y += 20;
  if (sig && sig.width && sig.height) {
    const r = Math.min(150 / sig.width, 50 / sig.height);
    const sw = sig.width * r, sh = sig.height * r;
    if (draw) ctx.drawImage(sig, right - sw, y, sw, sh);
    y += sh + 4;
  } else {
    y += 30;
  }
  if (draw) {
    ctx.strokeStyle = IC.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(right - 170, y + 0.5);
    ctx.lineTo(right, y + 0.5);
    ctx.stroke();
  }
  y += 6;
  text("Authorized Signatory", right - 85, y, { font: iFont(400, 12), align: "center" });
  y += 26;

  text("Generated with Ak's Quotation Maker", IMG_W / 2, y, { font: iFont(400, 10), color: IC.faint, align: "center" });
  y += 16;

  return y + IMG_PAD;
}

async function buildQuotationBlob(scale) {
  const s = scale || 2;
  const assets = {
    logo: await loadImage(state.business.logo || DEFAULT_LOGO_SRC),
    signature: await loadImage(state.business.signature),
  };
  // measuring pass — canvas size is irrelevant to measureText
  const height = drawQuotation(document.createElement("canvas").getContext("2d"), assets, false);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(IMG_W * s);
  canvas.height = Math.round(height * s);
  const ctx = canvas.getContext("2d");
  ctx.scale(s, s);
  ctx.fillStyle = IC.white;
  ctx.fillRect(0, 0, IMG_W, height);
  drawQuotation(ctx, assets, true);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

/* WhatsApp needs an international number. A bare 10-digit number is assumed
   to be Indian, matching this app's ₹ / Indian-numbering defaults. */
function waPhone(raw) {
  // Strip the national trunk prefix first, so "09876543210" is recognised as
  // a bare 10-digit number and still gets a country code.
  const digits = String(raw || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  return digits.length === 10 ? "91" + digits : digits;
}

function shareSummaryText() {
  const t = computeTotals();
  const symbol = state.business.currency || "₹";
  const lines = [
    `*${state.docTitle} No: ${state.quoteNo}*`,
    state.business.name,
    `Date: ${formatDateDisplay(state.quoteDate)}`,
  ];
  if (state.client.name) lines.push(`For: ${state.client.name}`);
  lines.push(`Total: ${fmtMoney(t.grandTotal, symbol)}`);
  return lines.filter(Boolean).join("\n");
}

function safeFileName() {
  const who = (state.client.name || "client").trim().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  return `${state.docTitle}-${state.quoteNo || "1"}-${who || "client"}.png`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function shareQuotation() {
  const btn = $("shareBtn");
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Preparing…";
  try {
    const blob = await buildQuotationBlob(2);
    if (!blob) throw new Error("the image could not be created");
    const file = new File([blob], safeFileName(), { type: "image/png" });
    const text = shareSummaryText();

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${state.docTitle} ${state.quoteNo}`, text: text });
        flashSaved("Shared ✓");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // user dismissed the sheet
        // iOS can refuse share() if the gesture has gone stale — fall through
        console.warn("navigator.share failed, falling back:", err);
      }
    }
    // No file sharing available: hand over the PNG and open WhatsApp with the
    // summary so the user attaches the file they just received.
    downloadBlob(blob, safeFileName());
    window.open(`https://wa.me/${waPhone(state.client.phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    flashSaved("Image saved — attach it in WhatsApp");
  } catch (err) {
    console.error(err);
    alert("Sorry, could not share: " + ((err && err.message) || err));
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

document.addEventListener("DOMContentLoaded", init);
