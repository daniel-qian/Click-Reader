# EPUB解析器快速开始

## 简介

这是一个用于解析EPUB文件并提取第一章内容的Python脚本，按照Click数据契约规范生成结构化JSON数据。

## 安装依赖

```bash
pip install EbookLib beautifulsoup4
```

## 使用方法

### 预览模式（推荐）

先预览解析结果，不生成文件：

```bash
python epub_parser.py --preview
```

### 生成JSON文件

确认预览结果无误后，生成JSON文件：

```bash
python epub_parser.py
```

## 输出说明

- **输入目录**: `epub-files/` - 放置EPUB文件
- **输出目录**: `output/` - 生成的JSON文件
- **文件格式**: `{书名}_chapter1.json`

## JSON数据结构

```json
{
  "book_id": "唯一标识",
  "metadata": {
    "title": "书名",
    "author": "作者",
    "language": "语言"
  },
  "chapters": [{
    "chapter_index": 1,
    "title": "第一章",
    "content": "完整文本",
    "word_count": 字符数,
    "paragraphs": [{
      "paragraph_index": 段落索引,
      "text": "段落文本",
      "char_start": 起始位置,
      "char_end": 结束位置
    }]
  }]
}
```

## 特性

- ✅ 自动识别第一章内容
- ✅ 精确的段落分割和字符定位
- ✅ 支持中英文EPUB文件
- ✅ 预览模式避免重复生成
- ✅ 详细的处理日志

## 注意事项

1. 确保EPUB文件放在 `epub-files/` 目录下
2. 建议先使用 `--preview` 模式检查解析结果
3. 生成的JSON文件符合Click数据契约规范
4. 脚本会自动创建输出目录