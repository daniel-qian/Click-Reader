# EPUB HTML 提取器

## 概述

这是一个专门设计的 EPUB HTML 提取器，用于从 EPUB 文件中提取原始的 HTML/XHTML 内容。与之前直接解析成 JSON 的方案不同，这个工具保持 HTML 的原始格式，为后续的 LLM 处理提供更好的基础。

## 设计理念

### 为什么选择保留 HTML 格式？

1. **LLM 友好**: 现代 LLM（如 GPT-4、Claude）对 HTML/XHTML 格式有很好的理解能力
2. **结构保持**: HTML 标签保留了文档的语义结构（标题、段落、列表等）
3. **样式信息**: CSS 类名和内联样式为后续处理提供了额外的上下文
4. **链接关系**: 保留了章节间的内部链接和锚点
5. **灵活处理**: HTML 格式便于后续的选择性提取和转换

## 功能特性

### 核心功能
- ✅ **按 spine 顺序提取**: 严格按照 EPUB 的阅读顺序提取章节
- ✅ **智能噪声过滤**: 自动识别并跳过版权页、广告页、空白页等噪声内容
- ✅ **HTML 注释保留**: 可配置是否保留 HTML 注释（默认保留）
- ✅ **HTML 内容清理**: 移除 script、style 等不必要元素，保持核心内容
- ✅ **元数据提取**: 提取书籍标题、作者、语言等基本信息
- ✅ **目录信息**: 提取 EPUB 的目录结构（TOC）
- ✅ **详细报告**: 生成包含提取过程详细信息的 JSON 报告
- ✅ **文件命名**: 使用有序的文件命名方案，便于后续处理

### 噪声过滤功能
- 🔍 **关键字过滤**: 基于标题和文件名的关键字匹配
- 🎯 **CSS 选择器过滤**: 移除特定 CSS 类的广告和噪声元素
- 📏 **空白页检测**: 基于文本长度和有意义标签数量的空白页判定
- 🖼️ **封面页保留**: 可配置是否保留封面页（默认保留）
- 📊 **跳过统计**: 详细记录被跳过的文件及原因

## 安装依赖

```bash
pip install -r requirements.txt
```

主要依赖：
- `EbookLib`: EPUB 文件处理
- `beautifulsoup4`: HTML 解析和清理
- `lxml`: XML/HTML 解析器

## 使用方法

### 基本用法

```bash
# 交互式选择EPUB文件（支持多选）
python html_extractor.py

# 处理指定文件
python html_extractor.py book.epub

# 指定输出目录
python html_extractor.py book.epub --output-dir my_output
```

### 多文件处理

当运行交互式模式时，可以选择多个EPUB文件进行批量处理：

```
找到多个EPUB文件:
  1. A Gentleman in Moscow.epub
  2. another_book.epub
  3. third_book.epub

请选择要处理的文件编号（多个用逗号分隔，如: 1,3,5）: 1,2
```

每个EPUB文件会按照其文件名创建独立的输出目录。

### 命令行参数

```bash
# 显示帮助信息
python html_extractor.py --help

# 不跳过噪声页面（保留所有页面）
python html_extractor.py --no-skip-noise

# 不保留HTML注释
python html_extractor.py --no-preserve-comments

# 不保留封面页
python html_extractor.py --no-keep-cover

# 设置最小文本长度阈值
python html_extractor.py --min-text-length 200

# 显示详细日志
python html_extractor.py --verbose
```

### 配置选项

| 参数 | 默认值 | 说明 |
|------|--------|---------|
| `--preserve-comments` | True | 保留HTML注释 |
| `--skip-noise-pages` | True | 跳过噪声页面 |
| `--keep-cover` | True | 保留封面页 |
| `--min-text-length` | 100 | 最小文本长度阈值 |
| `--verbose` | False | 显示详细日志 |

## 输出结果

### 文件结构

```
extracted_html/
└── EPUB文件名/
    ├── raw_html/                    # 未清理的原始HTML文件
    │   ├── chapter_000_cov1_1.html
    │   ├── chapter_001_part1_0001.html
    │   └── ...
    ├── cleaned_html/               # 清理后的HTML文件
    │   ├── chapter_000_cov1_1.html
    │   ├── chapter_001_part1_0001.html
    │   └── ...
    └── extraction_report.json      # 提取报告
```

### 双版本输出说明

