# EPUB解析器项目

这是一个完整的EPUB文件解析工具集，用于提取和分析EPUB电子书的内容结构。

## 项目结构

```
epub_parser/
├── epub-files/              # EPUB文件存放目录
│   ├── A Gentleman in Moscow.epub
│   └── a gentleman in moscow zh.epub
├── output/                  # JSON输出文件目录
│   ├── 9780099558781_chapter1.json
│   └── 莫斯科绅士_chapter1.json
├── analysis/                # 结构分析报告目录
│   └── A Gentleman in Moscow_structure.json
├── epub_parser.py           # 主解析脚本
├── epub_structure_analyzer.py # 结构分析脚本
├── quickstart.md           # 快速开始指南
├── requirements.txt        # 依赖包列表
└── README.md              # 项目说明文档
```

## 功能特性

### 1. EPUB内容解析 (`epub_parser.py`)
- ✅ 提取第一章内容
- ✅ 按段落精确分割
- ✅ 生成符合数据契约的JSON格式
- ✅ 支持预览模式
- ✅ 自动识别中英文内容

### 2. EPUB结构分析 (`epub_structure_analyzer.py`)
- ✅ 完整的EPUB结构分析
- ✅ 元数据提取
- ✅ 目录结构解析
- ✅ 脊柱（阅读顺序）分析
- ✅ 导航文档分析

## 快速开始

### 安装依赖
```bash
pip install -r requirements.txt
```

### 基本使用

1. **预览解析结果**（推荐先执行）
```bash
python epub_parser.py --preview
```

2. **生成JSON文件**
```bash
python epub_parser.py
```

3. **分析EPUB结构**
```bash
python epub_structure_analyzer.py
```

## 输出格式

### 章节JSON格式
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

### 结构分析报告
包含完整的EPUB内部结构信息，用于调试和优化解析逻辑。

## 使用说明

1. 将EPUB文件放入 `epub-files/` 目录
2. 运行相应的脚本进行解析或分析
3. 查看 `output/` 目录中的JSON文件
4. 查看 `analysis/` 目录中的结构分析报告

## 注意事项

- 所有路径都使用相对路径，便于项目迁移
- 建议先使用预览模式检查解析结果
- 结构分析功能有助于理解EPUB的组织方式
- 生成的JSON文件符合Click数据契约规范

## 技术栈

- **Python 3.x**
- **EbookLib** - EPUB文件处理
- **BeautifulSoup4** - HTML/XML解析
- **JSON** - 数据序列化

详细使用说明请参考 [quickstart.md](quickstart.md)。