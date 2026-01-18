const contentEl = document.getElementById("content");
const subtitleEl = document.getElementById("subtitle");
const searchEl = document.getElementById("search");
const dataLinkEl = document.getElementById("dataLink");
const suggestLinkEl = document.getElementById("suggestLink");
const optionsLinkEl = document.getElementById("optionsLink");

let mappings = null;
let currentFound = null;
let currentHost = null;

// TODO: change these after you publish your repo
const REPO_WEB = "https://github.com/yourname/oss-alternative-finder";
const MAPPINGS_PATH = "data/mappings.json";

function normalizeHost(hostname) {
  const h = (hostname || "").toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

async function loadMappings() {
  if (mappings) return mappings;
  const url = chrome.runtime.getURL("data/mappings.json");
  const res = await fetch(url);
  mappings = await res.json();
  return mappings;
}

function findByQuery(mappingsObj, q) {
  const query = (q || "").trim().toLowerCase();
  if (!query) return [];

  const results = [];
  for (const [domain, entry] of Object.entries(mappingsObj)) {
    const hay = `${domain} ${entry.name || ""} ${entry.category || ""}`.toLowerCase();
    if (hay.includes(query)) {
      results.push({ domain, entry });
      continue;
    }
    const alts = entry.alternatives || [];
    if (alts.some((a) => (a.name || "").toLowerCase().includes(query))) {
      results.push({ domain, entry });
    }
  }
  return results.slice(0, 10);
}

function renderEntry(domain, entry, contextLabel) {
  const alts = entry.alternatives || [];
  const category = entry.category ? `<span class="badge">${escapeHtml(entry.category)}</span>` : "";

  return `
    <div class="card">
      <h3>${escapeHtml(entry.name || domain)} ${category}</h3>
      <div class="muted">${escapeHtml(contextLabel || domain)}</div>
      ${alts.length ? alts.map(renderAlt).join("") : `<div class="muted">No alternatives listed yet.</div>`}
    </div>
  `;
}

function renderAlt(alt) {
  const tags = (alt.tags || []).join(" • ");
  const notes = alt.notes ? alt.notes : "";
  const meta = [tags, notes].filter(Boolean).join(" — ");

  return `
    <div class="alt">
      <div class="name">
        <a href="${escapeAttr(alt.url)}" target="_blank" rel="noreferrer">${escapeHtml(alt.name)}</a>
      </div>
      <div class="meta">${escapeHtml(meta)}</div>
    </div>
  `;
}

function renderEmpty(msg) {
  contentEl.innerHTML = `<div class="muted">${escapeHtml(msg)}</div>`;
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

function escapeAttr(s) {
  return String(s).replace(/"/g, "%22");
}

async function getActiveTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url || "";
}

function buildSuggestIssueUrl(hostname, detectedName) {
  const title = `Add mapping for ${hostname}`;
  const bodyLines = [
    `**Domain:** ${hostname}`,
    detectedName ? `**Product name:** ${detectedName}` : `**Product name:** (fill in)`,
    "",
    "**Alternatives (OSS repos):**",
    "- Name: ",
    "  Repo URL: ",
    "  Why comparable: ",
    "- Name: ",
    "  Repo URL: ",
    "  Why comparable: ",
    "",
    "**Notes:**",
    "- (optional) category, self-hosted, etc."
  ];

  const url = new URL(`${REPO_WEB}/issues/new`);
  url.searchParams.set("title", title);
  url.searchParams.set("body", bodyLines.join("\n"));
  return url.toString();
}

async function lookupCurrentTab() {
  const url = await getActiveTabUrl();
  if (!url || !url.startsWith("http")) {
    subtitleEl.textContent = "Not a normal webpage tab.";
    currentFound = null;
    currentHost = null;
    renderEmpty("Open a website tab (http/https) to see alternatives.");
    return;
  }

  let hostname = "";
  try {
    hostname = normalizeHost(new URL(url).hostname);
  } catch {
    hostname = null;
  }

  currentHost = hostname;

  const res = await chrome.runtime.sendMessage({ type: "GET_ALTERNATIVES_FOR_URL", url });

  if (!res?.ok) {
    subtitleEl.textContent = "Error";
    currentFound = null;
    renderEmpty(res?.error || "Something went wrong.");
    return;
  }

  subtitleEl.textContent = `Detected: ${res.hostname}`;
  currentFound = res.found;

  // Update suggest link for current host
  if (hostname) {
    suggestLinkEl.href = buildSuggestIssueUrl(hostname, currentFound?.name || "");
  }

  if (!currentFound) {
    renderEmpty("No mapping found for this site yet. Try searching above, or suggest adding it.");
    return;
  }

  contentEl.innerHTML = renderEntry(currentFound.key, currentFound, `Current site: ${currentFound.key}`);
}

async function init() {
  dataLinkEl.href = `${REPO_WEB}/blob/main/${MAPPINGS_PATH}`;
  suggestLinkEl.href = `${REPO_WEB}/issues/new`;
  optionsLinkEl.addEventListener("click", async (e) => {
    e.preventDefault();
    await chrome.runtime.openOptionsPage();
    window.close();
  });

  await loadMappings();
  await lookupCurrentTab();

  searchEl.addEventListener("input", async () => {
    const q = searchEl.value;
    const m = await loadMappings();

    if (!q.trim()) {
      if (currentFound) {
        contentEl.innerHTML = renderEntry(currentFound.key, currentFound, `Current site: ${currentFound.key}`);
      } else {
        await lookupCurrentTab();
      }
      return;
    }

    const results = findByQuery(m, q);
    if (!results.length) {
      renderEmpty("No results. Try another keyword or domain.");
      return;
    }

    contentEl.innerHTML = results.map((r) => renderEntry(r.domain, r.entry, `Match: ${r.domain}`)).join("");
  });
}

init().catch((err) => {
  subtitleEl.textContent = "Error";
  renderEmpty(err?.message || String(err));
});
