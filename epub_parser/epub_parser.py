#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPUB解析脚本 - 提取第一章内容并生成JSON文件
按照Click数据契约规范生成章节JSON数据
"""

import json
import os
import re
import uuid
from pathlib import Path
from typing import List, Dict, Any

try:
    import ebooklib
    from ebooklib import epub
except ImportError:
    print("请安装ebooklib库: pip install EbookLib")
    exit(1)

from bs4 import BeautifulSoup

class EPUBParser:
    def __init__(self, epub_path: str):
        self.epub_path = epub_path
        self.book = None
        self.book_id = str(uuid.uuid4())[:8]  # 生成简短的book_id
        
    def load_epub(self) -> bool:
        """加载EPUB文件"""
        try:
            print(f"📚 正在加载EPUB文件: {self.epub_path}")
            self.book = epub.read_epub(self.epub_path)
            print(f"✅ EPUB文件加载成功")
            return True
        except Exception as e:
            print(f"❌ EPUB文件加载失败: {e}")
            return False
    
    def get_book_metadata(self) -> Dict[str, Any]:
        """获取书籍元数据"""
        metadata = {
            'title': 'Unknown',
            'author': 'Unknown',
            'language': 'zh'
        }
        
        if self.book:
            # 获取标题
            title = self.book.get_metadata('DC', 'title')
            if title:
                metadata['title'] = title[0][0]
                
            # 获取作者
            creator = self.book.get_metadata('DC', 'creator')
            if creator:
                metadata['author'] = creator[0][0]
                
            # 获取语言
            language = self.book.get_metadata('DC', 'language')
            if language:
                metadata['language'] = language[0][0]
                
        print(f"📖 书籍信息:")
        print(f"   标题: {metadata['title']}")
        print(f"   作者: {metadata['author']}")
        print(f"   语言: {metadata['language']}")
        
        return metadata
    
    def extract_text_from_html(self, html_content: str) -> str:
        """从HTML内容中提取纯文本"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 移除script和style标签
        for script in soup(["script", "style"]):
            script.decompose()
            
        # 获取文本并清理
        text = soup.get_text()
        
        # 清理多余的空白字符
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text
    
    def split_into_paragraphs(self, text: str) -> List[Dict[str, Any]]:
        """将文本分割为段落"""
        # 按换行符分割段落
        raw_paragraphs = text.split('\n')
        paragraphs = []
        char_offset = 0
        
        for i, para_text in enumerate(raw_paragraphs):
            para_text = para_text.strip()
            if para_text:  # 跳过空段落
                paragraph = {
                    'paragraph_index': len(paragraphs),
                    'text': para_text,
                    'char_start': char_offset,
                    'char_end': char_offset + len(para_text)
                }
                paragraphs.append(paragraph)
                char_offset += len(para_text) + 1  # +1 for the newline character
                
        print(f"📝 段落分析:")
        print(f"   总段落数: {len(paragraphs)}")
        if paragraphs:
            print(f"   第一段预览: {paragraphs[0]['text'][:50]}...")
            if len(paragraphs) > 1:
                print(f"   最后一段预览: {paragraphs[-1]['text'][:50]}...")
            
        return paragraphs
    
    def find_first_chapter(self) -> tuple:
        """查找第一章内容"""
        print(f"🔍 正在查找第一章内容...")
        
        # 获取所有文档项目
        items = list(self.book.get_items_of_type(ebooklib.ITEM_DOCUMENT))
        print(f"📄 找到 {len(items)} 个文档项目")
        
        chapter_patterns = [
            r'第一章|第1章|chapter\s*1|chapter\s*one',
            r'chapter\s*i(?!\w)',  # Roman numeral I
            r'1\.|1\s',  # Numbered chapters
        ]
        
        for i, item in enumerate(items):
            try:
                content = item.get_content().decode('utf-8')
                text = self.extract_text_from_html(content)
                
                print(f"📋 检查文档 {i+1}: {item.get_name()}")
                print(f"   内容长度: {len(text)} 字符")
                if len(text) > 100:
                    print(f"   前100字符: {text[:100]}...")
                
                # 检查是否包含章节标识
                for pattern in chapter_patterns:
                    if re.search(pattern, text, re.IGNORECASE):
                        print(f"✅ 找到第一章! 匹配模式: {pattern}")
                        return text, item.get_name()
                
                # 如果没有明确的章节标识，检查内容长度
                # 通常第一章会有相当的内容长度
                if len(text.strip()) > 500:  # 至少500字符
                    print(f"📖 根据内容长度判断为第一章候选")
                    return text, item.get_name()
                    
            except Exception as e:
                print(f"⚠️ 处理文档 {item.get_name()} 时出错: {e}")
                continue
        
        # 如果没有找到明确的第一章，返回第一个有内容的文档
        for item in items:
            try:
                content = item.get_content().decode('utf-8')
                text = self.extract_text_from_html(content)
                if len(text.strip()) > 100:
                    print(f"📖 使用第一个有效文档作为第一章: {item.get_name()}")
                    return text, item.get_name()
            except:
                continue
                
        raise Exception("未找到有效的第一章内容")
    
    def preview_chapter(self) -> Dict[str, Any]:
        """预览第一章解析结果，不生成文件"""
        if not self.load_epub():
            return None
            
        # 获取书籍元数据
        metadata = self.get_book_metadata()
        
        # 查找第一章
        chapter_text, chapter_source = self.find_first_chapter()
        
        # 分割段落
        paragraphs = self.split_into_paragraphs(chapter_text)
        
        # 构建数据结构
        chapter_data = {
            "book_id": self.book_id,
            "metadata": metadata,
            "chapter_info": {
                "chapter_index": 1,
                "title": "第一章",
                "word_count": len(chapter_text),
                "source_file": chapter_source,
                "paragraph_count": len(paragraphs)
            }
        }
        
        print(f"\n📋 解析预览结果:")
        print(f"📖 书籍信息: {metadata['title']} - {metadata['author']}")
        print(f"🆔 书籍ID: {self.book_id}")
        print(f"📄 源文件: {chapter_source}")
        print(f"📊 第一章统计:")
        print(f"   字符总数: {len(chapter_text)}")
        print(f"   段落总数: {len(paragraphs)}")
        
        # 显示前3个段落的预览
        print(f"\n📝 段落预览:")
        for i, para in enumerate(paragraphs[:3]):
            print(f"   段落{i+1}: {para['text'][:80]}...")
            print(f"           位置: {para['char_start']}-{para['char_end']}")
        
        if len(paragraphs) > 3:
            print(f"   ... 还有 {len(paragraphs)-3} 个段落")
            
        return chapter_data
    
    def generate_chapter_json(self, output_dir: str = "output") -> str:
        """生成第一章的JSON文件"""
        if not self.load_epub():
            return None
            
        # 获取书籍元数据
        metadata = self.get_book_metadata()
        
        # 查找第一章
        chapter_text, chapter_source = self.find_first_chapter()
        
        # 分割段落
        paragraphs = self.split_into_paragraphs(chapter_text)
        
        # 构建JSON数据结构
        chapter_data = {
            "book_id": self.book_id,
            "metadata": metadata,
            "chapters": [
                {
                    "chapter_index": 1,
                    "title": "第一章",
                    "content": chapter_text,
                    "word_count": len(chapter_text),
                    "source_file": chapter_source,
                    "paragraphs": paragraphs
                }
            ]
        }
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 生成文件名
        safe_title = re.sub(r'[^\w\s-]', '', metadata['title']).strip()
        safe_title = re.sub(r'[-\s]+', '-', safe_title)
        output_file = os.path.join(output_dir, f"{safe_title}_chapter1.json")
        
        # 写入JSON文件
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, ensure_ascii=False, indent=2)
            
        print(f"\n✅ JSON文件生成完成!")
        print(f"📁 输出文件: {output_file}")
        print(f"📊 统计信息:")
        print(f"   字符总数: {len(chapter_text)}")
        print(f"   段落总数: {len(paragraphs)}")
        print(f"   书籍ID: {self.book_id}")
        print(f"   文件大小: {os.path.getsize(output_file)} 字节")
        
        return output_file

