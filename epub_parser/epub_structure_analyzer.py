#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPUB结构分析器 - 详细分析EPUB文件的完整结构
用于理解EPUB的组织方式，找到正确的章节识别方法
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any

try:
    import ebooklib
    from ebooklib import epub
except ImportError:
    print("请安装ebooklib库: pip install EbookLib")
    exit(1)

from bs4 import BeautifulSoup

class EPUBStructureAnalyzer:
    def __init__(self, epub_path: str):
        self.epub_path = epub_path
        self.book = None
        
    def get_item_type_name(self, item_type):
        """获取项目类型的可读名称"""
        type_map = {
            ebooklib.ITEM_UNKNOWN: 'UNKNOWN',
            ebooklib.ITEM_IMAGE: 'IMAGE', 
            ebooklib.ITEM_STYLE: 'STYLE',
            ebooklib.ITEM_SCRIPT: 'SCRIPT',
            ebooklib.ITEM_NAVIGATION: 'NAVIGATION',
            ebooklib.ITEM_VECTOR: 'VECTOR',
            ebooklib.ITEM_FONT: 'FONT',
            ebooklib.ITEM_VIDEO: 'VIDEO',
            ebooklib.ITEM_AUDIO: 'AUDIO',
            ebooklib.ITEM_DOCUMENT: 'DOCUMENT',
            ebooklib.ITEM_COVER: 'COVER'
        }
        return type_map.get(item_type, f'TYPE_{item_type}')
        
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
    
    def analyze_metadata(self) -> Dict[str, Any]:
        """分析书籍元数据"""
        print("\n" + "="*60)
        print("📖 书籍元数据分析")
        print("="*60)
        
        metadata = {}
        
        if self.book:
            # 获取所有元数据
            for namespace, items in self.book.metadata.items():
                print(f"\n📋 命名空间: {namespace}")
                metadata[namespace] = []
                
                for item in items:
                    try:
                        if isinstance(item, (list, tuple)) and len(item) >= 1:
                            item_data = {
                                'value': item[0],
                                'attributes': dict(item[1]) if len(item) > 1 and item[1] else {}
                            }
                            metadata[namespace].append(item_data)
                            attrs_str = dict(item[1]) if len(item) > 1 and item[1] else ''
                            print(f"   - {item[0]} {attrs_str}")
                        else:
                            # 处理其他格式的元数据
                            item_data = {
                                'value': str(item),
                                'attributes': {}
                            }
                            metadata[namespace].append(item_data)
                            print(f"   - {item}")
                    except Exception as e:
                        print(f"   ⚠️ 处理元数据项时出错: {e}, 项目: {item}")
                        continue
        
        return metadata
    
    def analyze_spine(self) -> List[Dict[str, Any]]:
        """分析书籍脊柱（阅读顺序）"""
        print("\n" + "="*60)
        print("📚 书籍脊柱分析（阅读顺序）")
        print("="*60)
        
        spine_info = []
        
        if self.book and self.book.spine:
            print(f"\n📄 脊柱包含 {len(self.book.spine)} 个项目:")
            
            for i, (item_id, linear) in enumerate(self.book.spine):
                try:
                    # 查找对应的项目
                    item = None
                    for book_item in self.book.get_items():
                        if book_item.get_id() == item_id:
                            item = book_item
                            break
                    
                    spine_item = {
                        'index': i,
                        'id': item_id,
                        'linear': linear,
                        'file_name': item.get_name() if item else 'Unknown',
                        'media_type': item.get_type() if item else 'Unknown'
                    }
                    spine_info.append(spine_item)
                    
                    print(f"   {i+1:2d}. ID: {item_id:20s} Linear: {linear:5s} File: {spine_item['file_name']}")
                except Exception as e:
                    print(f"   {i+1:2d}. ❌ 处理脊柱项目 {item_id if 'item_id' in locals() else 'Unknown'} 时出错: {e}")
                    continue
        
        return spine_info
    
    def analyze_toc(self) -> List[Dict[str, Any]]:
        """分析目录结构"""
        print("\n" + "="*60)
        print("📑 目录结构分析")
        print("="*60)
        
        toc_info = []
        
        if self.book and self.book.toc:
            print(f"\n📋 目录包含 {len(self.book.toc)} 个项目:")
            
            def process_toc_item(item, level=0):
                indent = "  " * level
                
                try:
                    if isinstance(item, tuple):
                        # 这是一个章节项目
                        section, children = item
                        if hasattr(section, 'title') and hasattr(section, 'href'):
                            toc_item = {
                                'level': level,
                                'title': section.title,
                                'href': section.href,
                                'type': 'section'
                            }
                            toc_info.append(toc_item)
                            print(f"{indent}📖 {section.title} -> {section.href}")
                            
                            # 处理子项目
                            for child in children:
                                process_toc_item(child, level + 1)
                    elif hasattr(item, 'title') and hasattr(item, 'href'):
                        # 这是一个简单的链接项目
                        toc_item = {
                            'level': level,
                            'title': item.title,
                            'href': item.href,
                            'type': 'link'
                        }
                        toc_info.append(toc_item)
                        print(f"{indent}🔗 {item.title} -> {item.href}")
                    else:
                        print(f"{indent}⚠️ 未知的目录项目类型: {type(item)}")
                except Exception as e:
                    print(f"{indent}❌ 处理目录项目时出错: {e}")
            
            for item in self.book.toc:
                process_toc_item(item)
        else:
            print("\n⚠️ 未找到目录信息")
        
        return toc_info
    
    def analyze_guide(self) -> List[Dict[str, Any]]:
        """分析导航指南"""
        print("\n" + "="*60)
        print("🧭 导航指南分析")
        print("="*60)
        
        guide_info = []
        
        if self.book and self.book.guide:
            print(f"\n📍 导航指南包含 {len(self.book.guide)} 个项目:")
            
            for item in self.book.guide:
                guide_item = {
                    'type': item.type,
                    'title': item.title,
                    'href': item.href
                }
                guide_info.append(guide_item)
                print(f"   📌 类型: {item.type:15s} 标题: {item.title:20s} 链接: {item.href}")
        else:
            print("\n⚠️ 未找到导航指南信息")
        
        return guide_info
    
    def analyze_all_items(self) -> List[Dict[str, Any]]:
        """分析所有项目"""
        print("\n" + "="*60)
        print("📦 所有项目分析")
        print("="*60)
        
        all_items = []
        
        if self.book:
            items = list(self.book.get_items())
            print(f"\n📄 总共找到 {len(items)} 个项目:")
            
            for i, item in enumerate(items):
                try:
                    item_info = {
                        'index': i,
                        'id': item.get_id(),
                        'name': item.get_name(),
                        'type': item.get_type(),
                        'content_length': 0,
                        'content_preview': '',
                        'is_document': item.get_type() == ebooklib.ITEM_DOCUMENT
                    }
                    
                    # 如果是文档类型，分析内容
                    if item.get_type() == ebooklib.ITEM_DOCUMENT:
                        try:
                            content = item.get_content().decode('utf-8', errors='ignore')
                            soup = BeautifulSoup(content, 'html.parser')
                            text = soup.get_text().strip()
                            
                            item_info['content_length'] = len(text)
                            item_info['content_preview'] = text[:100] if text else ''
                            
                            # 修复：使用类型名称映射
                            type_name = self.get_item_type_name(item.get_type())
                            print(f"   {i+1:2d}. 📄 {item.get_name():30s} [{type_name:15s}] {len(text):6d}字符")
                            if text:
                                print(f"       预览: {text[:80]}...")
                        except Exception as e:
                            type_name = self.get_item_type_name(item.get_type())
                            print(f"   {i+1:2d}. 📄 {item.get_name():30s} [{type_name:15s}] 解析错误: {e}")
                    else:
                        type_name = self.get_item_type_name(item.get_type())
                        print(f"   {i+1:2d}. 📎 {item.get_name():30s} [{type_name:15s}]")
                    
                    all_items.append(item_info)
                    
                except Exception as e:
                    print(f"   {i+1:2d}. ❌ 处理项目时出错: {e}")
                    continue
        
        return all_items
    
    def analyze_nav_document(self) -> Dict[str, Any]:
        """分析导航文档（EPUB3）"""
        print("\n" + "="*60)
        print("🗺️ 导航文档分析（EPUB3）")
        print("="*60)
        
        nav_info = {'found': False, 'content': ''}
        
        if self.book:
            # 查找导航文档
            for item in self.book.get_items():
                try:
                    if item.get_type() == ebooklib.ITEM_NAVIGATION:
                        nav_info['found'] = True
                        try:
                            content = item.get_content().decode('utf-8', errors='ignore')
                            nav_info['content'] = content
                            
                            # 修复：优先使用xml解析器
                            try:
                                soup = BeautifulSoup(content, 'xml')
                            except:
                                # 如果没有安装lxml，回退到html.parser
                                import warnings
                                from bs4 import XMLParsedAsHTMLWarning
                                warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)
                                soup = BeautifulSoup(content, 'html.parser')
                            
                            nav_elements = soup.find_all('nav')
                            
                            print(f"\n📍 找到导航文档: {item.get_name()}")
                            print(f"📋 包含 {len(nav_elements)} 个导航元素:")
                            
                            for i, nav in enumerate(nav_elements):
                                nav_type = nav.get('epub:type', '未知类型')
                                print(f"   {i+1}. 导航类型: {nav_type}")
                                
                                # 查找列表项
                                ol_elements = nav.find_all('ol')
                                for ol in ol_elements:
                                    li_elements = ol.find_all('li')
                                    print(f"      包含 {len(li_elements)} 个列表项")
                                    
                                    for j, li in enumerate(li_elements[:5]):  # 只显示前5个
                                        a_tag = li.find('a')
                                        if a_tag:
                                            title = a_tag.get_text().strip()
                                            href = a_tag.get('href', '')
                                            print(f"        {j+1}. {title} -> {href}")
                        except Exception as e:
                            print(f"⚠️ 解析导航文档时出错: {e}")
                        break
                except Exception as e:
                    print(f"⚠️ 处理导航项目时出错: {e}")
                    continue
            
            if not nav_info['found']:
                print("\n⚠️ 未找到EPUB3导航文档")
        
        return nav_info
    
    def generate_full_analysis(self, output_file: str = None) -> Dict[str, Any]:
        """生成完整的结构分析报告"""
        if not self.load_epub():
            return None
        
        print(f"\n🔍 开始分析EPUB结构: {os.path.basename(self.epub_path)}")
        
        analysis = {
            'file_path': self.epub_path,
            'file_name': os.path.basename(self.epub_path),
            'metadata': self.analyze_metadata(),
            'spine': self.analyze_spine(),
            'toc': self.analyze_toc(),
            'guide': self.analyze_guide(),
            'all_items': self.analyze_all_items(),
            'nav_document': self.analyze_nav_document()
        }
        
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(analysis, f, ensure_ascii=False, indent=2)
            print(f"\n💾 分析报告已保存到: {output_file}")
        
        print("\n" + "="*60)
        print("✅ 结构分析完成")
        print("="*60)
        
        return analysis

