# 📚 Book Rendering Plan — Anchor‑Injection (Rev 0.4 · 2025‑07‑30)

> **What changed since 0.3?**
> • **Three‑workflow split** — Anchor Patcher becomes a standalone micro‑service; n8n WFs never run code
> • Supabase schema updates: `chapters.final_html_url`, `books.tags`, `event_log`
> • KPI hooks: event logging for hotspot view/click + CTR MV
> • Updated diagrams & SQL delta

---

---

## 1  Anchor‑Patch Service — Contract

*Input* (`hotspots.json` from WF‑B):

```jsonc
[
  {
    "chapter_idx": 1,
    "anchor_id": "hA1B2",
    "excerpt": "\u5de6\u53f3\u4fe6\u70b9\u4e2d\u5fc3",
    "category": "Scenic"
  }
]
```

*Process*

1. Fetch `chapters.html_url` → DOM.
2. Locate excerpt via **TextQuoteSelector** (backup range).
3. `insertAdjacentHTML` `<span id="hA1B2" class="hotspot" data-cat="Scenic"></span>`.
4. Upload **overwriting** bucket file → return signed URL.
5. `PATCH /api/chapters/{id}` body `{ "final_html_url": "…?v=2" }`.
6. Forward unchanged `hotspots.json` to Core API (`POST /api/workflow/hotspots`).

Error policy: if selector miss ≥1 anchor → `status=missing` in response; WF marks job failed for manual review.

---

## 2  Front‑End Rendering Path

1. Fetch `GET /api/chapters/{book}/{idx}` → 301 to `final_html_url` (presigned).
2. `<article dangerouslySetInnerHTML>` loads HTML containing `<span class="hotspot">`.
3. Global delegate listener opens hotspot modal.
4. On `view` & `click` emit:

```ts
await supabase.from('event_log').insert({
  user_id: uid,
  event: 'hotspot_view',
  target_id: hotspotId,
  meta: { book_id }
});
```

5. KPI materialised view `ctr_mv` = clicks / views.

---

## 3  Known Gaps / Next Steps

* **Selector fuzziness** — evaluate `dom-anchor-text-position` as fallback.
* **HTML diff versioning** — consider storing patch diff for rollback.
* **Accessibility** — add `aria-describedby` linking hotspot → modal.

---

© ImaRead · Book Rendering Plan v0.4 — awaiting review
