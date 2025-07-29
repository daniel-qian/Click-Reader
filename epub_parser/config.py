#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPUB HTML提取器配置文件
定义噪声过滤规则和其他可配置参数
"""

# 噪声页面标题关键字（整章跳过）
NOISE_TITLES = [
    # 中文关键字
    "版权信息", "版权页", "版权声明", "版权",
    "广告", "广告页", "推广", "推荐",
    "关于本书", "关于作者", "作者简介",
    "推荐语", "书评", "媒体推荐",
    "出版说明", "编辑说明", "译者说明",
    "封面", "封底", "书脊",
    "目录页", "扉页",
    
    # 英文关键字
    "COPYRIGHT", "Copyright", "copyright",
    "ADVERTISEMENT", "Advertisement", "advertisement",
    "ABOUT THE BOOK", "About the Book", "about the book",
    "ABOUT THE AUTHOR", "About the Author", "about the author",
    "PRAISE FOR", "Praise for", "praise for",
    "REVIEWS", "Reviews", "reviews",
    "PUBLISHER'S NOTE", "Publisher's Note", "publisher's note",
    "EDITOR'S NOTE", "Editor's Note", "editor's note",
    "TRANSLATOR'S NOTE", "Translator's Note", "translator's note",
    "COVER", "Cover", "cover",
    "TITLE PAGE", "Title Page", "title page",
    "TABLE OF CONTENTS", "Table of Contents", "table of contents", "TOC",
    "FRONTMATTER", "Frontmatter", "frontmatter",
    "BACKMATTER", "Backmatter", "backmatter",
]

# 噪声页面文件名关键字（整章跳过）
NOISE_FILENAMES = [
    "copyright", "Copyright", "COPYRIGHT",
    "cover", "Cover", "COVER",
    "title", "Title", "TITLE",
    "toc", "TOC", "Toc",
    "advertisement",
    "praise", "Praise", "PRAISE",
    "about", "About", "ABOUT",
    "frontmatter", "backmatter",
    "版权", "广告", "封面", "目录",
]

# CSS选择器黑名单（块级剔除）
NOISE_CSS_SELECTORS = [
    ".ad", ".advertisement", ".ads",
    ".promotion", ".promo",
    ".sponsor", ".sponsored",
    "[data-ad]", "[data-advertisement]",
    ".copyright-notice", ".legal-notice",
    ".publisher-info", ".imprint",
    ".social-media", ".share-buttons",
]

# HTML标签黑名单（块级剔除）
NOISE_HTML_TAGS = [
    # 通常包含广告或追踪代码的标签
    "script",  # JavaScript代码
    "noscript",  # 无脚本回退内容
    "iframe",  # 内嵌框架（常用于广告）
    "embed",  # 嵌入内容
    "object",  # 对象元素
]

# 空白页面判定阈值
MIN_TEXT_LENGTH = 50  # 正文最小字符数
MIN_MEANINGFUL_TAGS = 2  # 最小有意义标签数（p, div, h1-h6等）

# 默认配置
DEFAULT_CONFIG = {
    "preserve_comments": True,  # 保留HTML注释
    "skip_noise_pages": True,  # 跳过噪声页面
    "keep_cover": True,  # 保留封面页
    "min_text_length": MIN_TEXT_LENGTH,  # 最小文本长度
    "verbose": False,  # 详细日志
}

# 有意义的内容标签（用于判断是否为空白页）
MEANINGFUL_TAGS = {
    "p", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6",
    "article", "section", "main", "content",
    "blockquote", "pre", "code",
    "ul", "ol", "li", "dl", "dt", "dd",
    "table", "tr", "td", "th",
    "img", "figure", "figcaption",
}

# 封面相关标签和属性
COVER_INDICATORS = {
    "tags": ["img", "svg", "image"],
    "classes": ["cover", "Cover", "COVER", "book-cover", "front-cover"],
    "ids": ["cover", "Cover", "COVER", "book-cover", "front-cover"],
    "filenames": ["cover", "Cover", "COVER", "front", "Front"],
}