def main():
    """主函数"""
    # 使用相对路径，基于当前脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    epub_dir = os.path.join(script_dir, "epub-files")
    output_dir = os.path.join(script_dir, "analysis")
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 获取epub文件列表
    epub_files = [f for f in os.listdir(epub_dir) if f.endswith('.epub')]
    
    print(f"🚀 开始分析EPUB文件结构...")
    print(f"📂 输入目录: {epub_dir}")
    print(f"📂 输出目录: {output_dir}")
    print(f"📚 找到 {len(epub_files)} 个EPUB文件\n")
    
    for epub_file in epub_files:
        epub_path = os.path.join(epub_dir, epub_file)
        output_file = os.path.join(output_dir, f"{os.path.splitext(epub_file)[0]}_structure.json")
        
        print(f"\n{'='*80}")
        print(f"🔄 分析文件: {epub_file}")
        print(f"{'='*80}")
        
        try:
            analyzer = EPUBStructureAnalyzer(epub_path)
            analysis = analyzer.generate_full_analysis(output_file)
            
            if analysis:
                print(f"✅ {epub_file} 分析完成")
            else:
                print(f"❌ {epub_file} 分析失败")
                
        except Exception as e:
            print(f"❌ 分析 {epub_file} 时发生错误: {e}")
    
    print(f"\n🎉 所有文件分析完成!")
    print(f"📁 分析报告保存在: {output_dir}")

if __name__ == "__main__":
    main()