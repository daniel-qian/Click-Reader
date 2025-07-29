#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPUB HTML提取器
从EPUB文件中提取所有HTML/XHTML内容，保持原始格式
支持自动过滤噪声页面和配置化规则
"""

import os
import sys
import argparse
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

try:
    import ebooklib
    from ebooklib import epub
except ImportError:
    print("请安装ebooklib库: pip install EbookLib")
    exit(1)

from bs4 import BeautifulSoup, Comment

# 导入配置文件
from config import (
    NOISE_TITLES, NOISE_FILENAMES, NOISE_CSS_SELECTORS, NOISE_HTML_TAGS,
    MEANINGFUL_TAGS, COVER_INDICATORS, MIN_TEXT_LENGTH, MIN_MEANINGFUL_TAGS,
    DEFAULT_CONFIG
)

class EPUBHTMLExtractor:
    def __init__(self, epub_path: str, output_dir: str = "extracted_html", config: Dict[str, Any] = None):
        self.epub_path = Path(epub_path)
        self.output_dir = Path(output_dir)
        self.book = None
        self.book_name = self.epub_path.stem
        self.metadata = {}
        self.spine_info = []
        self.toc_info = []
        self.skipped_files = []  # 记录被跳过的文件
        
        # 合并配置
        self.config = DEFAULT_CONFIG.copy()
        if config:
            self.config.update(config)
            
        # 设置日志
        log_level = logging.DEBUG if self.config.get('verbose', False) else logging.INFO
        logging.basicConfig(level=log_level, format='%(levelname)s: %(message)s')
        self.logger = logging.getLogger(__name__)
        
    def load_epub(self) -> bool:
        """加载EPUB文件"""
        try:
            print(f"📚 正在加载EPUB文件: {self.epub_path}")
            self.book = epub.read_epub(str(self.epub_path))
            print(f"✅ EPUB文件加载成功")
            return True
        except Exception as e:
            print(f"❌ EPUB文件加载失败: {e}")
            return False
    
    def extract_metadata(self):
        """提取书籍元数据"""
        self.metadata = {
            'title': 'Unknown',
            'author': 'Unknown',
            'language': 'zh'
        }
        
        if self.book:
            # 获取标题
            title = self.book.get_metadata('DC', 'title')
            if title:
                self.metadata['title'] = title[0][0]
            
            # 获取作者
            creator = self.book.get_metadata('DC', 'creator')
            if creator:
                self.metadata['author'] = creator[0][0]
            
            # 获取语言
            language = self.book.get_metadata('DC', 'language')
            if language:
                self.metadata['language'] = language[0][0]
        
        print(f"书籍信息:")
        print(f"  标题: {self.metadata['title']}")
        print(f"  作者: {self.metadata['author']}")
        print(f"  语言: {self.metadata['language']}")
    
    def is_noise_page(self, item, content: str = None) -> Tuple[bool, str]:
        """判断是否为噪声页面，返回 (是否为噪声, 跳过原因)"""
        if not self.config.get('skip_noise_pages', True):
            return False, ""
            
        # 检查文件名
        file_name = item.file_name.lower()
        for noise_keyword in NOISE_FILENAMES:
            if noise_keyword.lower() in file_name:
                return True, f"文件名包含噪声关键字: {noise_keyword}"
        
        # 如果有内容，进一步检查
        if content:
            soup = BeautifulSoup(content, 'html.parser')
            
            # 检查标题
            title_tags = soup.find_all(['h1', 'h2', 'h3', 'title'])
            for tag in title_tags:
                title_text = tag.get_text(strip=True)
                for noise_title in NOISE_TITLES:
                    if noise_title in title_text:
                        return True, f"标题包含噪声关键字: {noise_title}"
            
            # 检查是否为空白页
            text_content = soup.get_text(strip=True)
            meaningful_tags = soup.find_all(lambda tag: tag.name in MEANINGFUL_TAGS)
            
            if (len(text_content) < self.config.get('min_text_length', MIN_TEXT_LENGTH) and 
                len(meaningful_tags) < MIN_MEANINGFUL_TAGS):
                # 检查是否为封面页
                if self.config.get('keep_cover', True) and self._is_cover_page(soup, file_name):
                    return False, ""
                return True, f"空白页面 (文本长度: {len(text_content)}, 有意义标签: {len(meaningful_tags)})"
        
        return False, ""
    
    def _is_cover_page(self, soup: BeautifulSoup, file_name: str) -> bool:
        """判断是否为封面页"""
        # 检查文件名
        for cover_keyword in COVER_INDICATORS['filenames']:
            if cover_keyword.lower() in file_name.lower():
                return True
        
        # 检查是否包含封面相关的图片或元素
        for tag_name in COVER_INDICATORS['tags']:
            for tag in soup.find_all(tag_name):
                # 检查class属性
                tag_classes = tag.get('class', [])
                for cover_class in COVER_INDICATORS['classes']:
                    if cover_class in tag_classes:
                        return True
                
                # 检查id属性
                tag_id = tag.get('id', '')
                for cover_id in COVER_INDICATORS['ids']:
                    if cover_id in tag_id:
                        return True
        
        return False
    
    def extract_spine_info(self):
        """提取spine信息（阅读顺序）"""
        self.spine_info = []
        
        print("\n提取spine信息:")
        for idx, (item_id, linear) in enumerate(self.book.spine):
            item = self.book.get_item_with_id(item_id)
            if item and item.get_type() == ebooklib.ITEM_DOCUMENT:
                spine_item = {
                    'index': idx,
                    'item_id': item_id,
                    'file_name': item.file_name,
                    'linear': linear,
                    'media_type': item.media_type
                }
                self.spine_info.append(spine_item)
                print(f"  [{idx:02d}] {item.file_name} (linear: {linear})")
        
        print(f"\n共找到 {len(self.spine_info)} 个文档项目")
    
    def extract_toc_info(self):
        """提取目录信息"""
        self.toc_info = []
        
        def process_toc_item(item, level=0):
            if hasattr(item, 'title') and hasattr(item, 'href'):
                self.toc_info.append({
                    'title': item.title,
                    'href': item.href,
                    'level': level
                })
            
            # 处理子项目
            if hasattr(item, '__iter__') and not isinstance(item, str):
                for sub_item in item:
                    if hasattr(sub_item, 'title'):
                        process_toc_item(sub_item, level + 1)
        
        print("\n提取目录信息:")
        for item in self.book.toc:
            process_toc_item(item)
        
        print(f"共找到 {len(self.toc_info)} 个目录项")
    
    def clean_html_content(self, content: str) -> str:
        """清理HTML内容，移除不必要的元素但保持结构"""
        soup = BeautifulSoup(content, 'html.parser')
        
        # 根据配置决定是否移除注释
        if not self.config.get('preserve_comments', True):
            comments = soup.find_all(string=lambda text: isinstance(text, Comment))
            for comment in comments:
                comment.extract()
        
        # 移除噪声HTML标签
        for tag_name in NOISE_HTML_TAGS:
            for tag in soup.find_all(tag_name):
                self.logger.debug(f"移除噪声标签: {tag_name}")
                tag.decompose()
        
        # 移除噪声CSS选择器匹配的元素
        for selector in NOISE_CSS_SELECTORS:
            try:
                for element in soup.select(selector):
                    self.logger.debug(f"移除噪声元素: {selector}")
                    element.decompose()
            except Exception as e:
                self.logger.warning(f"CSS选择器 {selector} 解析失败: {e}")
        
        # 移除包含噪声关键词的段落
        for p in soup.find_all(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            text = p.get_text(strip=True)
            if text:
                # 检查是否包含噪声标题关键词
                for noise_title in NOISE_TITLES:
                    if noise_title.lower() in text.lower():
                        self.logger.debug(f"移除噪声内容段落: {text[:50]}...")
                        p.decompose()
                        break
                else:
                    # 检查版权信息
                    if any(keyword in text.lower() for keyword in ['copyright', '版权', 'isbn', 'penguin', 'viking', 'imprint']):
                        self.logger.debug(f"移除版权信息段落: {text[:50]}...")
                        p.decompose()
                    # 检查目录链接
                    elif text.lower().strip() in ['contents', '目录', 'table of contents'] or \
                         (p.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] and 'contents' in text.lower()):
                        self.logger.debug(f"移除目录标题: {text}")
                        p.decompose()
        
        # 移除目录链接段落（更精确的识别）
        # 只在整个页面包含大量链接时才考虑删除目录
        all_links = soup.find_all('a')
        if len(all_links) > 10:  # 只有当页面包含很多链接时才进行目录清理
            for p in soup.find_all('p'):
                links = p.find_all('a')
                if len(links) >= 1:  # 检查单个链接段落
                    link_texts = [a.get_text(strip=True) for a in links]
                    # 更严格的目录识别：必须包含明确的目录关键词
                    if any(any(keyword in link_text.lower() for keyword in ['table of contents', 'contents', '目录', 'index']) 
                           for link_text in link_texts):
                        self.logger.debug(f"移除目录链接段落: {p.get_text(strip=True)[:50]}...")
                        p.decompose()
        
        # 移除空的段落和div（但保留有图片的）
        for tag in soup.find_all(['p', 'div']):
            if not tag.get_text(strip=True) and not tag.find('img'):
                tag.decompose()
        
        return str(soup)
    
    def extract_all_html_files(self):
        """提取所有HTML文件，生成未清理和清理版本"""
        if not self.spine_info:
            print("错误：未找到spine信息")
            return False
        
        # 使用EPUB文件名作为输出目录
        epub_name = self.epub_path.stem
        safe_name = "".join(c for c in epub_name if c.isalnum() or c in (' ', '-', '_')).strip()
        base_output_path = self.output_dir / safe_name
        
        # 创建未清理和清理版本的输出目录
        raw_output_path = base_output_path / "raw_html"
        cleaned_output_path = base_output_path / "cleaned_html"
        raw_output_path.mkdir(parents=True, exist_ok=True)
        cleaned_output_path.mkdir(parents=True, exist_ok=True)
        
        print(f"\n开始提取HTML文件:")
        print(f"  - 未清理版本: {raw_output_path}")
        print(f"  - 清理版本: {cleaned_output_path}")
        if self.config.get('skip_noise_pages', True):
            print("  - 启用噪声页面过滤")
        
        extracted_files = []
        
        for spine_item in self.spine_info:
            item = self.book.get_item_with_id(spine_item['item_id'])
            if not item:
                continue
            
            try:
                # 获取原始内容
                content = item.get_content().decode('utf-8')
                
                # 检查是否为噪声页面
                is_noise, skip_reason = self.is_noise_page(item, content)
                if is_noise:
                    self.skipped_files.append({
                        'index': spine_item['index'],
                        'file_name': spine_item['file_name'],
                        'item_id': spine_item['item_id'],
                        'skip_reason': skip_reason
                    })
                    self.logger.debug(f"跳过噪声页面: {spine_item['file_name']} - {skip_reason}")
                    print(f"  ⊘ 跳过: {spine_item['file_name']} ({skip_reason})")
                    continue
                
                # 生成输出文件名
                original_name = spine_item['file_name']
                base_name = Path(original_name).stem
                output_filename = f"chapter_{spine_item['index']:03d}_{base_name}.html"
                
                # 保存未清理版本
                raw_file_path = raw_output_path / output_filename
                with open(raw_file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                # 清理内容并保存清理版本
                cleaned_content = self.clean_html_content(content)
                cleaned_file_path = cleaned_output_path / output_filename
                with open(cleaned_file_path, 'w', encoding='utf-8') as f:
                    f.write(cleaned_content)
                
                extracted_files.append({
                    'index': spine_item['index'],
                    'original_name': original_name,
                    'output_name': output_filename,
                    'raw_file_path': str(raw_file_path),
                    'cleaned_file_path': str(cleaned_file_path),
                    'raw_size_bytes': len(content.encode('utf-8')),
                    'cleaned_size_bytes': len(cleaned_content.encode('utf-8'))
                })
                
                print(f"  ✓ 提取: {original_name} -> {output_filename}")
                
            except Exception as e:
                print(f"  ✗ 提取失败: {spine_item['file_name']} - {e}")
                self.logger.error(f"提取失败: {spine_item['file_name']} - {e}")
        
        # 生成提取报告
        report = {
            'metadata': self.metadata,
            'extraction_summary': {
                'total_files_extracted': len(extracted_files),
                'total_files_skipped': len(self.skipped_files),
                'raw_output_directory': str(raw_output_path),
                'cleaned_output_directory': str(cleaned_output_path),
                'epub_source': str(self.epub_path),
                'config_used': self.config
            },
            'spine_info': self.spine_info,
            'extracted_files': extracted_files,
            'skipped_files': self.skipped_files
        }
        
        # 保存报告
        report_path = base_output_path / 'extraction_report.json'
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n提取完成！")
        print(f"  - 成功提取: {len(extracted_files)} 个文件")
        print(f"  - 跳过文件: {len(self.skipped_files)} 个")
        print(f"  - 未清理版本: {raw_output_path}")
        print(f"  - 清理版本: {cleaned_output_path}")
        print(f"  - 提取报告: {report_path}")
        
        return True
    
    def preview_first_chapter(self) -> str:
        """预览第一章内容"""
        if not self.book:
            return "请先加载EPUB文件"
        
        if not self.spine_info:
            return "未找到可读取的章节"
        
        # 获取第一个线性章节
        first_chapter = None
        for item in self.spine_info:
            if item['linear'] == 'yes':
                first_chapter = item
                break
        
        if not first_chapter:
            first_chapter = self.spine_info[0]
        
        item = self.book.get_item_with_id(first_chapter['item_id'])
        if item:
            html_content = item.get_content().decode('utf-8')
            cleaned_html = self.clean_html_content(html_content)
            
            # 只显示前1000个字符作为预览
            preview = cleaned_html[:1000] + "..." if len(cleaned_html) > 1000 else cleaned_html
            return f"第一章预览 ({first_chapter['file_name']}):\n\n{preview}"
        
        return "无法读取第一章内容"

def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(
        description='EPUB HTML提取器 - 从EPUB文件中提取HTML内容',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python html_extractor.py                          # 交互式选择EPUB文件
  python html_extractor.py book.epub                # 处理指定文件
  python html_extractor.py --no-skip-noise          # 不跳过噪声页面
  python html_extractor.py --no-preserve-comments   # 不保留HTML注释
  python html_extractor.py --verbose                # 显示详细日志
        """
    )
    
    parser.add_argument(
        'epub_file', 
        nargs='?', 
        help='要处理的EPUB文件路径（可选，不指定则交互式选择）'
    )
    
    parser.add_argument(
        '--output-dir', '-o',
        default='extracted_html',
        help='输出目录（默认: extracted_html）'
    )
    
    parser.add_argument(
        '--preserve-comments',
        action='store_true',
        default=True,
        help='保留HTML注释（默认启用）'
    )
    
    parser.add_argument(
        '--no-preserve-comments',
        action='store_false',
        dest='preserve_comments',
        help='不保留HTML注释'
    )
    
    parser.add_argument(
        '--skip-noise-pages',
        action='store_true',
        default=True,
        help='跳过噪声页面（默认启用）'
    )
    
    parser.add_argument(
        '--no-skip-noise',
        action='store_false',
        dest='skip_noise_pages',
        help='不跳过噪声页面'
    )
    
    parser.add_argument(
        '--keep-cover',
        action='store_true',
        default=True,
        help='保留封面页（默认启用）'
    )
    
    parser.add_argument(
        '--no-keep-cover',
        action='store_false',
        dest='keep_cover',
        help='不保留封面页'
    )
    
    parser.add_argument(
        '--min-text-length',
        type=int,
        default=MIN_TEXT_LENGTH,
        help=f'最小文本长度阈值（默认: {MIN_TEXT_LENGTH}）'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='显示详细日志'
    )
    
    return parser.parse_args()

