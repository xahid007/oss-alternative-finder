// Content script: optionally injects a small banner when a mapping exists.

const BANNER_ID = "oss-alt-finder-banner";
const DISMISSED_KEY_PREFIX = "dismissed::"; // per-host in storage.local

function normalizeHost(hostname) {
  const h = (hostname || "").toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function createBanner({ productName, hostKey, alternatives, maxItems }) {
  // Avoid duplicate injection
  if (document.getElementById(BANNER_ID)) return;

  const wrapper = document.createElement("div");
  wrapper.id = BANNER_ID;

  const items = (alternatives || []).slice(0, maxItems).map((a) => {
    const tags = (a.tags || []).slice(0, 4).join(" • ");
    const meta = [tags, a.notes].filter(Boolean).join(" — ");
    return `
      <div class="oss-alt-item">
        <a class="oss-alt-name" href="${a.url}" target="_blank" rel="noreferrer">${escapeHtml(a.name)}</a>
        <div class="oss-alt-meta">${escapeHtml(meta)}</div>
      </div>
    `;
  }).join("");

  wrapper.innerHTML = `
    <div class="oss-alt-card" role="dialog" aria-label="Open-source alternatives">
      <div class="oss-alt-top">
        <div class="oss-alt-title">Open-source alternatives for <span class="oss-alt-product">${escapeHtml(productName || hostKey)}</span></div>
        <button class="oss-alt-close" type="button" aria-label="Dismiss">×</button>
      </div>
      <div class="oss-alt-body">
        ${items || `<div class="oss-alt-empty">No alternatives listed yet.</div>`}
      </div>
      <div class="oss-alt-actions">
        <button class="oss-alt-hide" type="button">Hide on this site</button>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${BANNER_ID} { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; max-width: 360px; }
    #${BANNER_ID} .oss-alt-card { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background: rgba(255,255,255,0.98); border: 1px solid rgba(0,0,0,0.12); border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.18); overflow: hidden; }
    #${BANNER_ID} .oss-alt-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-bottom: 1px solid rgba(0,0,0,0.06); }
    #${BANNER_ID} .oss-alt-title { font-size: 13px; font-weight: 700; color: #111; line-height: 1.2; }
    #${BANNER_ID} .oss-alt-product { font-weight: 800; }
    #${BANNER_ID} .oss-alt-close { border: 0; background: transparent; font-size: 18px; line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 8px; }
    #${BANNER_ID} .oss-alt-close:hover { background: rgba(0,0,0,0.06); }
    #${BANNER_ID} .oss-alt-body { padding: 10px 12px; max-height: 260px; overflow: auto; }
    #${BANNER_ID} .oss-alt-item { padding: 8px 10px; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; margin-bottom: 8px; }
    #${BANNER_ID} .oss-alt-item:last-child { margin-bottom: 0; }
    #${BANNER_ID} .oss-alt-name { font-size: 13px; font-weight: 700; color: #0b57d0; text-decoration: none; }
    #${BANNER_ID} .oss-alt-name:hover { text-decoration: underline; }
    #${BANNER_ID} .oss-alt-meta { margin-top: 2px; font-size: 12px; color: #444; }
    #${BANNER_ID} .oss-alt-actions { padding: 10px 12px; border-top: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: flex-end; }
    #${BANNER_ID} .oss-alt-hide { border: 1px solid rgba(0,0,0,0.12); background: #fff; border-radius: 10px; padding: 6px 10px; cursor: pointer; font-size: 12px; }
    #${BANNER_ID} .oss-alt-hide:hover { background: rgba(0,0,0,0.04); }
    #${BANNER_ID} .oss-alt-empty { font-size: 12px; color: #444; }
    @media (prefers-color-scheme: dark) {
      #${BANNER_ID} .oss-alt-card { background: rgba(24,24,24,0.98); border-color: rgba(255,255,255,0.16); }
      #${BANNER_ID} .oss-alt-title { color: #f3f3f3; }
      #${BANNER_ID} .oss-alt-close:hover { background: rgba(255,255,255,0.10); }
      #${BANNER_ID} .oss-alt-item { border-color: rgba(255,255,255,0.10); }
      #${BANNER_ID} .oss-alt-meta { color: #cfcfcf; }
      #${BANNER_ID} .oss-alt-hide { background: rgba(24,24,24,0.98); color: #f3f3f3; border-color: rgba(255,255,255,0.18); }
      #${BANNER_ID} .oss-alt-hide:hover { background: rgba(255,255,255,0.08); }
    }
  `;

  document.documentElement.appendChild(style);
  document.documentElement.appendChild(wrapper);

  const closeBtn = wrapper.querySelector(".oss-alt-close");
  const hideBtn = wrapper.querySelector(".oss-alt-hide");

  closeBtn?.addEventListener("click", () => wrapper.remove());
  hideBtn?.addEventListener("click", async () => {
    const key = DISMISSED_KEY_PREFIX + hostKey;
    await chrome.storage.local.set({ [key]: true });
    wrapper.remove();
  });
}

async function main() {
  // Only for normal pages
  if (!location?.hostname || !/^https?:$/.test(location.protocol)) return;

  const hostname = normalizeHost(location.hostname);

  // If dismissed for this host, do nothing
  const dismissedKey = DISMISSED_KEY_PREFIX + hostname;
  const dismissed = await chrome.storage.local.get({ [dismissedKey]: false });
  if (dismissed[dismissedKey]) return;

  const res = await chrome.runtime.sendMessage({
    type: "GET_ALTERNATIVES_FOR_HOST",
    hostname
  });

  if (!res?.ok) return;
  if (!res.settings?.bannerEnabled) return;
  if (!res.found) return;

  createBanner({
    productName: res.found.name,
    hostKey: res.found.key,
    alternatives: res.found.alternatives,
    maxItems: res.settings.bannerMaxItems || 3
  });
}

main().catch(() => {});
