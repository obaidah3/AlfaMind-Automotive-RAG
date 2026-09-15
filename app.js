/* ==========================================================================
   GIULIA TECHNICAL MANUAL ASSISTANT — APPLICATION LOGIC
   Pure ES6+, no framework, no build step.
   ========================================================================== */

(() => {
  "use strict";

  /* ---------------------------------------------------------------------
     Config
     --------------------------------------------------------------------- */
  const API_BASE = "https://unproven-overdrive-hurry.ngrok-free.dev";
  const QUERY_ENDPOINT = `${API_BASE}/query`;
  const HEALTH_ENDPOINT = `${API_BASE}/health`;
  const HEALTH_POLL_MS = 30000;
  const REQUEST_TIMEOUT_MS = 90000;
  const N_RESULTS = 5;

  /* ---------------------------------------------------------------------
     DOM references
     --------------------------------------------------------------------- */
  const el = {
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),
    sidebarClose: document.getElementById("sidebarClose"),
    menuToggle: document.getElementById("menuToggle"),

    galleryImage: document.getElementById("galleryImage"),
    galleryLabel: document.getElementById("galleryLabel"),
    galleryIndex: document.getElementById("galleryIndex"),
    galleryTotal: document.getElementById("galleryTotal"),
    galleryThumbs: document.getElementById("galleryThumbs"),
    galleryPrev: document.getElementById("galleryPrev"),
    galleryNext: document.getElementById("galleryNext"),

    dnaActiveLabel: document.getElementById("dnaActiveLabel"),
    dnaPills: document.querySelectorAll(".dna-pill"),

    quickChips: document.getElementById("quickChips"),

    statusDot: document.getElementById("statusDot"),
    statusLabel: document.getElementById("statusLabel"),
    statusSub: document.getElementById("statusSub"),
    statusRefresh: document.getElementById("statusRefresh"),

    clearBtn: document.getElementById("clearBtn"),
    chatFeed: document.getElementById("chatFeed"),
    emptyState: document.getElementById("emptyState"),
    messages: document.getElementById("messages"),
    featureCards: document.querySelectorAll(".feature-card"),

    inputForm: document.getElementById("inputForm"),
    questionInput: document.getElementById("questionInput"),
    sendBtn: document.getElementById("sendBtn"),

    imageInput: document.getElementById("imageInput"),
    uploadBtn: document.getElementById("uploadBtn"),
    imagePreviewContainer: document.getElementById("imagePreviewContainer"),
    imagePreview: document.getElementById("imagePreview"),
    removeImageBtn: document.getElementById("removeImageBtn"),

    modalOverlay: document.getElementById("imageModal"),
    modalImage: document.getElementById("modalImage"),
    modalCaption: document.getElementById("modalCaption"),
    modalClose: document.getElementById("modalClose"),
  };

  /* ---------------------------------------------------------------------
     State
     --------------------------------------------------------------------- */
  const state = {
    galleryIndex: 0,
    driveMode: "natural",
    isSending: false,
    history: [], // { role: 'user' | 'assistant', text, citations, figures }
    currentImageB64: null,
  };

  // Maps each DNA drive mode to a trim/color from trim-data.js, so switching
  // DNA mode also swaps the sidebar gallery to that trim's photography.
  const DNA_TRIM_MAP = {
    dynamic: "quadrifoglio",
    natural: "giulia",
    advanced: "giulia",
    race: "gtam",
  };
  const TRIM_DNA_MAP = { quadrifoglio: "dynamic", giulia: "natural", gtam: "race" };

  function buildGalleryItems(trimKey) {
    const t = (typeof ALFA_TRIMS !== "undefined" && ALFA_TRIMS[trimKey]) || null;
    if (!t) {
      return [
        { src: "images/qv/qvfront.jpg", label: "Esterno" },
        { src: "images/interior/interior.jpg", label: "Interni" },
      ];
    }
    return [
      { src: t.images.front, label: `${t.name} — Frontale` },
      { src: t.images.side, label: `${t.name} — Laterale` },
      { src: t.images.rear, label: `${t.name} — Posteriore` },
      { src: "images/interior/interior.jpg", label: "Interni" },
      { src: "images/exterior/wheels.jpg", label: "Dettaglio Cerchio" },
    ];
  }

  let GALLERY_ITEMS = buildGalleryItems(
    typeof alfaGetActiveTrim === "function" ? alfaGetActiveTrim() : "quadrifoglio"
  );

  // Curated follow-up prompts, grouped by topic, offered after an answer
  // so the person can keep exploring the manual without typing.
  const SUGGESTION_POOL = {
    tire: [
      "How often should tire pressure be checked?",
      "What's the difference between front and rear tire pressure?",
      "How do I reset the tire pressure monitoring system?",
    ],
    oil: [
      "What is the engine oil change interval?",
      "How much oil does the engine hold?",
      "What coolant specification does the Giulia require?",
    ],
    drive: [
      "How does Dynamic mode change the suspension?",
      "What does Race mode disable for track use?",
      "How do I switch between DNA drive modes?",
    ],
    maintenance: [
      "What is the recommended service interval?",
      "How do I check the brake fluid level?",
      "When should the cabin air filter be replaced?",
    ],
    cockpit: [
      "How do I pair my phone with the infotainment system?",
      "What do the dashboard warning lights mean?",
      "How do I adjust the digital instrument cluster display?",
    ],
    general: [
      "What is the recommended tire pressure?",
      "What type of engine oil does the Giulia use?",
      "How do I set up Advanced Efficiency mode?",
    ],
  };

  function pickSuggestions(question) {
    const q = (question || "").toLowerCase();
    let pool = SUGGESTION_POOL.general;
    if (/tire|tyre|pressure/.test(q)) pool = SUGGESTION_POOL.tire;
    else if (/oil|coolant|fluid/.test(q)) pool = SUGGESTION_POOL.oil;
    else if (/dna|drive mode|dynamic|natural|advanced efficiency|race/.test(q)) pool = SUGGESTION_POOL.drive;
    else if (/service|maintenance|interval|brake|filter/.test(q)) pool = SUGGESTION_POOL.maintenance;
    else if (/infotainment|dashboard|cockpit|cluster|screen|warning light/.test(q)) pool = SUGGESTION_POOL.cockpit;

    return pool.slice(0, 3);
  }

  /* =======================================================================
     GALLERY / CAROUSEL
     ======================================================================= */

  function renderGalleryThumbs() {
    el.galleryThumbs.innerHTML = GALLERY_ITEMS.map(
      (item, i) => `
        <button class="thumb ${i === 0 ? "active" : ""}" data-index="${i}" aria-label="${item.label}">
          <img src="${item.src}" alt="" data-fallback-label="${item.label}" />
        </button>`
    ).join("");
    el.galleryThumbs.querySelectorAll(".thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => setGalleryIndex(Number(thumb.dataset.index)));
    });
    attachGalleryFallbacks();
  }

  function attachGalleryFallbacks() {
    document.querySelectorAll(".gallery-image, .thumb img").forEach((img) => {
      if (typeof alfaAttachImageFallback === "function") {
        alfaAttachImageFallback(img);
      } else {
        img.addEventListener("error", () => {
          if (!img.dataset.fallbackApplied) {
            img.dataset.fallbackApplied = "true";
            img.src =
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
                   <rect width='100%' height='100%' fill='#121620'/>
                   <text x='50%' y='50%' fill='#94A3B8' font-family='Arial' font-size='14'
                         text-anchor='middle' dominant-baseline='middle'>Giulia image unavailable</text>
                 </svg>`
              );
          }
        });
      }
    });
  }

  function setGalleryIndex(index) {
    const total = GALLERY_ITEMS.length;
    state.galleryIndex = ((index % total) + total) % total;
    const item = GALLERY_ITEMS[state.galleryIndex];

    el.galleryImage.style.opacity = "0";
    window.setTimeout(() => {
      el.galleryImage.src = item.src;
      el.galleryImage.alt = `Alfa Romeo Giulia — ${item.label}`;
      el.galleryImage.dataset.fallbackLabel = item.label;
      el.galleryImage.dataset.fallbackApplied = "";
      attachGalleryFallbacks();
      el.galleryImage.style.opacity = "1";
    }, 120);

    el.galleryLabel.textContent = item.label;
    el.galleryIndex.textContent = String(state.galleryIndex + 1);
    el.galleryTotal.textContent = String(total);

    el.galleryThumbs.querySelectorAll(".thumb").forEach((thumb, i) => {
      thumb.classList.toggle("active", i === state.galleryIndex);
    });
  }

  function refreshGalleryForTrim(trimKey) {
    GALLERY_ITEMS = buildGalleryItems(trimKey);
    renderGalleryThumbs();
    setGalleryIndex(0);
  }

  function initGallery() {
    renderGalleryThumbs();
    el.galleryTotal.textContent = String(GALLERY_ITEMS.length);
    el.galleryPrev.addEventListener("click", () => setGalleryIndex(state.galleryIndex - 1));
    el.galleryNext.addEventListener("click", () => setGalleryIndex(state.galleryIndex + 1));

    document.addEventListener("alfa:trim-change", (e) => {
      refreshGalleryForTrim(e.detail.id);
      const dnaMode = TRIM_DNA_MAP[e.detail.id];
      if (dnaMode) syncDnaPillUI(dnaMode);
    });
  }

  /* =======================================================================
     DNA DRIVE MODE SELECTOR
     ======================================================================= */

  function applyDriveModeTheme(mode) {
    // Flips CSS custom properties site-wide (accent glow, buttons, avatars,
    // bubbles) so the whole interface visually reflects the active DNA mode —
    // yellow for Race, red for Dynamic, blue for Natural, green for Advanced Efficiency.
    document.documentElement.setAttribute("data-mode", mode);
  }

  function syncDnaPillUI(mode) {
    if (state.driveMode === mode) return;
    state.driveMode = mode;
    el.dnaPills.forEach((p) => {
      const isActive = p.dataset.mode === mode;
      p.classList.toggle("active", isActive);
      p.setAttribute("aria-checked", String(isActive));
    });
    const labels = { dynamic: "Dynamic", natural: "Natural", advanced: "Advanced Efficiency", race: "Race" };
    el.dnaActiveLabel.textContent = labels[mode] || mode;
    applyDriveModeTheme(mode);
  }

  function initDnaSelector() {
    el.dnaPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const mode = pill.dataset.mode;
        syncDnaPillUI(mode);
        // Selecting a DNA mode also swaps the vehicle photography + accent
        // color to the matching trim, so the whole sidebar feels unified.
        const trim = DNA_TRIM_MAP[mode];
        if (trim && typeof alfaSetActiveTrim === "function") alfaSetActiveTrim(trim);
      });
    });
  }

  /* =======================================================================
     BACKEND STATUS (/health polling)
     ======================================================================= */

  function setStatus(mode, label, sub) {
    el.statusDot.classList.remove("online", "offline", "checking");
    el.statusDot.classList.add(mode);
    el.statusLabel.textContent = label;
    if (sub !== undefined) el.statusSub.textContent = sub;
  }

  async function checkHealth() {
    setStatus("checking", "Checking backend…", "/health");
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      const res = await fetch(HEALTH_ENDPOINT, { method: "GET", signal: controller.signal });
      window.clearTimeout(timeout);

      if (res.ok) {
        setStatus("online", "Connected to RAG engine", "/health · 200 OK");
      } else {
        setStatus("offline", `Backend error (${res.status})`, "/health");
      }
    } catch (err) {
      setStatus("offline", "Backend unreachable", "127.0.0.1:8000");
    }
  }

  function initHealthPolling() {
    checkHealth();
    window.setInterval(checkHealth, HEALTH_POLL_MS);
    el.statusRefresh.addEventListener("click", () => {
      el.statusRefresh.classList.add("spinning");
      checkHealth().finally(() => {
        window.setTimeout(() => el.statusRefresh.classList.remove("spinning"), 400);
      });
    });
  }

  /* =======================================================================
     SIDEBAR (mobile toggle)
     ======================================================================= */

  function openSidebar() {
    el.sidebar.classList.add("open");
    el.sidebarBackdrop.classList.add("open");
  }
  function closeSidebar() {
    el.sidebar.classList.remove("open");
    el.sidebarBackdrop.classList.remove("open");
  }
  function initSidebarToggle() {
    el.menuToggle.addEventListener("click", openSidebar);
    el.sidebarClose.addEventListener("click", closeSidebar);
    el.sidebarBackdrop.addEventListener("click", closeSidebar);
  }

  /* =======================================================================
     MARKDOWN-LITE RENDERER
     Handles: **bold**, line breaks, bullet lists ("- " / "* "), and
     basic paragraph grouping. Output is escaped first to avoid HTML
     injection from the model response.
     ======================================================================= */

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function inlineFormat(text) {
    let out = escapeHtml(text);
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/`([^`]+?)`/g, "<code>$1</code>");
    return out;
  }

  function renderMarkdown(rawText) {
    const text = (rawText || "").replace(/\r\n/g, "\n").trim();
    if (!text) return "";

    const blocks = text.split(/\n{2,}/);
    let html = "";

    blocks.forEach((block) => {
      const lines = block.split("\n").filter((l) => l.trim() !== "");
      const isList = lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l));

      if (isList) {
        html += "<ul>";
        lines.forEach((line) => {
          const item = line.replace(/^\s*[-*•]\s+/, "");
          html += `<li>${inlineFormat(item)}</li>`;
        });
        html += "</ul>";
      } else {
        html += `<p>${lines.map(inlineFormat).join("<br>")}</p>`;
      }
    });

    return html;
  }

  /* =======================================================================
     CITATION + FIGURE EXTRACTION
     Backend may return citations as structured data (preferred) or as
     inline text markers like "[Source: Page 42]". This handles both.
     ======================================================================= */

  function extractCitationsFromText(text) {
    const found = [];
    const re = /\[Source:\s*Page\s*(\d+)\]/gi;
    let match;
    while ((match = re.exec(text)) !== null) {
      found.push(match[1]);
    }
    return [...new Set(found)];
  }

  function stripCitationMarkers(text) {
    return text.replace(/\[Source:\s*Page\s*\d+\]/gi, "").trim();
  }

  function normalizeCitations(payload, fallbackText) {
    const pages = new Set();

    if (Array.isArray(payload?.sources)) {
      payload.sources.forEach((s) => {
        const page = s?.page ?? s?.page_number ?? s?.metadata?.page;
        if (page !== undefined && page !== null) pages.add(String(page));
      });
    }
    if (Array.isArray(payload?.citations)) {
      payload.citations.forEach((c) => {
        const page = typeof c === "object" ? c?.page : c;
        if (page !== undefined && page !== null) pages.add(String(page));
      });
    }
    extractCitationsFromText(fallbackText || "").forEach((p) => pages.add(p));

    return [...pages];
  }

  function resolveFigureSrc(src) {
    if (!src) return src;
    // Already absolute (http(s) or data URI) — leave untouched. Otherwise the
    // backend returned a relative path (e.g. /pages/... or /extracted/...)
    // that must be resolved against the FastAPI host.
    if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) return src;
    return `${API_BASE}${src}`;
  }

  function normalizeFigures(payload) {
    const figures = [];
    const candidates = payload?.figures || payload?.images || payload?.sources;
    if (Array.isArray(candidates)) {
      candidates.forEach((item) => {
        if (item && typeof item === "object" && (item.image_url || item.image || item.figure_url)) {
          figures.push({
            src: item.image_url || item.image || item.figure_url,
            caption: item.caption || item.title || (item.page ? `Manual figure · Page ${item.page}` : "Manual figure"),
          });
        }
      });
    }
    return figures;
  }

  /* =======================================================================
     CHAT RENDERING
     ======================================================================= */

  function scrollFeedToBottom() {
    el.chatFeed.scrollTo({ top: el.chatFeed.scrollHeight, behavior: "smooth" });
  }

  function hideEmptyState() {
    if (el.emptyState.style.display !== "none") {
      el.emptyState.style.display = "none";
    }
  }

  function showEmptyState() {
    el.emptyState.style.display = "";
  }

  function appendUserMessage(text) {
    hideEmptyState();
    const row = document.createElement("div");
    row.className = "msg-row user";
    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-user"></i></div>
      <div class="msg-bubble">${renderMarkdown(text)}</div>
    `;
    el.messages.appendChild(row);
    scrollFeedToBottom();
    return row;
  }

  function appendTypingIndicator() {
    hideEmptyState();
    const row = document.createElement("div");
    row.className = "msg-row assistant";
    row.dataset.typing = "true";
    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-shield-halved"></i></div>
      <div class="msg-bubble">
        <div class="typing-bubble"><span></span><span></span><span></span></div>
      </div>
    `;
    el.messages.appendChild(row);
    scrollFeedToBottom();
    return row;
  }

  function appendAssistantMessage({ text, citations, figures }) {
    hideEmptyState();
    const row = document.createElement("div");
    row.className = "msg-row assistant";

    let citationsHtml = "";
    if (citations && citations.length) {
      citationsHtml = `
        <div class="citations">
          ${citations
            .map(
              (page) =>
                `<span class="citation-pill"><i class="fa-solid fa-bookmark"></i>Source: Page ${escapeHtml(String(page))}</span>`
            )
            .join("")}
        </div>`;
    }

    let figuresHtml = "";
    if (figures && figures.length) {
      figuresHtml = figures
        .map(
          (fig, i) => `
        <div class="figure-card" data-fig-index="${i}">
          <img src="${escapeHtml(resolveFigureSrc(fig.src))}" alt="${escapeHtml(fig.caption)}" loading="lazy" />
          <div class="figure-caption"><i class="fa-solid fa-expand"></i>${escapeHtml(fig.caption)}</div>
        </div>`
        )
        .join("");
    }

    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-shield-halved"></i></div>
      <div class="msg-bubble">
        ${renderMarkdown(text)}
        ${figuresHtml}
        ${citationsHtml}
      </div>
    `;

    el.messages.appendChild(row);

    if (figures && figures.length) {
      row.querySelectorAll(".figure-card").forEach((card) => {
        card.addEventListener("click", () => {
          const idx = Number(card.dataset.figIndex);
          openImageModal(resolveFigureSrc(figures[idx].src), figures[idx].caption);
        });
      });
    }

    scrollFeedToBottom();
    return row;
  }

  function appendSuggestions(forQuestion) {
    const suggestions = pickSuggestions(forQuestion);
    if (!suggestions.length) return;

    const row = document.createElement("div");
    row.className = "suggestions";
    row.innerHTML = suggestions
      .map(
        (text) =>
          `<button class="suggestion-chip" type="button"><i class="fa-solid fa-plus"></i>${escapeHtml(text)}</button>`
      )
      .join("");

    row.querySelectorAll(".suggestion-chip").forEach((chip, i) => {
      chip.addEventListener("click", () => {
        row.remove();
        handleSubmit(suggestions[i]);
      });
    });

    el.messages.appendChild(row);
    scrollFeedToBottom();
  }

  function appendErrorMessage(message) {
    hideEmptyState();
    const row = document.createElement("div");
    row.className = "msg-row assistant";
    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-shield-halved"></i></div>
      <div class="msg-bubble error">
        <div class="error-title"><i class="fa-solid fa-triangle-exclamation"></i>Connection interrupted</div>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
    el.messages.appendChild(row);
    scrollFeedToBottom();
    return row;
  }

  /* =======================================================================
     IMAGE MODAL
     ======================================================================= */

  function openImageModal(src, caption) {
    el.modalImage.src = src;
    el.modalImage.alt = caption || "Manual figure";
    el.modalCaption.textContent = caption || "";
    el.modalOverlay.classList.add("open");
    el.modalOverlay.setAttribute("aria-hidden", "false");
  }

  function closeImageModal() {
    el.modalOverlay.classList.remove("open");
    el.modalOverlay.setAttribute("aria-hidden", "true");
  }

  function initModal() {
    el.modalClose.addEventListener("click", closeImageModal);
    el.modalOverlay.addEventListener("click", (e) => {
      if (e.target === el.modalOverlay) closeImageModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeImageModal();
    });
  }

  /* =======================================================================
     BACKEND QUERY
     ======================================================================= */

  async function queryBackend(question, imageB64) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const payload = {
      question,
      n_results: N_RESULTS,
      drive_mode: state.driveMode,
    };
    if (imageB64) {
      payload.image_b64 = imageB64;
    }

    try {
      const response = await fetch(QUERY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      window.clearTimeout(timeout);

      if (!response.ok) {
        let detail = "";
        try {
          const errBody = await response.json();
          detail = errBody?.detail || errBody?.message || "";
        } catch (_) {
          /* response wasn't JSON — ignore */
        }
        throw new Error(
          detail || `The manual assistant server responded with status ${response.status}.`
        );
      }

      return await response.json();
    } catch (err) {
      window.clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error("The request timed out. The backend may be busy indexing or unreachable.");
      }
      if (err instanceof TypeError) {
        throw new Error(
          "Could not reach the technical manual server at 127.0.0.1:8000. Confirm the FastAPI backend is running."
        );
      }
      throw err;
    }
  }

  function extractAnswerText(payload) {
    return (
      payload?.answer ??
      payload?.response ??
      payload?.result ??
      payload?.text ??
      (typeof payload === "string" ? payload : "") ??
      ""
    );
  }

  async function handleSubmit(question) {
    if (state.isSending) return;

    let trimmed = (question || "").trim();
    const imageB64 = state.currentImageB64;
    if (!trimmed && !imageB64) return;
    if (!trimmed && imageB64) {
      trimmed = "Analyze this image based on the manual.";
    }

    // Capture and clear the image state immediately so the UI resets
    // before the (potentially slow) fetch resolves.
    clearSelectedImage();

    state.isSending = true;
    el.sendBtn.disabled = true;
    el.sendBtn.classList.add("sending");

    appendUserMessage(trimmed);
    state.history.push({ role: "user", text: trimmed });

    const typingRow = appendTypingIndicator();

    try {
      const payload = await queryBackend(trimmed, imageB64);
      const rawAnswer = extractAnswerText(payload);
      const citations = normalizeCitations(payload, rawAnswer);
      const figures = normalizeFigures(payload);
      const cleanText = stripCitationMarkers(rawAnswer) || "The assistant returned an empty response.";

      typingRow.remove();
      appendAssistantMessage({ text: cleanText, citations, figures });
      state.history.push({ role: "assistant", text: cleanText, citations, figures });
      appendSuggestions(trimmed);
    } catch (err) {
      typingRow.remove();
      appendErrorMessage(err.message || "An unexpected error occurred while contacting the backend.");
      checkHealth();
    } finally {
      state.isSending = false;
      el.sendBtn.disabled = false;
      el.sendBtn.classList.remove("sending");
    }
  }

  /* =======================================================================
     INPUT HANDLING
     ======================================================================= */

  /* =======================================================================
     IMAGE UPLOAD (Multimodal RAG)
     ======================================================================= */

  function clearSelectedImage() {
    state.currentImageB64 = null;
    el.imagePreview.src = "";
    el.imagePreviewContainer.hidden = true;
    el.imageInput.value = "";
  }

  function initImageUpload() {
    el.uploadBtn.addEventListener("click", () => {
      el.imageInput.click();
    });

    el.imageInput.addEventListener("change", () => {
      const file = el.imageInput.files && el.imageInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result || "";
        const base64 = String(dataUrl).split(",")[1] || "";
        state.currentImageB64 = base64;
        el.imagePreview.src = dataUrl;
        el.imagePreviewContainer.hidden = false;
      };
      reader.readAsDataURL(file);
    });

    el.removeImageBtn.addEventListener("click", () => {
      clearSelectedImage();
    });
  }

  function autoGrowTextarea() {
    el.questionInput.style.height = "auto";
    el.questionInput.style.height = `${Math.min(el.questionInput.scrollHeight, 140)}px`;
  }

  function initInput() {
    el.inputForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = el.questionInput.value;
      el.questionInput.value = "";
      autoGrowTextarea();
      handleSubmit(value);
    });

    el.questionInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        el.inputForm.requestSubmit();
      }
    });

    el.questionInput.addEventListener("input", autoGrowTextarea);
  }

  function initQuickTriggers() {
    document.querySelectorAll("[data-prompt]").forEach((node) => {
      node.addEventListener("click", () => {
        const prompt = node.dataset.prompt;
        if (window.innerWidth <= 980) closeSidebar();
        handleSubmit(prompt);
      });
    });
  }

  function initClear() {
    el.clearBtn.addEventListener("click", () => {
      el.messages.innerHTML = "";
      state.history = [];
      showEmptyState();
    });
  }

  /* =======================================================================
     INIT
     ======================================================================= */

  function init() {
    const startTrim = typeof alfaGetActiveTrim === "function" ? alfaGetActiveTrim() : "giulia";
    const startMode = TRIM_DNA_MAP[startTrim] || "natural";
    applyDriveModeTheme(startMode);
    initGallery();
    initDnaSelector();
    syncDnaPillUI(startMode);
    initHealthPolling();
    initSidebarToggle();
    initModal();
    initInput();
    initImageUpload();
    initQuickTriggers();
    initClear();
    setGalleryIndex(0);

    // Deep-link support: configurator.html can send visitors here with
    // ?q=<question> pre-filled (e.g. "Ask the manual about the GTAm").
    const params = new URLSearchParams(window.location.search);
    const deepLinkQuestion = params.get("q");
    if (deepLinkQuestion) {
      window.history.replaceState({}, "", window.location.pathname);
      handleSubmit(deepLinkQuestion);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
