// MV3 service worker (module)

let cache = null;

async function loadMappings() {
  if (cache) return cache;
  const url = chrome.runtime.getURL("data/mappings.json");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load data/mappings.json");
  cache = await res.json();
  return cache;
}

function normalizeHost(hostname) {
  const h = (hostname || "").toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

function findMappingForHost(mappings, hostname) {
  const host = normalizeHost(hostname);
  if (mappings[host]) return { key: host, entry: mappings[host] };

  // One-step parent fallback: a.b.example.com -> example.com
  const parts = host.split(".");
  if (parts.length >= 3) {
    const parent = parts.slice(-2).join(".");
    if (mappings[parent]) return { key: parent, entry: mappings[parent] };
  }

  return null;
}

async function getSettings() {
  const defaults = {
    bannerEnabled: true,
    bannerMaxItems: 3
  };
  const stored = await chrome.storage.sync.get(defaults);
  return { ...defaults, ...stored };
}

chrome.runtime.onInstalled.addListener(() => {
  loadMappings().catch(() => {});
  chrome.storage.sync.set({ bannerEnabled: true, bannerMaxItems: 3 }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || !msg.type) return;

    if (msg.type === "GET_ALTERNATIVES_FOR_URL") {
      const mappings = await loadMappings();
      let hostname = "";
      try {
        hostname = new URL(msg.url).hostname;
      } catch {
        sendResponse({ ok: false, error: "Invalid URL" });
        return;
      }

      const found = findMappingForHost(mappings, hostname);
      sendResponse({
        ok: true,
        hostname: normalizeHost(hostname),
        found: found ? { key: found.key, ...found.entry } : null
      });
      return;
    }

    if (msg.type === "GET_ALTERNATIVES_FOR_HOST") {
      const mappings = await loadMappings();
      const found = findMappingForHost(mappings, msg.hostname || "");
      const settings = await getSettings();
      sendResponse({
        ok: true,
        hostname: normalizeHost(msg.hostname || ""),
        found: found ? { key: found.key, ...found.entry } : null,
        settings
      });
      return;
    }

    if (msg.type === "GET_SETTINGS") {
      const settings = await getSettings();
      sendResponse({ ok: true, settings });
      return;
    }

    if (msg.type === "SET_SETTINGS") {
      const next = msg.settings || {};
      const safe = {
        bannerEnabled: !!next.bannerEnabled,
        bannerMaxItems: Math.max(1, Math.min(6, Number(next.bannerMaxItems || 3)))
      };
      await chrome.storage.sync.set(safe);
      sendResponse({ ok: true, settings: safe });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message type" });
  })().catch((err) => {
    sendResponse({ ok: false, error: String(err?.message || err) });
  });

  return true; // async
});
