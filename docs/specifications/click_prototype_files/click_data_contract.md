# 📑 Data Contract — Interactive Reading MVP v0.5

> **Scope**  Defines artefacts, schemas and hand‑off points across **three decoupled workflows** and the Core API/DB.
>
> **Audience**  Pre‑processing dev · Workflow team · Backend dev · Data engineering.
>
> **Status**  Draft v0.5 · 2025‑07‑30

---

## 0  Lifecycle & Versioning

| Field            | Value                                                   |
| ---------------- | ------------------------------------------------------- |
| `schema_version` | `0.4.0` *(BREAKING)*                                    |
| `last_updated`   | `2025‑07‑30`                                            |
| **Change rule**  | MAJOR – breaking · MINOR – additive · PATCH – docs/typo |

---

## 1  Storage Layer (Supabase / Postgres)

| Table          | Purpose                                     | Key Columns                                                             | Produced by                    | Consumed by          |
| -------------- | ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------ | -------------------- |
| **books**      | Master record per book                      | `id`, `title`, `language`, `cover_url`, **`tags jsonb`**                | Tag WF ➡ API                   | Frontend, Analytics  |
| **chapters**   | Chapter HTML metadata                       | `book_id`, `idx`, `html_url`, **`final_html_url`**                      | HTML Extractor & Patch Service | Hotspot WF, Frontend |
| **hotspots**   | Interactive anchors & media                 | `book_id`, `chapter_idx`, `anchor_id`, `excerpt`, `image_url`, `status` | Hotspot WF → Render WF         | Frontend, Analytics  |
| **profiles**   | User‑extended profile (1‑to‑1 `auth.users`) | `id(uuid PK)`, `display_name`, `avatar_url` …                           | Core API                       | Frontend             |
| **event\_log** | Raw user events for KPI                     | `user_id`, `event`, `target_id`, `meta`, `created_at`                   | Frontend SDK                   | KPI Jobs             |

> **Note**  System table `auth.users` lives in `auth` schema and stays untouched.

---

## 2  Workflow Interfaces

### 2.1  Book‑tags WF

*Input*

```jsonc
{
  "book_id": "4d5c…",
  "title": "三体",
  "author": "刘慈欣",
  "bucket_prefix": "https://cdn.xxx.com/books/4d5c/"
}
```

*Output* ⇒ `PATCH /api/books/{book_id}`

```json
{ "tags": ["hard‑sci‑fi", "三体文明", "反乌托邦"] }
```

### 2.2  Hotspot‑pick WF

Same input + JSON output array `hotspots.json`  ➜ `POST /api/workflow/hotspots`.

### 2.3  Render WF

Polls `hotspots` rows where `status = 'pending'` and fills `image_url`, `audio_url`, sets `status = 'success' | 'error'`.

---

## 3  Schema Changes (SQL Delta)

```sql
-- books: add tags
alter table public.books
  add column if not exists tags jsonb default '[]'::jsonb;
create index if not exists books_tags_gin on public.books using gin(tags);

-- chapters: add final html url
alter table public.chapters
  add column if not exists final_html_url text;

-- KPI raw events
create table if not exists public.event_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  event text not null,
  target_id text,
  meta jsonb,
  created_at timestamp default now()
);
create index if not exists event_log_event_time on public.event_log(event, created_at);
```

---

## 4  Glossary

* **Final HTML**   — chapter HTML after anchor injection, referenced by `chapters.final_html_url`.
* **Workflow**    — n8n pipeline containing only Supabase + HTTP nodes (no code exec).

---

© ImaRead · Draft v0.5 — awaiting review
