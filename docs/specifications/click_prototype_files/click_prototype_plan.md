# 📑 Data Contract — Interactive Reading MVP  (2025‑07 **Revised – Anchor‑Injection Edition**)

> **Scope:** Defines artefacts, schemas and hand‑off points between the *Pre‑processor* (HTML Extractor + Anchor Patcher), the **single** *AI Workflow* (book‑insight + hotspot generator) and the *Core API / DB*.

---

## 0  Lifecycle & Versioning

| Field            | Value                                                             |
| ---------------- | ----------------------------------------------------------------- |
| `schema_version` | `0.4.0`   ⇢ **breaking** (replaces `char_range` with `anchor_id`) |
| `last_updated`   | `2025‑07‑29`                                                      |
| **Change rule**  | MAJOR – breaking · MINOR – additive · PATCH – docs/typo           |

---

## 1  High‑level Flow

```mermaid
graph TD
  A[EPUB / PDF] --> B(HTML Extractor)
  B -->|cleaned HTML| C[S3 / OSS : chapters/{idx}.html]
  C --> D[AI Workflow  ➜  Book‑insight ＋ Hotspots]
  D -->|hotspots.json| E[Anchor Patcher Script]
  E -->|HTML v2 (with <span>)| C
  E -->|hotspots.json| F[(PostgreSQL)]
  F --> G[Core API]
  G --> H[Frontend Renderer]
```

> **Key difference:** *Anchor Patcher* runs **after** the AI Workflow, finds each `excerpt` in the chapter HTML, injects a `<span id="h123" class="hotspot">`, uploads the patched HTML, then writes hotspot rows into Postgres.

---

## 2  HTML Extraction & Cleaning

*保持 v0.3 逻辑—仅提炼**干净 HTML**。Anchor 不在此阶段插入。*

Output directories:

* `cleaned_html/✱.html`   ⇒ CDN path `/chapters/{idx}.html`
* `extraction_report.json` ⇒ rule hits / skipped pages

---

## 3  Anchor Patcher (NEW)

| Step | Action                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------- |
| ①    | Receive *hotspots.json* + chapter HTML path                                                          |
| ②    | For each hotspot: use **TextQuoteSelector** (`excerpt`, `prefix`, `suffix`) to create DOM `Range`    |
| ③    | Insert `<span id="{anchor_id}" class="hotspot" data-cat="{category}"></span>` **before** range start |
| ④    | De‑duplicate: if same excerpt already has anchor, skip                                               |
| ⑤    | Upload patched HTML to same CDN path, bump query ver (`?v=2`)                                        |
| ⑥    | POST hotspot rows to `/api/internal/hotspots/bulk`                                                   |

---

## 4  AI Workflow

### 4.1 Input (unchanged)

```jsonc
{
  "book_id": "UUID",
  "chapter_html_prefix": "https://cdn…/{idx}.html",
  "book_meta": { "title": "…", "author": "…" }
}
```

### 4.2 Output — `hotspots.json`  ( **BREAKING** )

```jsonc
[
  {
    "hotspot_id" : "uuid",
    "chapter_idx" : 3,
    "category"    : "Scenic",
    "excerpt"     : "Passing through Resurrection Gate …",
    "selector"    : {
      "type"   : "TextQuote",        // W3C selector
      "exact"  : "Passing through Resurrection Gate …",
      "prefix" : "he turned his",
      "suffix" : "toward Theatre Square"
    },
    "image_url"   : "https://…",
    "prompt_json" : { … },
    "created_at"  : "ISO‑8601"
  }
]
```

*Removed*: **`char_range`**

---

## 5  DB Schema (PostgreSQL)

### `chapters`

```sql
CREATE TABLE chapters (
  book_id    BIGINT,
  idx        INT,
  html_url   VARCHAR(512),
  html_ver   SMALLINT DEFAULT 1,
  PRIMARY KEY (book_id, idx)
);
```

### `hotspots`

```sql
CREATE TABLE hotspots (
  id           BIGSERIAL PRIMARY KEY,
  book_id      BIGINT      NOT NULL,
  chapter_idx  INT         NOT NULL,
  anchor_id    VARCHAR(64) NOT NULL,
  category     VARCHAR(32) NOT NULL,
  excerpt      TEXT        NOT NULL,
  image_url    VARCHAR(512),
  prompt_json  JSONB,
  created_at   TIMESTAMP   DEFAULT NOW(),
  UNIQUE (book_id, anchor_id)
);
```

---

## 6  Glossary (updated)

| Term                  | Meaning                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| **Anchor ID**         | ID of `<span class="hotspot">` inserted into chapter HTML; unique per chapter |
| **TextQuoteSelector** | `{exact, prefix, suffix}` triple used to locate the excerpt inside HTML       |
| **Hotspot**           | Interactive dot rendered from `<span.hotspot>` that opens rich‑media card     |

---

## 7  Error & Retry Policy  (anchor‑aware)

| Stage             | Retry          | Notes                                                        |
| ----------------- | -------------- | ------------------------------------------------------------ |
| Anchor patch fail | 3×             | if selector not found, mark `status=missing`, escalate Slack |
| CDN upload fail   | 3× exponential | bump `html_ver`, purge cache                                 |

---

## 8  Sample hotspot row

```json
{
  "id"         : 123,
  "book_id"    : 42,
  "chapter_idx": 3,
  "anchor_id"  : "hA1B2",
  "category"   : "Abstract",
  "excerpt"    : "A king fortifies himself with a castle, a gentleman with a desk.",
  "image_url"  : "https://cdn…/images/desk.jpg",
  "created_at" : "2025-07-29T10:15:00Z"
}
```

---

© ImaRead · Data Contract v0.4 — team‑review ready