- **raw_html/**: 保留EPUB中的原始HTML内容，仅进行基本的编码转换
- **cleaned_html/**: 经过智能清理的HTML内容，移除了噪声元素和不必要的标签
- **extraction_report.json**: 详细的提取报告，包含两个版本的文件信息

### 提取报告 (extraction_report.json)

```json
{
  "metadata": {
    "title": "书籍标题",
    "author": "作者姓名",
    "language": "zh"
  },
  "extraction_summary": {
    "total_files_extracted": 18,
    "total_files_skipped": 3,
    "raw_output_directory": "extracted_html/EPUB文件名/raw_html",
    "cleaned_output_directory": "extracted_html/EPUB文件名/cleaned_html",
    "epub_source": "原始EPUB文件路径",
    "config_used": {
      "preserve_comments": true,
      "skip_noise_pages": true,
      "keep_cover": true,
      "min_text_length": 100,
      "verbose": false
    }
  },
  "spine_info": [
    {
      "index": 0,
      "item_id": "cov1_1",
      "file_name": "OEBPS/Text/cov1_1.xhtml",
      "linear": "yes",
      "media_type": "application/xhtml+xml"
    }
  ],
  "extracted_files": [
    {
      "index": 0,
      "original_name": "OEBPS/Text/cov1_1.xhtml",
      "output_name": "chapter_000_cov1_1.html",
      "raw_file_path": "完整原始文件路径",
      "cleaned_file_path": "完整清理文件路径",
      "raw_size_bytes": 1234,
      "cleaned_size_bytes": 987
    }
  ],
  "skipped_files": [
    {
      "index": 1,
      "file_name": "OEBPS/Text/copyright.xhtml",
      "item_id": "copyright",
      "skip_reason": "标题包含噪声关键字: 版权信息"
    }
  ]
}
```

## 自定义噪声过滤规则

### 修改配置文件

编辑 `config.py` 文件来自定义过滤规则：

```python
# 添加新的噪声标题关键字
NOISE_TITLES.extend([
    "新的噪声关键字",
    "Another noise keyword"
])

# 添加新的噪声文件名关键字
NOISE_FILENAMES.extend([
    "new_noise_file",
    "another_pattern"
])

# 添加新的CSS选择器
NOISE_CSS_SELECTORS.extend([
    ".custom-ad-class",
    "#custom-noise-id"
])
```

### 配置文件说明

- **NOISE_TITLES**: 标题中包含这些关键字的页面将被跳过
- **NOISE_FILENAMES**: 文件名包含这些关键字的页面将被跳过
- **NOISE_CSS_SELECTORS**: 匹配这些CSS选择器的元素将被移除
- **NOISE_HTML_TAGS**: 这些HTML标签将被完全移除
- **MEANINGFUL_TAGS**: 用于判断页面是否有意义的标签列表

### 噪声过滤规则经验总结

#### 1. 关键字过滤的注意事项

**避免过于宽泛的关键字**：
- ❌ 错误示例：使用 "AD", "Ad" 会误删 "Adjustments", "Addendum" 等正常内容
- ✅ 正确示例：使用 "ADVERTISEMENT" 等完整词汇

**区分大小写和语言**：
- 同时包含中英文关键字："COPYRIGHT", "版权信息"
- 考虑不同的大小写变体："Copyright", "copyright"

#### 2. 目录链接清理策略

**智能识别目录页面**：
- 只在页面包含大量链接（>10个）时才进行目录清理
- 精确匹配目录关键词："table of contents", "contents", "目录", "index"
- 避免误删正常的章节导航链接

#### 3. 空白页面判定

**多维度判断**：
- 文本长度阈值：默认50字符
- 有意义标签数量：至少2个
- 特殊处理封面页：即使内容少也要保留

#### 4. 版权信息识别

**常见版权关键词**：
- 英文："copyright", "isbn", "penguin", "viking", "imprint"
- 中文："版权", "出版", "印刷"
- 避免误删包含这些词的正文内容

#### 5. 调试和优化建议

**使用详细日志**：
```bash
python html_extractor.py --verbose
```

**检查跳过的文件**：
- 查看 `extraction_report.json` 中的 `skipped_files` 部分
- 确认跳过的文件确实是噪声内容

**对比原始和清理版本**：
- 使用双版本输出功能对比清理效果
- 确保重要内容没有被误删

**渐进式调整**：
- 先使用宽松的过滤规则
- 根据实际效果逐步收紧规则
- 针对特定EPUB格式调整规则

## 运行测试

```bash
# 运行单元测试
python test_html_extractor.py

# 运行详细测试
python test_html_extractor.py -v
```

## 与之前方案的区别

| 方面 | 旧方案 (JSON) | 新方案 (HTML) |
|------|---------------|---------------|
| **输出格式** | 结构化 JSON | 双版本 HTML (原始+清理) |
| **处理方式** | 解析后重组 | 保持原始结构 |
| **噪声过滤** | 无 | 智能过滤 |
| **注释处理** | 丢失 | 可配置保留 |
| **LLM 适用性** | 需要额外解析 | 直接可用 |
| **信息保留** | 可能丢失格式 | 完整保留 |
| **后续处理** | 限制较多 | 灵活性高 |
| **配置化** | 无 | 高度可配置 |
| **多文件处理** | 单文件 | 批量处理 |
| **版本对比** | 无 | 原始vs清理版本 |

## 下一步计划

1. **审阅提取文件**: 检查提取的 HTML 文件质量和完整性
2. **查看提取报告**: 分析 `extraction_report.json` 中的元数据和结构信息
3. **测试其他 EPUB**: 使用不同格式和语言的 EPUB 文件进行测试
4. **优化过滤规则**: 根据实际使用情况调整噪声过滤规则
5. **设计 hotspot 定位方案**: 基于提取的 HTML 内容设计精确的文本定位算法

---

**注意**: 这个提取器专注于保持 HTML 原始格式，同时智能过滤噪声内容，为后续的 LLM 处理和 hotspot 定位提供最佳的数据基础。