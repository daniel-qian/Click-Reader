## github登录

## 表格
1. users(supabase auth自带的)
2. profiles(为空，头像、简介等，优先级不高，之后再弄)
3. books
4. chapters
5. hotspots
6. events （用来算KPI、用户数据、使用数据，需要在前端埋点调用，在supabase中已经订好了RLS功能）

## 表格字段
上supabase看

## 作者、封面、epuburl等
自动化脚本在imaread后端服务器已经实现，可以复用
莫斯科绅士**测试先手动添加**键位提供给工作流团队进行开发测试
之后要通过以下方式（按最优顺序排列）实现
    1. supabase云平台脚本执行
    2. 工作流脚本执行
    3. 服务器脚本执行

## Foreign Keys（外键） 
是一种用于建立表与表之间关系的约束。通俗点讲，外键确保某个字段的值必须引用另一个表中已存在的值，用来保证数据的一致性和完整性
需不需要再book和chapter之间设置

### supabase bucket
cleanhtml
epubbook

## chapter idx
这个很重要，chapterhtml在解析的时候需要通过spine返回idx，前端渲染的时候才知道顺序