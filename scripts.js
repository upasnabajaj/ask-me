(() => {
  "use strict";

  /* ---------- Fonts ---------- */
  const FONTS = [
    { id: "instrument-serif", label: "Instrument Serif", family: '"Instrument Serif", Georgia, serif' },
    { id: "playfair-display", label: "Playfair Display", family: '"Playfair Display", Georgia, serif' },
    { id: "fraunces", label: "Fraunces", family: '"Fraunces", Georgia, serif' },
    { id: "bodoni-moda", label: "Bodoni Moda", family: '"Bodoni Moda", "Didot", serif' },
    { id: "cormorant", label: "Cormorant Garamond", family: '"Cormorant Garamond", Georgia, serif' },
    { id: "italiana", label: "Italiana", family: '"Italiana", Georgia, serif' },
    { id: "space-grotesk", label: "Space Grotesk", family: '"Space Grotesk", system-ui, sans-serif' },
    { id: "dm-sans", label: "DM Sans", family: '"DM Sans", system-ui, sans-serif' },
    { id: "bebas-neue", label: "Bebas Neue", family: '"Bebas Neue", sans-serif' },
    { id: "archivo-black", label: "Archivo Black", family: '"Archivo Black", sans-serif' },
    { id: "unbounded", label: "Unbounded", family: '"Unbounded", system-ui, sans-serif' },
    { id: "rubik-mono", label: "Rubik Mono One", family: '"Rubik Mono One", monospace' },
  ];

  const COLOR_SWATCHES = [
    "#1a1a1a", "#1d1f50", "#ff4343", "#f5e6d3", "#00c2a8",
    "#ffb703", "#8338ec", "#fb5607", "#3a86ff", "#90be6d",
    "#5f0f40", "#ffd166", "#072ac8", "#ffffff",
  ];
  const BG_SWATCHES = ["#f4f1ea", "#ffffff", "#1a1a1a", "#0b1026", "#fdf0d5", "#e9ecef", "#ffe8d6"];

  const FALLBACK_WORDS = ["ECHO", "DRIFT", "RAY", "FORM", "TYPE", "VOID", "HUSH", "FLUX", "NOVA", "ZEST", "PULSE", "LYRIC"];

  /* ---------- State ---------- */
  const canvas = document.getElementById("canvas");
  const letters = []; // {id,char,x,y,size,rotate,color,font,z}
  let nextId = 1;
  let zCounter = 10;
  let selectedId = null;

  const defaults = {
    font: FONTS[0].id,
    size: 96,
    rotate: 0,
    color: "#1a1a1a",
  };

  let canvasBg = getComputedStyle(document.documentElement).getPropertyValue("--canvas-bg").trim() || "#f4f1ea";

  const dragState = { active: false, id: null, offX: 0, offY: 0 };
  const rotState = { active: false, id: null, startRotate: 0, startAngle: 0 };
  const resState = { active: false, id: null, startSize: 0, startDist: 0 };

  /* ---------- Helpers ---------- */
  function byId(id) { return letters.find(l => l.id === id); }
  function fontById(id) { return FONTS.find(f => f.id === id) || FONTS[0]; }
  function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------- DOM construction ---------- */
  function makeEl(l) {
    const el = document.createElement("div");
    el.className = "letter";
    el.dataset.id = l.id;
    el.innerHTML = `<span class="glyph">${escapeHtml(l.char)}</span>
      <div class="handle handle-rotate" title="rotate"></div>
      <div class="handle handle-resize" title="resize"></div>`;
    // handle events
    const rot = el.querySelector(".handle-rotate");
    const res = el.querySelector(".handle-resize");
    rot.addEventListener("pointerdown", onRotHandleDown);
    res.addEventListener("pointerdown", onResHandleDown);
    canvas.appendChild(el);
    syncEl(l);
  }

  function syncEl(l) {
    const el = canvas.querySelector(`[data-id="${l.id}"]`);
    if (!el) return;
    el.style.left = l.x + "px";
    el.style.top = l.y + "px";
    el.style.fontSize = l.size + "px";
    el.style.color = l.color;
    el.style.fontFamily = fontById(l.font).family;
    el.style.transform = `translate(-50%, -50%) rotate(${l.rotate}deg)`;
    el.style.zIndex = l.z;
    const g = el.querySelector(".glyph");
    g.textContent = l.char;
    g.style.fontFamily = fontById(l.font).family;
  }

  function updateSelectionClass() {
    canvas.querySelectorAll(".letter").forEach(el => {
      el.classList.toggle("selected", Number(el.dataset.id) === selectedId);
    });
  }

  function addLetter(char, overrides = {}) {
    if (char === "\n" || char === " ") return null;
    const rect = canvas.getBoundingClientRect();
    const l = {
      id: nextId++,
      char: char,
      x: rect.width / 2 + (Math.random() - 0.5) * 60,
      y: rect.height / 2 + (Math.random() - 0.5) * 60,
      size: defaults.size,
      rotate: defaults.rotate,
      color: defaults.color,
      font: defaults.font,
      z: ++zCounter,
    };
    Object.assign(l, overrides);
    letters.push(l);
    makeEl(l);
    select(l.id);
    updateCount();
    return l;
  }

  function deleteLetter(id) {
    const idx = letters.findIndex(l => l.id === id);
    if (idx < 0) return;
    letters.splice(idx, 1);
    const el = canvas.querySelector(`[data-id="${id}"]`);
    if (el) el.remove();
    if (selectedId === id) selectedId = null;
    updateSelectionClass();
    updateCount();
    syncControlsToSelection();
    updateSelInfo();
  }

  function clearAll() {
    letters.length = 0;
    canvas.querySelectorAll(".letter").forEach(e => e.remove());
    selectedId = null;
    updateSelectionClass();
    updateCount();
    syncControlsToSelection();
    updateSelInfo();
  }

  function select(id) {
    const l = byId(id);
    if (!l) return;
    l.z = ++zCounter;
    syncEl(l);
    selectedId = id;
    updateSelectionClass();
    syncControlsToSelection();
    updateSelInfo();
  }

  function deselect() {
    selectedId = null;
    updateSelectionClass();
    syncControlsToSelection();
    updateSelInfo();
  }

  /* ---------- Sync props UI ---------- */
  const fontSelect = document.getElementById("fontSelect");
  const sizeRange = document.getElementById("sizeRange");
  const sizeVal = document.getElementById("sizeVal");
  const rotRange = document.getElementById("rotRange");
  const rotVal = document.getElementById("rotVal");
  const colorPicker = document.getElementById("colorPicker");
  const selInfo = document.getElementById("selInfo");
  const countEl = document.getElementById("count");

  // populate font select
  FONTS.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.label;
    fontSelect.appendChild(opt);
  });

  function currentSource() { // selected letter or defaults
    const l = selectedId ? byId(selectedId) : null;
    return l ? l : defaults;
  }

  function syncControlsToSelection() {
    const s = currentSource();
    fontSelect.value = s.font;
    sizeRange.value = s.size;
    sizeVal.textContent = s.size;
    rotRange.value = s.rotate;
    rotVal.textContent = Math.round(s.rotate) + "°";
    colorPicker.value = s.color;
  }

  function updateSelInfo() {
    const l = selectedId ? byId(selectedId) : null;
    selInfo.textContent = l
      ? `"${l.char}" · ${fontById(l.font).label} · ${l.size}px · ${Math.round(l.rotate)}°`
      : "Nothing selected. Click a letter.";
  }

  function updateCount() {
    countEl.textContent = letters.length + (letters.length === 1 ? " letter" : " letters");
  }

  /* ---------- Event wiring ---------- */
  // add
  document.getElementById("addBtn").addEventListener("click", () => {
    const val = document.getElementById("textInput").value;
    if (!val.trim()) return;
    [...val].forEach((ch, i) => {
      if (ch === " " || ch === "\n") return;
      addLetter(ch);
    });
    document.getElementById("textInput").value = "";
  });

  document.getElementById("textInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("addBtn").click();
    }
  });

  // quick letters
  const quick = document.getElementById("quickLetters");
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(ch => {
    const b = document.createElement("button");
    b.className = "qb";
    b.textContent = ch;
    b.addEventListener("click", () => addLetter(ch));
    quick.appendChild(b);
  });

  // color swatches (letters)
  const colorSwatches = document.getElementById("colorSwatches");
  COLOR_SWATCHES.forEach(c => {
    const s = document.createElement("button");
    s.className = "swatch";
    s.style.background = c;
    s.addEventListener("click", () => {
      const t = currentSource();
      // apply to selected if any, else default
      if (selectedId) {
        const l = byId(selectedId);
        l.color = c;
        syncEl(l);
      } else defaults.color = c;
      colorPicker.value = c;
      syncControlsToSelection();
    });
    colorSwatches.appendChild(s);
  });

  // bg swatches
  const bgSwatches = document.getElementById("bgSwatches");
  BG_SWATCHES.forEach(c => {
    const s = document.createElement("button");
    s.className = "swatch";
    s.style.background = c;
    s.addEventListener("click", () => {
      canvasBg = c;
      canvas.style.background = c;
    });
    bgSwatches.appendChild(s);
  });

  // props controls
  fontSelect.addEventListener("change", () => {
    const v = fontSelect.value;
    if (selectedId) { const l = byId(selectedId); l.font = v; syncEl(l); }
    else defaults.font = v;
  });
  sizeRange.addEventListener("input", () => {
    const v = +sizeRange.value;
    sizeVal.textContent = v;
    if (selectedId) { const l = byId(selectedId); l.size = v; syncEl(l); }
    else defaults.size = v;
    if (selectedId) updateSelInfo();
  });
  rotRange.addEventListener("input", () => {
    const v = +rotRange.value;
    rotVal.textContent = v + "°";
    if (selectedId) { const l = byId(selectedId); l.rotate = v; syncEl(l); }
    else defaults.rotate = v;
    if (selectedId) updateSelInfo();
  });
  colorPicker.addEventListener("input", () => {
    const v = colorPicker.value;
    if (selectedId) { const l = byId(selectedId); l.color = v; syncEl(l); }
    else defaults.color = v;
  });

  document.getElementById("frontBtn").addEventListener("click", () => {
    if (!selectedId) return;
    const l = byId(selectedId);
    l.z = ++zCounter;
    syncEl(l);
  });
  document.getElementById("dupBtn").addEventListener("click", () => {
    if (!selectedId) return;
    const l = byId(selectedId);
    const copy = addLetter(l.char, {
      x: l.x + 24, y: l.y + 24, size: l.size, rotate: l.rotate,
      color: l.color, font: l.font,
    });
    if (copy) select(copy.id);
  });
  document.getElementById("delBtn").addEventListener("click", () => {
    if (selectedId) deleteLetter(selectedId);
  });

  // top actions
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (letters.length && !confirm("Clear all letters?")) return;
    clearAll();
  });

  document.getElementById("randomizeBtn").addEventListener("click", () => randomize());

  document.getElementById("downloadBtn").addEventListener("click", () => downloadPng());

  document.getElementById("inspireBtn").addEventListener("click", () => inspire());

  /* ---------- Interactions: drag / rotate / resize ---------- */
  canvas.addEventListener("pointerdown", (e) => {
    const letterEl = e.target.closest(".letter");
    if (!letterEl) { deselect(); return; }
    // if handle, handled by handle listeners
    if (e.target.classList.contains("handle")) return;
    const id = Number(letterEl.dataset.id);
    select(id);
    const l = byId(id);
    const rect = canvas.getBoundingClientRect();
    dragState.active = true;
    dragState.id = id;
    dragState.offX = e.clientX - rect.left - l.x;
    dragState.offY = e.clientY - rect.top - l.y;
  });

  function onRotHandleDown(e) {
    e.stopPropagation();
    const letterEl = e.currentTarget.closest(".letter");
    const id = Number(letterEl.dataset.id);
    select(id);
    const l = byId(id);
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    rotState.active = true;
    rotState.id = id;
    rotState.startRotate = l.rotate;
    rotState.startAngle = Math.atan2(py - l.y, px - l.x) * 180 / Math.PI;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onResHandleDown(e) {
    e.stopPropagation();
    const letterEl = e.currentTarget.closest(".letter");
    const id = Number(letterEl.dataset.id);
    select(id);
    const l = byId(id);
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const dist = Math.hypot(px - l.x, py - l.y);
    resState.active = true;
    resState.id = id;
    resState.startSize = l.size;
    resState.startDist = dist || 1;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  document.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    if (dragState.active) {
      const l = byId(dragState.id);
      if (l) {
        l.x = e.clientX - rect.left - dragState.offX;
        l.y = e.clientY - rect.top - dragState.offY;
        syncEl(l);
      }
    }
    if (rotState.active) {
      const l = byId(rotState.id);
      if (l) {
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const ang = Math.atan2(py - l.y, px - l.x) * 180 / Math.PI;
        l.rotate = rotState.startRotate + (ang - rotState.startAngle);
        syncEl(l);
      }
    }
    if (resState.active) {
      const l = byId(resState.id);
      if (l) {
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const dist = Math.hypot(px - l.x, py - l.y);
        l.size = Math.max(12, Math.round(resState.startSize * (dist / resState.startDist)));
        syncEl(l);
      }
    }
    if ((dragState.active || rotState.active || resState.active) && selectedId) {
      syncControlsToSelection();
      updateSelInfo();
    }
  });

  document.addEventListener("pointerup", () => {
    dragState.active = false;
    rotState.active = false;
    resState.active = false;
  });

  // keyboard
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;

    if (e.key === "Escape") { deselect(); return; }
    if (selectedId) {
      const l = byId(selectedId);
      const step = e.shiftKey ? 10 : 2;
      if (e.key === "ArrowLeft") { l.x -= step; syncEl(l); e.preventDefault(); }
      else if (e.key === "ArrowRight") { l.x += step; syncEl(l); e.preventDefault(); }
      else if (e.key === "ArrowUp") { l.y -= step; syncEl(l); e.preventDefault(); }
      else if (e.key === "ArrowDown") { l.y += step; syncEl(l); e.preventDefault(); }
      else if (e.key === "Delete" || e.key === "Backspace") {
        deleteLetter(selectedId); e.preventDefault();
      }
      else if (e.key === "+") { l.size = Math.min(400, l.size + 8); syncEl(l); syncControlsToSelection(); updateSelInfo(); e.preventDefault(); }
      else if (e.key === "-") { l.size = Math.max(12, l.size - 8); syncEl(l); syncControlsToSelection(); updateSelInfo(); e.preventDefault(); }
    }

    // type letters anywhere
    if (e.key && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const rect = canvas.getBoundingClientRect();
      addLetter(e.key);
      // move last added to where? center with small jitter done in addLetter; fine.
    }
  });

  /* ---------- Randomize ---------- */
  function randomize() {
    clearAll();
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const n = 14 + Math.floor(Math.random() * 10);
    const fonts = FONTS.map(f => f.id);
    for (let i = 0; i < n; i++) {
      const ch = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      addLetter(ch, {
        x: Math.random() * w * 0.82 + w * 0.09,
        y: Math.random() * h * 0.82 + h * 0.09,
        size: 36 + Math.floor(Math.random() * 210),
        rotate: Math.round((Math.random() * 90 - 45) * 10) / 10,
        color: rand(COLOR_SWATCHES),
        font: rand(fonts),
      });
    }
    // deselect last by clearing selection (randomize shouldn't leave one selected? keep selection optional). Deselect.
    selectedId = null;
    updateSelectionClass();
    syncControlsToSelection();
    updateSelInfo();
  }

  /* ---------- Inspire (Sarvam) ---------- */
  async function inspire() {
    const btn = document.getElementById("inspireBtn");
    btn.textContent = "…";
    let word = null;
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Give me one short evocative word of 3 to 7 letters for abstract typographic art. Reply with the word only, uppercase, no punctuation." }),
      });
      if (r.ok) {
        const data = await r.json();
        const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
        const w = content.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 8);
        if (w.length >= 3) word = w;
      }
    } catch (e) { /* fall back */ }
    if (!word) word = rand(FALLBACK_WORDS);
    // arrange letters in a gentle diagonal
    clearAll();
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const chars = [...word];
    const total = chars.length;
    const start = { x: w * 0.15, y: h * 0.35 };
    const step = { x: (w * 0.7) / Math.max(total - 1, 1), y: (h * 0.3) / Math.max(total - 1, 1) };
    const fonts = FONTS.map(f => f.id);
    chars.forEach((ch, i) => {
      addLetter(ch, {
        x: start.x + step.x * i + (Math.random() - 0.5) * 30,
        y: start.y + step.y * i + (Math.random() - 0.5) * 30,
        size: 90 + Math.floor(Math.random() * 80),
        rotate: (Math.random() * 40 - 20),
        color: rand(COLOR_SWATCHES),
        font: rand(fonts),
      });
    });
    // deselect
    selectedId = null;
    updateSelectionClass();
    syncControlsToSelection();
    updateSelInfo();
    btn.textContent = "Inspire";
  }

  /* ---------- Download PNG ---------- */
  async function downloadPng() {
    await (document.fonts ? document.fonts.ready : Promise.resolve());
    const rect = canvas.getBoundingClientRect();
    const dpr = 2;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(rect.width * dpr));
    c.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = c.getContext("2d");
    // background
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, c.width, c.height);
    const ordered = [...letters].sort((a, b) => a.z - b.z);
    for (const l of ordered) {
      const f = fontById(l.font);
      ctx.save();
      ctx.translate(l.x * dpr, l.y * dpr);
      ctx.rotate((l.rotate * Math.PI) / 180);
      ctx.fillStyle = l.color;
      ctx.font = `700 ${l.size * dpr}px ${f.family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(l.char, 0, 0);
      ctx.restore();
    }
    try {
      const url = c.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "letterplay.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Could not download: " + e.message);
    }
  }

  /* ---------- Init ---------- */
  // set canvas bg initial
  canvas.style.background = canvasBg;

  // expose defaults
  syncControlsToSelection();
  updateCount();
  updateSelInfo();

  // set canvas min height safety
  if (canvas.clientHeight < 40) {
    canvas.style.minHeight = "60vh";
  }
})();