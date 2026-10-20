/* MicroFoundry shared script: tool list, prices, free trial, unlock codes,
   related tools, copy, offline support. Every page loads this one file. */

const MF = (() => {

  /* ================= SETTINGS YOU MAY WANT TO CHANGE ================= */

  // How many times a tool can be opened for free on one phone.
  const FREE_USES = 5;

  // Opening a tool again within this many minutes doesn't use up another try.
  const SESSION_MINUTES = 30;

  // The all-tools bundle.
  const BUNDLE = { name: "All tools", price: "14.99", code: "ALL", paypal: "" };

  // Paste each PayPal payment link between the quotes once you've made it.
  // A tool with no link stays free with no limit, so nobody is locked out
  // before payments are ready.
  const TOOLS = {
    QuickCounter:  { code: "QC", price: "2.99", paypal: "", what: "Tap to count anything. Your count is kept if you leave.", related: ["PulseCounter", "MicroTimer", "TimeStampTool"] },
    PulseCounter:  { code: "PC", price: "4.99", paypal: "", what: "Count heartbeats or breaths and get a per-minute rate.", related: ["MicroTimer", "QuickCounter", "TimeStampTool"] },
    AutoFormatter: { code: "AF", price: "4.99", paypal: "", what: "Clean up messy pasted text: spacing, line breaks and quotes.", related: ["AutoWriter", "MicroNote", "TimeStampTool"] },
    AutoWriter:    { code: "AW", price: null,   paypal: "", what: "Describe what you need and get a first draft.", related: ["AutoFormatter", "MicroNote", "Decider"] },
    MicroNote:     { code: "MN", price: "4.99", paypal: "", what: "A quick note that saves itself as you type.", related: ["TimeStampTool", "AutoFormatter", "QuickCounter"] },
    TimeStampTool: { code: "TS", price: "2.99", paypal: "", what: "Get the current date and time, ready to paste.", related: ["MicroNote", "MicroTimer", "QuickCounter"] },
    MicroTimer:    { code: "MT", price: "4.99", paypal: "", what: "A stopwatch and a countdown timer that keep time even when your screen locks.", related: ["PulseCounter", "QuickCounter", "TimeStampTool"] },
    Decider:       { code: "DC", price: "2.99", paypal: "", what: "List your options and let Decider pick one.", related: ["MicroNote", "QuickCounter", "AutoWriter"] }
  };

  /* =================================================================== */

  const store = {
    get(key, fallback) { try { const v = localStorage.getItem("mf:" + key); return v === null ? fallback : JSON.parse(v); } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem("mf:" + key, JSON.stringify(value)); } catch (_) {} }
  };

  const toast = (msg) => {
    let el = document.querySelector(".mf-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "mf-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-shown");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("is-shown"), 1800);
  };

  const copy = async (text, doneMsg = "Copied") => {
    if (!text) { toast("Nothing to copy yet"); return; }
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (_) {}
      t.remove();
    }
    toast(doneMsg);
  };

  // Two-tap confirm: the first tap arms the button, a second tap within 3 seconds acts.
  const confirmTap = (btn, prompt, action) => {
    if (btn.dataset.armed) {
      clearTimeout(btn._armT);
      btn.textContent = btn.dataset.label;
      delete btn.dataset.armed;
      action();
      return;
    }
    btn.dataset.label = btn.textContent;
    btn.dataset.armed = "1";
    btn.textContent = prompt;
    btn._armT = setTimeout(() => { btn.textContent = btn.dataset.label; delete btn.dataset.armed; }, 3000);
  };

  // Shrink a big number so it always fits its box (wide font, small phones, long times).
  const fitCache = new WeakMap();
  const fit = (el) => {
    if (!el) return;
    const text = el.textContent;
    const ps = getComputedStyle(el.parentElement);
    const box = el.parentElement.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight) - 4;
    const prev = fitCache.get(el);
    if (prev && prev.len === text.length && prev.box === box) return;
    el.style.fontSize = "";
    const max = parseFloat(getComputedStyle(el).fontSize);
    const r = document.createRange();
    r.selectNodeContents(el);
    const w = r.getBoundingClientRect().width;
    if (w > box && w > 0) el.style.fontSize = Math.floor(max * box / w) + "px";
    fitCache.set(el, { len: text.length, box });
  };
  const fitAll = () => document.querySelectorAll("[data-fit]").forEach(el => { fitCache.delete(el); fit(el); });
  window.addEventListener("resize", fitAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

  const buzz = (ms = 12) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (_) {} };

  /* ---------- Unlock codes ----------
     A code looks like DC-7KQ2-M4XA: the tool, a random part, and a check part
     worked out from the first two. The code maker page uses the same recipe.
     This stops typos and guessing, not a determined programmer. */
  const SALT = "microfoundry-2026";
  const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

  function hashPart(text) {
    let h = 0x811c9dc5;                       // FNV-1a
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    let out = "";
    for (let i = 0; i < 4; i++) { out += ALPHABET[h % ALPHABET.length]; h = Math.floor(h / ALPHABET.length); }
    return out;
  }

  function makeCode(toolCode) {
    let rand = "";
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    bytes.forEach(b => { rand += ALPHABET[b % ALPHABET.length]; });
    return `${toolCode}-${rand}-${hashPart(SALT + toolCode + rand)}`;
  }

  // Returns the tool code ("DC", "ALL"...) a code unlocks, or null if it isn't valid.
  function checkCode(input) {
    const clean = String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const m = clean.match(/^(QC|PC|AF|AW|MN|TS|MT|DC|ALL)([A-Z0-9]{4})([A-Z0-9]{4})$/);
    if (!m) return null;
    return hashPart(SALT + m[1] + m[2]) === m[3] ? m[1] : null;
  }

  const owned = () => store.get("owned", []);
  const owns = (name) => {
    const list = owned();
    return list.includes("ALL") || list.includes(TOOLS[name].code);
  };

  function redeem(input) {
    const what = checkCode(input);
    if (!what) return null;
    const list = owned();
    if (!list.includes(what)) { list.push(what); store.set("owned", list); }
    return what;
  }

  /* ---------- Free trial ---------- */
  const forSale = (name) => !!(TOOLS[name] && TOOLS[name].price && TOOLS[name].paypal);

  function trialState(name) {
    const t = store.get("trial." + name, { uses: 0, last: 0 });
    return { ...t, over: t.uses > FREE_USES };
  }

  function countOpening(name) {
    const t = store.get("trial." + name, { uses: 0, last: 0 });
    const now = Date.now();
    if (now - t.last > SESSION_MINUTES * 60000) t.uses += 1;
    t.last = now;
    store.set("trial." + name, t);
  }

  /* ---------- Page pieces ---------- */
  const base = () => (document.body.dataset.tool || document.body.dataset.sub) ? "../" : "";
  const pricingHref = () => base() + "Pricing/index.html";

  function buyButtons(name) {
    const t = TOOLS[name];
    let html = "";
    if (t && t.paypal) html += `<a class="mf-btn mf-btn--go" href="${t.paypal}" target="_blank" rel="noopener">Buy ${name} for $${t.price}</a>`;
    if (BUNDLE.paypal) html += `<a class="mf-btn" href="${BUNDLE.paypal}" target="_blank" rel="noopener">Get all tools for $${BUNDLE.price}</a>`;
    return html;
  }

  function codeForm(id) {
    return `<form class="mf-code" data-form="${id}">
      <label class="mf-label" for="code-${id}">Have an unlock code?</label>
      <div class="mf-row">
        <input type="text" id="code-${id}" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="DC-XXXX-XXXX">
        <button class="mf-btn" type="submit">Unlock</button>
      </div>
      <p class="mf-note mf-code-msg" aria-live="polite"></p>
    </form>`;
  }

  function wireCodeForms(root) {
    root.querySelectorAll("form.mf-code").forEach(f => {
      f.addEventListener("submit", e => {
        e.preventDefault();
        const input = f.querySelector("input");
        const msg = f.querySelector(".mf-code-msg");
        const what = redeem(input.value);
        if (!what) { msg.textContent = "That code isn't right. Check it against your email and try again."; return; }
        msg.textContent = "";
        toast(what === "ALL" ? "All tools unlocked. Thank you!" : "Unlocked. Thank you!");
        setTimeout(() => location.reload(), 900);
      });
    });
  }

  function lockScreen(name) {
    const t = TOOLS[name];
    const page = document.querySelector(".mf-page");
    const work = document.querySelectorAll(".mf-page > :not(.mf-top):not(.mf-name):not(#mf-foot):not(#mf-more)");
    work.forEach(el => { el.hidden = true; });
    const panel = document.createElement("section");
    panel.className = "mf-plate mf-lock";
    panel.innerHTML = `
      <h2>You've used your ${FREE_USES} free tries</h2>
      <p>${t.what} Buy ${name} once for $${t.price} and keep it on this phone.</p>
      <div class="mf-buy">${buyButtons(name)}</div>
      <p class="mf-note">After paying, you'll get an email with your unlock code, usually within a day.</p>
      ${codeForm("lock")}
      <p class="mf-note"><a href="${pricingHref()}">See all prices</a></p>`;
    page.insertBefore(panel, document.getElementById("mf-more") || document.getElementById("mf-foot"));
    wireCodeForms(panel);
  }

  function trialBar(name, uses) {
    const t = TOOLS[name];
    const bar = document.createElement("div");
    bar.className = "mf-trial";
    bar.innerHTML = `<span>${uses >= FREE_USES ? "Last free try" : `Free try ${uses} of ${FREE_USES}`}</span><a href="${t.paypal}" target="_blank" rel="noopener">Buy for $${t.price}</a>`;
    const at = document.getElementById("mf-more") || document.getElementById("mf-foot");
    at.parentNode.insertBefore(bar, at);
  }

  function chrome() {
    // One-word tool names shrink to fit; longer headings simply wrap.
    document.querySelectorAll(".mf-name").forEach(el => {
      if (/\s/.test(el.textContent.trim())) { el.style.whiteSpace = "normal"; return; }
      el.setAttribute("data-fit", ""); fit(el);
    });
    const name = document.body.dataset.tool;
    const more = document.getElementById("mf-more");
    if (name && more && TOOLS[name]) {
      more.innerHTML = '<h2>You may also like</h2><div class="mf-chips">' +
        TOOLS[name].related.map(n => `<a class="mf-chip" href="../${n}/index.html">${n}</a>`).join("") +
        "</div>";
    }
    const foot = document.getElementById("mf-foot");
    if (foot) foot.innerHTML = `<span>MicroFoundry</span><a href="${pricingHref()}">Pricing</a>`;

    if (name && forSale(name) && !owns(name)) {
      countOpening(name);
      const { uses, over } = trialState(name);
      if (over) lockScreen(name);
      else trialBar(name, uses);
    }
  }

  // Offline support: register one service worker for the whole site.
  function offline() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(base() + "sw.js", { scope: base() || "./" }).catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", () => { chrome(); offline(); });

  return {
    TOOLS, BUNDLE, FREE_USES,
    toast, copy, buzz, store, confirmTap, fit,
    makeCode, checkCode, owns, forSale, buyButtons, codeForm, wireCodeForms
  };
})();