def select_epub_files(epub_file_arg: Optional[str] = None) -> List[Path]:
    """选择EPUB文件（支持多选）"""
    if epub_file_arg:
        epub_path = Path(epub_file_arg)
        if epub_path.exists() and epub_path.suffix.lower() == '.epub':
            return [epub_path]
        else:
            print(f"错误: 文件 {epub_file_arg} 不存在或不是EPUB文件")
            return []
    
    # 查找当前目录和epub-files子目录下的EPUB文件
    current_dir = Path.cwd()
    epub_files = list(current_dir.glob("*.epub"))
    epub_files.extend(list(current_dir.glob("epub-files/*.epub")))
    
    if not epub_files:
        print("当前目录下未找到EPUB文件")
        return []
    
    if len(epub_files) == 1:
        epub_path = epub_files[0]
        print(f"找到EPUB文件: {epub_path}")
        return [epub_path]
    else:
        print("找到多个EPUB文件:")
        for i, epub_file in enumerate(epub_files, 1):
            print(f"  {i}. {epub_file.name}")
        
        while True:
            try:
                choice_input = input("\n请选择要处理的文件编号（多个用逗号分隔，如: 1,3,5）: ")
                if not choice_input.strip():
                    print("请输入有效的编号")
                    continue
                
                choices = [int(x.strip()) - 1 for x in choice_input.split(',')]
                selected_files = []
                
                for choice in choices:
                    if 0 <= choice < len(epub_files):
                        selected_files.append(epub_files[choice])
                    else:
                        print(f"编号 {choice + 1} 无效，已跳过")
                
                if selected_files:
                    return selected_files
                else:
                    print("未选择有效文件")
                    
            except ValueError:
                print("请输入有效数字")
            except EOFError:
                print("\n用户取消操作")
                return []

