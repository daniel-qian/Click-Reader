# 阿里云ECS Ubuntu部署指南

本指南将帮助您在阿里云ECS Ubuntu服务器上部署EPUB解析服务。

## 前置条件

1. 阿里云ECS实例（Ubuntu 18.04+）
2. SSH访问权限
3. 已配置的Supabase项目
4. 安全组已开放8082端口

## 部署步骤

### 1. 连接到ECS服务器

```bash
ssh username@your-ecs-ip
```

### 2. 安装Docker和Docker Compose

```bash
# 更新包管理器
sudo apt update

# 安装必要的包
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 将当前用户添加到docker组
sudo usermod -aG docker $USER

# 重新登录或运行以下命令使组权限生效
newgrp docker

# 验证安装
docker --version
docker-compose --version
```

### 3. 上传项目文件

#### 方法1: 使用Git（推荐）

```bash
# 如果您的代码在Git仓库中
git clone <your-repository-url>
cd <repository-name>/bookupload_service
```

#### 方法2: 使用SCP上传

在本地Windows机器上运行：

```powershell
# 上传整个bookupload_service目录
scp -r d:\Click-Reader\bookupload_service username@your-ecs-ip:~/
```

然后在ECS服务器上：

```bash
cd ~/bookupload_service
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

在`.env`文件中配置以下变量：

```env
# 服务配置
PORT=8082
NODE_ENV=production

# Supabase配置
SUPABASE_URL=https://nunsbijtntreynoyeilp.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_ntscr_29eilixdnL5WMZyw_Tm7d7mGr
SUPABASE_STORAGE_BUCKET=your_bucket_name

# 可选配置
MAX_FILE_SIZE=50MB
TEMP_DIR=/tmp
```

### 5. 部署服务

#### 使用Docker Compose（推荐）

```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 使用部署脚本

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

#### 使用快速部署脚本（推荐）

```bash
# 给脚本执行权限
chmod +x quick-deploy-ecs.sh

# 运行快速部署脚本
./quick-deploy-ecs.sh
```

### 6. 验证部署

```bash
# 健康检查
curl http://localhost:8082/health

# 如果配置了公网IP，也可以从外部访问
curl http://your-ecs-public-ip:8082/health
```

### 7. 配置防火墙和安全组

#### 阿里云安全组配置

1. 登录阿里云控制台
2. 进入ECS实例管理
3. 点击"安全组"配置
4. 添加入方向规则：
   - 端口范围：8082/8082
   - 授权对象：0.0.0.0/0（或特定IP段）
   - 协议类型：TCP

#### Ubuntu防火墙配置

```bash
# 检查防火墙状态
sudo ufw status

# 如果防火墙启用，允许8082端口
sudo ufw allow 8082

# 重新加载防火墙规则
sudo ufw reload
```

## 服务管理

### 查看服务状态

```bash
# 查看容器状态
docker ps

# 查看服务日志
docker logs click-book-service

# 实时查看日志
docker logs -f click-book-service
```

### 重启服务

```bash
# 使用Docker Compose
docker-compose restart

# 或者重新部署
./deploy.sh
```

### 停止服务

```bash
# 使用Docker Compose
docker-compose down

# 或者直接停止容器
docker stop click-book-service
docker rm click-book-service
```

### 更新服务

```bash
# 拉取最新代码（如果使用Git）
git pull

# 重新构建并部署
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 监控和维护

### 设置日志轮转

```bash
# 创建日志轮转配置
sudo nano /etc/logrotate.d/docker-containers
```

添加以下内容：

```
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
```

### 设置自动重启

服务已配置为自动重启（restart: unless-stopped），但您也可以设置系统级别的自动启动：

```bash
# 创建systemd服务文件
sudo nano /etc/systemd/system/epub-extractor.service
```

添加以下内容：

```ini
[Unit]
Description=EPUB Extractor Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/username/bookupload_service
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl enable epub-extractor.service
sudo systemctl start epub-extractor.service
```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep 8082
   
   # 杀死占用端口的进程
   sudo kill -9 <PID>
   ```

2. **Docker权限问题**
   ```bash
   # 确保用户在docker组中
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **内存不足**
   ```bash
   # 检查内存使用
   free -h
   
   # 检查Docker资源使用
   docker stats
   ```

4. **磁盘空间不足**
   ```bash
   # 检查磁盘使用
   df -h
   
   # 清理Docker资源
   docker system prune -a
   ```

5. **Supabase连接问题**
   ```bash
   # 检查环境变量
   cat .env
   
   # 测试Supabase连接
   curl -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        "$SUPABASE_URL/rest/v1/books?select=*&limit=1"
   ```

### 日志分析

```bash
# 查看详细错误日志
docker logs click-book-service --tail 100

# 查看系统日志
sudo journalctl -u docker.service

# 查看应用日志
docker exec click-book-service cat /app/logs/app.log
```

## 性能优化

### 资源限制

在`docker-compose.yml`中添加资源限制：

```yaml
services:
  epub-extractor:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### 缓存优化

考虑添加Redis缓存来提高性能：

```yaml
services:
  redis:
    image: redis:alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 负载均衡

如果需要处理大量请求，可以使用Nginx进行负载均衡：

```bash
# 安装Nginx
sudo apt install nginx

# 配置反向代理
sudo nano /etc/nginx/sites-available/epub-service
```

添加配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 安全建议

1. **定期更新系统和Docker**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **使用非root用户运行服务**
3. **定期备份数据**
4. **监控服务日志**
5. **限制网络访问**
6. **使用HTTPS（生产环境）**
7. **定期更新依赖包**

## 备份和恢复

### 备份配置

```bash
# 备份环境配置
cp .env .env.backup.$(date +%Y%m%d)

# 备份Docker镜像
docker save click-book-service > epub-service-backup.tar
```

### 恢复服务

```bash
# 恢复Docker镜像
docker load < epub-service-backup.tar

# 恢复配置
cp .env.backup.YYYYMMDD .env

# 重新启动服务
docker-compose up -d
```

## 联系支持

如果遇到问题，请检查：
1. 服务日志
2. 系统资源使用情况
3. 网络连接
4. Supabase配置
5. 安全组设置

部署完成后，您的EPUB解析服务将在`http://your-ecs-ip:8082`上运行。

## 测试部署

部署完成后，可以使用以下命令测试服务：

```bash
# 健康检查
curl http://localhost:8082/health

# 测试EPUB解析（需要有效的EPUB文件URL）
curl -X POST http://localhost:8082/extract \
  -H "Content-Type: application/json" \
  -d '{"epubUrl": "https://example.com/sample.epub"}'
```

预期响应：
```json
{
  "success": true,
  "message": "EPUB processed successfully",
  "bookId": "generated-uuid"
}
```