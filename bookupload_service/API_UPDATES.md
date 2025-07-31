# EPUB Extractor Service API 更新说明

## 主要变更

### 1. 自动生成 Book ID
- **变更**: `book_id` 现在由 Supabase 数据库自动生成
- **影响**: `/extract` 接口不再需要 `book_id` 参数
- **数据库要求**: `books` 表的 `id` 字段应为自增主键或使用 `gen_random_uuid()` 默认值

### 2. 新增 EPUB 文件列表接口
- **新接口**: `GET /epubs`
- **功能**: 列出 Supabase Storage 中所有 `.epub` 文件
- **返回**: 文件名、大小、创建时间、更新时间和完整 URL

### 3. 封面图片处理变更
- **变更**: 封面图片不再上传到 Storage bucket
- **新方式**: 直接提取为 Base64 编码存储在数据库的 `cover_base64` 字段
- **格式**: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...`
- **移除**: `cover_url` 字段不再使用

## API 接口文档

### 健康检查
```http
GET /health
```

**响应**:
```json
{
  "status": "up",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 列出 EPUB 文件
```http
GET /epubs
```

**响应**:
```json
{
  "files": [
    {
      "name": "example.epub",
      "size": 1024000,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "url": "https://your-project.supabase.co/storage/v1/object/public/bookepub/example.epub"
    }
  ],
  "total": 1
}
```

### EPUB 解析
```http
POST /extract
Content-Type: application/json

{
  "epub_url": "https://example.com/book.epub"
}
```

**响应**:
```json
{
  "book_id": 123,
  "title": "Book Title",
  "author": "Author Name",
  "chapters": 15,
  "cover_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "chapter_urls": [
    "https://your-project.supabase.co/storage/v1/object/public/bookhtml/123/chapter_1.html"
  ],
  "message": "EPUB parsed and uploaded successfully"
}
```

## 环境变量要求

```env
# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_STORAGE_BUCKET=bookepub

# 服务配置
PORT=8082
NODE_ENV=production

# 存储桶配置
BUCKET_HTML=bookhtml
BUCKET_COVER=bookcover  # 不再使用，但保留兼容性
PUBLIC_BUCKET=public

# 可选配置
DOWNLOAD_TIMEOUT=30000
MAX_FILE_SIZE=50MB
```

## 数据库 Schema 更新

### books 表结构
```sql
CREATE TABLE books (
  id BIGSERIAL PRIMARY KEY,  -- 或使用 UUID 类型
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  description TEXT,
  language VARCHAR(10) DEFAULT 'en',
  publisher VARCHAR(255),
  published_date DATE,
  cover_base64 TEXT,  -- 新字段：Base64 编码的封面图片
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 测试

使用提供的 Postman 测试集 `postman_collection_updated.json` 进行 API 测试。

### 快速测试命令

```bash
# 健康检查
curl http://localhost:8082/health

# 列出 EPUB 文件
curl http://localhost:8082/epubs

# 解析 EPUB
curl -X POST http://localhost:8082/extract \
  -H "Content-Type: application/json" \
  -d '{"epub_url": "https://www.gutenberg.org/ebooks/74.epub.noimages"}'
```

## 部署注意事项

1. 确保数据库 `books` 表已更新为支持自动生成 ID
2. 确保 `SUPABASE_STORAGE_BUCKET` 环境变量已正确配置
3. 如果使用现有数据，可能需要数据迁移脚本来处理 `cover_url` 到 `cover_base64` 的转换
4. 更新前端代码以使用新的 API 响应结构