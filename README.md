# Click-Reader

一个交互式阅读器项目，支持EPUB文件解析和可视化阅读体验。

### docs/
存放项目相关文档，包括：
- **实践调研笔记** - 技术调研和实践记录
- **会议记录** - 项目会议纪要和决策记录
- **项目specs文件** - 项目规格说明和技术规范

### epub_parser/
EPUB文件解析工作区，主要功能：
- 解析EPUB格式电子书
- 提取书籍结构和内容
- 输出标准化的JSON格式数据
- 为交互式阅读器提供数据支持

### interactive-reader/
交互式阅读器原型工作区，包含：
- Next.js前端应用
- 交互式阅读界面
- 可视化组件和功能
- 用户体验原型实现

## 快速开始

### EPUB解析器
```bash
cd epub_parser
pip install -r requirements.txt
python epub_structure_analyzer.py
```

### 交互式阅读器
```bash
cd interactive-reader
npm install
npm run dev
```