def main():
    """主函数"""
    import sys
    
    # 使用相对路径，基于当前脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    epub_dir = os.path.join(script_dir, "epub-files")
    output_dir = os.path.join(script_dir, "output")
    
    # 检查命令行参数
    preview_mode = len(sys.argv) > 1 and sys.argv[1] == "--preview"
    
    # 获取epub文件列表
    epub_files = [f for f in os.listdir(epub_dir) if f.endswith('.epub')]
    
    if preview_mode:
        print(f"👀 预览模式 - 只显示解析结果，不生成文件")
    else:
        print(f"🚀 开始处理EPUB文件...")
        print(f"📂 输出目录: {output_dir}")
    
    print(f"📂 输入目录: {epub_dir}")
    print(f"📚 找到 {len(epub_files)} 个EPUB文件\n")
    
    for epub_file in epub_files:
        epub_path = os.path.join(epub_dir, epub_file)
        print(f"{'='*60}")
        print(f"🔄 处理文件: {epub_file}")
        print(f"{'='*60}")
        
        try:
            parser = EPUBParser(epub_path)
            
            if preview_mode:
                result = parser.preview_chapter()
                if result:
                    print(f"✅ {epub_file} 预览完成\n")
                else:
                    print(f"❌ {epub_file} 预览失败\n")
            else:
                output_file = parser.generate_chapter_json(output_dir)
                if output_file:
                    print(f"✅ {epub_file} 处理完成\n")
                else:
                    print(f"❌ {epub_file} 处理失败\n")
                    
        except Exception as e:
            print(f"❌ 处理 {epub_file} 时发生错误: {e}\n")
    
    if preview_mode:
        print(f"👀 预览完成! 使用 'python epub_parser.py' 生成JSON文件")
    else:
        print(f"🎉 所有文件处理完成!")

if __name__ == "__main__":
    main()