def main():
    args = parse_arguments()
    
    # 构建配置
    config = {
        'preserve_comments': args.preserve_comments,
        'skip_noise_pages': args.skip_noise_pages,
        'keep_cover': args.keep_cover,
        'min_text_length': args.min_text_length,
        'verbose': args.verbose,
    }
    
    # 选择EPUB文件（支持多选）
    epub_paths = select_epub_files(args.epub_file)
    if not epub_paths:
        return
    
    print(f"\n准备处理 {len(epub_paths)} 个EPUB文件")
    
    # 处理每个EPUB文件
    for i, epub_path in enumerate(epub_paths, 1):
        print(f"\n{'='*60}")
        print(f"处理第 {i}/{len(epub_paths)} 个文件: {epub_path.name}")
        print(f"{'='*60}")
        
        # 创建提取器并执行提取
        extractor = EPUBHTMLExtractor(str(epub_path), args.output_dir, config)
        
        if extractor.load_epub():
            extractor.extract_metadata()
            extractor.extract_toc_info()
            extractor.extract_spine_info()
            extractor.extract_all_html_files()
        else:
            print(f"EPUB文件加载失败: {epub_path}")
    
    print(f"\n{'='*60}")
    print(f"所有文件处理完成！共处理了 {len(epub_paths)} 个EPUB文件")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()