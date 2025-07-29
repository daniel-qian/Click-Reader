# 📚 书籍渲染方案 / 架构设计 (2025-07 Anchor-Injection Rev)

> **核心变化：** 在预处理流程的「Anchor Patcher」脚本阶段，直接在章节 HTML 中插入 `<span class="hotspot" id="h123">` 锚点；前端零查找即可渲染小圆点。所有定位字段从 `char_start/char_end` 或 CFI 转为 **`anchor_id` + W3C TextQuote selector** 备份。

---

## 0  为什么依旧不把正文塞进数据库？

*对象存储 + CDN > OLTP BLOB* 的理由不变：备份快、可加密、易防盗链。新锚点注入策略并不影响这一结论——我们只是在服务器端把 HTML 轻量改写后重新上传。

---

## 1  预处理管线（修订后）

```mermaid
graph TD
  A[EPUB URL] -->|download| B(epub file)
  B --> C{HTML Extractor \n噪声过滤}
  C -->|cleaned HTML| D[S3 chapters/{idx}.html]
  D --> E[AI Workflow \nHotspot generator]
  E -->|hotspots.json| F[Anchor Patcher]
  F -->|HTML v2 (含<span>)| D
  F -->|hotspots.json| G(PostgreSQL)
```

* **Anchor Patcher** 使用 `TextQuoteSelector` 在 DOM 中定位 `excerpt`，写入：

  ```html
  <span id="hA1B2" class="hotspot" data-cat="Scenic"></span>
  ```

---

## 2  数据表（最终版）

| 表                  | 关键字段                                                                | 说明                       |
| ------------------ | ------------------------------------------------------------------- | ------------------------ |
| **books**          | `id, title, epub_url, cover_url`                                    | 不变                       |
| **chapters**       | `book_id, idx, html_url, html_ver`                                  | `html_ver` 用于 CDN 缓存刷新   |
| **hotspots**       | `id, book_id, chapter_idx, anchor_id, category, excerpt, image_url` | 通过 `anchor_id` 在前端定位 DOM |
| **ai\_variations** | `id, hotspot_id, user_id, img_url, prompt, created_at`              | 保留                       |
| **user\_progress** | 同旧版                                                                 | 保留                       |

*已删除*: `char_start`, `char_end`, `cfi_*` 字段。

---

## 3  圆点渲染链路（前端）

1. **加载章节 HTML**：`<article dangerouslySetInnerHTML>`
2. **CSS 小圆点**

   ```css
   .hotspot::before {
     content: "";
     display: inline-block;
     width: 8px; height: 8px;
     margin-right: 4px;
     border-radius: 50%;
     background: #0af;
     cursor: pointer;
   }
   ```
3. **事件绑定**：

   ```ts
   document.querySelectorAll('.hotspot').forEach(dot => {
     dot.addEventListener('click', () => openHotspot(dot.id))
   })
   ```
4. **openHotspot(id)** 拉取 `/api/hotspots/{id}` → 显示 excerpt / 生成图像。

> **无 JS 高亮查找**；性能由浏览器原生渲染保证。

---

## 4  Service Worker / 离线

* 缓存 `chapters/{idx}.html?v={html_ver}` 与 `/api/hotspots?chapter_idx=`。
* HTML 自带热点，离线阅读无功能缺失。

---

## 5  锚点注入脚本要点

| 步骤                 | 重点                                             |
| ------------------ | ---------------------------------------------- |
| ❶ 解析 hotspots.json | 使用 `exact/prefix/suffix` 形成 W3C Selector       |
| ❷ DOM 匹配           | `dom-anchor-text-quote` npm 库 or 自定义 Python 实现 |
| ❸ Insert `<span>`  | `range.insertNode()` 保留文本完整                    |
| ❹ 去重               | 查现有 `.hotspot` + ID 列表避免重复                     |
| ❺ CDN 上传           | 同路径覆盖，追加 `?v={html_ver}`                       |

---

## 6  踩坑预警（更新）

| 坑                  | 解决策略                                           |
| ------------------ | ---------------------------------------------- |
| 多次清洗导致 selector 失效 | 如果 anchor 写入失败，脚本回写 `status=missing`；后端重试或人工标注 |
| 前端样式冲突             | `.hotspot` 只占位 0 宽度，圆点用 `::before`             |
| 编辑器 strip `<span>` | 锚点插入在「最终 CDN HTML」，阅读端不会再经过任何 WYSIWYG，避免过滤     |

---

## 7  Why not CFI?

* **兼容性**：Web ECMAScript DOM API 原生不懂 CFI → 还要 `epub.js` 解码。
* **精准度**：带前后缀的 TextQuoteSelector 在多数测试用书中复现率 > 99%。
* **可读性/调试**：查看 HTML 源码即可看到 `<span id="h…">`，开发体验更好。

---

## 8  最小可行落地

1. **上线 html\_extractor 0.2** ➜ 输出 cleaned HTML。
2. **接 AI Workflow** ➜ hotspots.json (含 selector)。
3. **Anchor Patcher PoC** ➜ 处理 3 本书，验证圆点定位精度。
4. **前端** ➜ 用纯 CSS/JS 渲染圆点，实现弹窗。

---

✅ 方案更新完毕；前后端、工作流、运维皆已覆盖。
