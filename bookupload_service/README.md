# EPUB 解析服务

<!-- Trigger deployment test -->

基于 Node.js + Express 的 EPUB 解析服务，用于将 EPUB 文件解析并存储到 Supabase。

## 坑/注意事项

- 由于ecs位于国内，网络拉取不了node，用docker images检查已有的镜像发现有node可以直接使用，所以直接用
- 注意清理悬空镜像
- ide使用的是windows电脑，不要自动执行Ubuntu命令，只需要告诉我我手动ssh到ecs上执行

## 功能特性
 
- 📚 EPUB 文件下载和解析
- 🖼️ 封面图片提取和上传到 Storage
- 📄 章节 HTML 内容提取和存储到 Storage
- 🗄️ 自动写入 books 表到 Supabase 数据库
- 🐳 Docker 容器化部署
- 🔍 健康检查接口

## API 接口

### POST /extract

解析 EPUB 文件并存储到 Supabase。

**请求体：**
```json
{
  "epub_url": "https://example.com/book.epub",
  "book_id": "optional-uuid"
}
```

**成功响应：**
```json
{
  "book_id": "4d5c6789-...",
  "chapters": 12,
  "cover_url": "https://supabase.../bookcovers/4d5c6789.jpg",
  "title": "书名",
  "author": "作者"
}
```

**错误码：**
- `400` - 参数错误
- `409` - 书籍已存在
- `500` - 服务器错误

### GET /health

健康检查接口。

**响应：**
```json
{
  "status": "up",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 环境变量

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `SUPABASE_URL` | ✅ | - | Supabase 项目 URL |
| `SUPABASE_SERVICE_KEY` | ✅ | - | Supabase Service Key |
| `PORT` | ❌ | `8082` | 服务端口 |
| `BUCKET_HTML` | ❌ | `bookhtml` | HTML 文件存储桶 |
| `BUCKET_COVER` | ❌ | `bookcovers` | 封面图片存储桶 |
| `PUBLIC_BUCKET` | ❌ | `true` | 是否使用公开存储桶 |

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 设置环境变量

创建 `.env` 文件：

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
PORT=8082
```

### 3. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### 4. 测试接口

```bash
# 健康检查
curl http://localhost:8082/health

# 解析 EPUB
curl -X POST http://localhost:8082/extract \
  -H "Content-Type: application/json" \
  -d '{"epub_url": "https://example.com/book.epub"}'
```

## 部署

### 本地开发部署

#### 使用 Docker Compose（推荐）

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 使用 Docker

```bash
# 构建镜像
docker build -t click-book-service .

# 运行容器（使用环境变量文件）
docker run -d \
  --name click-book-service \
  -p 8082:8082 \
  --env-file .env \
  --restart unless-stopped \
  click-book-service

# 或者直接传入环境变量
docker run -d \
  --name click-book-service \
  -p 8082:8082 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_KEY=your_service_key_here \
  -e SUPABASE_STORAGE_BUCKET=bookepub \
  --restart unless-stopped \
  click-book-service

# 查看日志
docker logs click-book-service
```

### 生产环境部署

#### 阿里云ECS Ubuntu部署

**快速部署（推荐）：**

```bash
# 一键部署脚本
chmod +x quick-deploy-ecs.sh
./quick-deploy-ecs.sh
```

**手动部署：**

```bash
# 使用部署脚本
chmod +x deploy.sh
./deploy.sh
```

**详细部署指南：**

查看 [ECS_DEPLOY.md](./ECS_DEPLOY.md) 获取完整的阿里云ECS部署指南，包括：
- Docker安装
- 环境配置
- 安全组设置
- 故障排除
- 性能优化

#### 部署前准备

1. **ECS服务器要求：**
   - Ubuntu 18.04+
   - 至少1GB内存
   - 已安装Docker和Docker Compose
   - 安全组开放8082端口

2. **Supabase配置：**
   - 创建`books`表
   - 配置Storage存储桶
   - 获取Service Key

3. **环境变量配置：**
   ```bash
   cp .env.example .env
   nano .env  # 编辑配置
   ```

## 数据库表结构

### books 表

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  language CHAR(2) DEFAULT 'en',
  epub_url TEXT,
  cover_url TEXT,
  cover_base64 TEXT,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 注意

此服务仅填写 books 表，章节内容直接存储在 Storage 中，不需要 chapters 表。

## 存储桶配置

确保在 Supabase 中创建以下存储桶：

- `bookcovers` - 存储封面图片
- `bookhtml` - 存储章节 HTML 文件

## 故障排除

### 常见错误

1. **下载失败**
   - 检查 EPUB URL 是否可访问
   - 确认网络连接正常

2. **Supabase 连接失败**
   - 验证 `SUPABASE_URL` 和 `SUPABASE_SERVICE_KEY`
   - 检查 Supabase 项目状态

3. **存储桶错误**
   - 确认存储桶已创建
   - 检查 Service Key 权限

### 日志级别

服务会输出详细的操作日志，包括：
- EPUB 下载进度
- 解析状态
- 上传结果
- 错误详情

## 性能优化

- 推荐配置：0.5 vCPU / 512 MB 内存
- 支持并发处理多个请求
- 自动清理临时文件
- 优雅关闭处理

## 安全注意事项

- Service Key 具有完整数据库权限，请妥善保管
- 建议在生产环境中添加 JWT 认证
- 考虑使用 VPC 限制网络访问