# epub的使用和解析

### 重点
1. ***没有真正意义上的解析epub拆分章节的解决方案***
    - The hard part is semantic labeling, not extraction. epub中的字段命名不统一，例如有些epub中命名为chapter，有些命名为index
    - epub的主要作用是将书籍内容、阅读顺序、元素信息等信息压缩在一个文件中的一种方式
    - epub中固定包含的内容有
        1. container layer：包含所有html/xhtml文件
        2. manifest layer：元信息，例如作者、语言、图片、注释
        3. spine：排序列表说明阅读顺序

2. LLM模型完全可以理解xhtml/html，效果不逊于json

3. 值得注意的元素字段
    - toc：目录
    - linear属性
        位置：只出现在 <itemref> 层级。
        默认值：yes（省略即视为是主阅读流）。
        用途：linear="no" —— 脚注、练习答案、弹窗式解释等“跳转到达”内容；阅读器正常翻页时会跳过，但需保证有链接可访问

4. 工作流既然只处理单个章节的内容，只要将epub中的所有html文件以及spine/manifest里的重要信息提取出来，对其进行清理，例如删除注释、删除多余的标签、删除多余的空格等，就可以得到一个章节的内容
    - 这个工作可能涉及到语义问题，prototype可以先通过人工完成，但是之后应该需要agent/工作流完成

5. html/xhtml可不可以直接应用在前端的渲染
这些新内容如何影响我们之前的计划？例如hotspot/json定位是不是不使用cfi？而是使用关于html/xhtml中的方法

> **当前实现不再依赖 CFI；定位改由字符区间或 XPath 方案，详见 Data Contract。**