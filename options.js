const bannerEnabledEl = document.getElementById("bannerEnabled");
const bannerMaxItemsEl = document.getElementById("bannerMaxItems");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");
const clearBtn = document.getElementById("clearHides");
const clearStatusEl = document.getElementById("clearStatus");

async function load() {
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!res?.ok) throw new Error(res?.error || "Failed to load settings");

  bannerEnabledEl.checked = !!res.settings.bannerEnabled;
  bannerMaxItemsEl.value = String(res.settings.bannerMaxItems ?? 3);
}

function setStatus(msg) {
  statusEl.textContent = msg;
  setTimeout(() => (statusEl.textContent = ""), 1500);
}

saveBtn.addEventListener("click", async () => {
  const bannerEnabled = bannerEnabledEl.checked;
  const bannerMaxItems = Number(bannerMaxItemsEl.value || 3);

  const res = await chrome.runtime.sendMessage({
    type: "SET_SETTINGS",
    settings: { bannerEnabled, bannerMaxItems }
  });

  if (!res?.ok) {
    setStatus(res?.error || "Save failed");
    return;
  }
  setStatus("Saved!");
});

clearBtn.addEventListener("click", async () => {
  // remove dismissed::* keys
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith("dismissed::"));
  if (keys.length) {
    await chrome.storage.local.remove(keys);
  }
  clearStatusEl.textContent = keys.length ? `Cleared ${keys.length} hidden site(s).` : "Nothing to clear.";
  setTimeout(() => (clearStatusEl.textContent = ""), 2000);
});

load().catch((e) => {
  statusEl.textContent = e?.message || String(e);
});
