---
name: generate-promptvault-library
description: Generate a PromptVault-compatible JSON library of prompts organized by theme. Use when the user wants to create a batch of prompts to import into PromptVault.
---

# PromptVault Library Generator

You are helping the user generate a prompt library for PromptVault in the exact JSON format required for import.

## JSON Format

### Library format (recommended — includes theme creation)

```json
[
  {
    "theme": {
      "id": "short-kebab-id",
      "label": "Display Name",
      "icon": "🎯",
      "color": "#6C63FF"
    },
    "prompts": [
      {
        "title": "Prompt title",
        "body": "Full prompt content...",
        "tags": ["tag1", "tag2"],
        "lang": "fr",
        "type": "task"
      }
    ]
  }
]
```

### Flat format (prompts only, assigned to existing themes)

```json
[
  {
    "title": "Prompt title",
    "body": "Full prompt content...",
    "theme": "existing-theme-id",
    "tags": ["tag1"],
    "lang": "fr",
    "type": "task"
  }
]
```

## Field reference

| Field | Required | Values | Notes |
|-------|----------|--------|-------|
| `theme.id` | yes | kebab-case string | Must be unique, e.g. `marketing`, `code-review` |
| `theme.label` | yes | string | Display name shown in sidebar |
| `theme.icon` | no | single emoji | Default: 🗂️ |
| `theme.color` | no | hex color | Default: #6C63FF |
| `title` | yes | string | Short, descriptive |
| `body` | yes | string | The full prompt text |
| `tags` | no | string[] | For filtering |
| `lang` | no | `"fr"` or `"en"` | Default: fr |
| `type` | no | `"task"`, `"persona"`, `"template"` | Default: task |

## Workflow

1. Ask the user:
   - **Topic/domain** — what kind of prompts? (e.g. "SEO marketing", "Python code review", "cooking recipes")
   - **Count** — how many prompts per theme? (suggest 5–15)
   - **Language** — `fr` or `en`?
   - **Themes** — one theme or multiple? Let them describe.

2. Generate the JSON in **library format** (with themes).

3. Output **ONLY** the raw JSON — no markdown code block, no explanation, no surrounding text. Just the JSON array starting with `[` and ending with `]`.

4. The user will save the file and import it via PromptVault Settings → Data → "Importer une bibliothèque JSON".

## Quality guidelines

- Prompts should be **complete and immediately usable** — not just titles
- `body` should start with role-setting when applicable: "Tu es un expert en..."
- Each prompt should be **distinct** — no near-duplicates
- Tags should be concise (1–3 words, lowercase)
- Theme colors: use visually distinct hex colors per theme
