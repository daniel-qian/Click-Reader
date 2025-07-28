# 介绍imaread中已有的书籍文件储存数据库表格
epub文件储存在oss bucket中，表格中附带着每本书的url

## 表格结构

```sql
DESCRIBE books;

# Field, Type, Null, Key, Default, Extra
'title', 'varchar(255)', 'YES', '', NULL, ''
'language', 'varchar(2)', 'NO', '', 'zh', ''
'id', 'int unsigned', 'NO', 'PRI', NULL, 'auto_increment'
'epub_url', 'varchar(2083)', 'NO', '', NULL, ''
'created_at', 'timestamp', 'NO', '', 'CURRENT_TIMESTAMP', 'DEFAULT_GENERATED'
'cover_url', 'mediumtext', 'YES', '', NULL, ''
'cover_data', 'mediumblob', 'YES', '', NULL, ''
'author', 'varchar(255)', 'YES', '', NULL, ''
```