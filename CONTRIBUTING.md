# Contributing

Thanks for helping expand the mapping dataset.

## Add or update a mapping

Edit: `data/mappings.json`

Each key is a domain (e.g. `notion.so`).

Minimal structure:

```json
"example.com": {
  "name": "Example",
  "category": "Category",
  "alternatives": [
    {
      "name": "AltName",
      "url": "https://github.com/org/repo",
      "tags": ["tag1", "tag2"],
      "notes": "One sentence about why it’s comparable."
    }
  ]
}
```

### Rules
- Alternatives should be **open-source** (link to repo when possible)
- Avoid affiliate links
- Keep notes factual and short
- Projects are considered valid alternatives if their core software is open source, even if they offer paid hosting or enterprise features.


## Quality checklist
- Product name is correct
- Repo URLs are correct
- Tags are short and relevant

Open a PR, and include a quick rationale in the description.
