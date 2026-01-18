# Open-Source Alternative Finder (Chrome/Brave Extension)

A lightweight, privacy-respecting extension that suggests **open-source alternatives** for the product site you’re visiting.

- Works in **Brave** and **Chrome** (Manifest V3)
- No tracking, no analytics
- Suggestions come from a **curated open dataset** (`data/mappings.json`)

## Features

- **Popup UI**: shows alternatives for the current site
- **Search**: look up products/domains manually
- **On-page banner** (optional): quick suggestions on supported sites
- **Contributor-friendly dataset**: add/edit mappings via PRs

## Install (Developer Mode)

### Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

### Brave
1. Open `brave://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

## Configure
Open the extension **Options** page to:
- Enable/disable the on-page banner
- Change how many alternatives appear in the banner
- Clear “Hide on this site” dismissals

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md).

## Privacy
- No telemetry
- No background network calls required for normal operation
- All mappings are bundled locally in the extension

## Roadmap
- Optional “update mappings” from GitHub Releases (user-initiated)
- Better matching (path rules, product signatures)
- Community voting/notes (still curated)
