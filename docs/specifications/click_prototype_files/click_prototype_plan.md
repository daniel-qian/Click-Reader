# 🛠️ Prototype Plan — Click Interactive Reader v0.5

> **Purpose**  Blueprint for the next two‑month prototype sprint, reflecting the *three‑workflow* architecture and Supabase switch‑over.
>
> **Audience**  Product owner · Workflow team · Backend/FE dev · DevOps.
>
> **Status**  Draft v0.5 · 2025‑07‑30

---

## 1  Goals (Sprint Δ)

| # | Objective                                               | Metric                                     | Owner         |
| - | ------------------------------------------------------- | ------------------------------------------ | ------------- |
| 1 | **End‑to‑end book import** via separated workflows      | import 3 demo books w/ ≥95% anchor success | Workflow team |
| 2 | **Supabase integration** complete                       | CRUD from FE + RLS policies live           | Backend       |
| 3 | **Reader PoC** loads patched HTML & renders hotspots    | 30 fps on mid‑range mobile                 | Frontend      |
| 4 | **Event tracking** feeds KPI views (`dau_mv`, `ctr_mv`) | dashboard auto‑refresh hourly              | Data eng      |

---

## 2  System Decomposition (UPDATED)

```mermaid
graph TD
  subgraph Ingest
    A[EPUB upload] --> B(HTML Extractor)
    B --> C[/bucket bookhtml/]
  end

  subgraph WF‑A TagInsight
    C --> D[Book Tags WF]
    D -->|PATCH {tags}| API1
  end

  subgraph WF‑B HotspotPick
    C --> E[Hotspot Pick WF]
    E -->|hotspots.json| API2
  end

  subgraph DB
    API1 & API2 --> F[(Supabase DB)]
  end

  subgraph WF‑C Render
    F -->|pending| G[Media Render WF]
    G -->|img urls| H(CDN)
    G -->|PATCH| API3
  end

  F --> FE[Next.js Reader]
```

**Principles**

1. Workflows orchestrate only **Supabase nodes + HTTP calls** – no custom code in n8n.
2. Heavy compute & parsing lives in managed **backend micro‑services**.
3. All artefacts flow through **JSON contracts** committed in `/specs` repo.

---

## 3  Database & Security

*RLS*: `profiles` self‑only; `event_log` insert‑only; public selects on `books` & `chapters`.

*Key Indexes*: `books_tags_gin`, `hotspots (book_id,anchor_id)`.

> See <mcfile name="click_data_contract.md" path="d:\\Click-Reader\\docs\\specifications\\click_prototype_files\\click_data_contract.md"></mcfile> for complete schema details.

---

## 4  API Surface (Server)

| Method  | Path                         | Used by    | Notes                        |
| ------- | ---------------------------- | ---------- | ---------------------------- |
| `POST`  | `/api/books`                 | Tag WF     | upsert minimal row on import |
| `PATCH` | `/api/books/{id}`            | Tag WF     | write tags                   |
| `POST`  | `/api/workflow/hotspots`     | Hotspot WF | bulk insert (JSON array)     |
| `PATCH` | `/api/hotspots/{id}`         | Render WF  | set image/audio url & status |
| `GET`   | `/api/chapters/{book}/{idx}` | FE         | presigned CDN url redirect   |

All endpoints secured with **service key + IP allow‑list** (workflows run inside same VPC).

---

## 5  KPI Telemetry (MVP)

| Metric               | Source                   | Agg View     | Refresh            |
| -------------------- | ------------------------ | ------------ | ------------------ |
| **DAU**              | `event_log (app_open)`   | `dau_mv`     | hourly (`pg_cron`) |
| **Hotspot CTR**      | `event_log (view/click)` | `ctr_mv`     | hourly             |
| **Avg. read length** | `page_turn` events       | `readlen_mv` | daily              |

Dashboard → Metabase hosted on Supabase add‑on.

---

## 6  Milestone Timeline

| Week | Deliverable                                      |
| ---- | ------------------------------------------------ |
| W1   | DB migrations + Supabase RLS scripts merged      |
| W2   | HTML Extractor containerised & pushing to bucket |
| W3   | TagInsight WF live, writes `tags`                |
| W4   | HotspotPick WF PoC (static prompt)               |
| W5   | Render WF hitting Midjourney API mock            |
| W6   | Reader FE loading hotspots + CSS dots            |
| W7   | Event SDK & KPI views ready                      |
| W8   | Demo: click‑through import → reading experience  |

---

## 7  Open Risks / TODO

* **Anchor selector robustness** — fallback to manual link if match ≈0.
* **Model cost** — media render WF budget TBD.
* **Mobile perf** — measure on low‑end Android.
* **CDN cache purge** — decide between query param bump vs API hook.

---

© ImaRead · Prototype Plan v0.5 — awaiting review
