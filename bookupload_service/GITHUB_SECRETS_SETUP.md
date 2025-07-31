# GitHub Secrets 配置指南

## 必须配置的 GitHub Secrets

在你的 GitHub 仓库中，需要配置以下 Secrets 才能让 CI/CD 正常工作：

### 1. ECS 服务器连接信息

```
ECS_HOST=120.55.193.82
ECS_USER=root
ECS_SSH_KEY=<你的SSH私钥内容>
```

### 2. Supabase 配置

```
SUPABASE_URL=<你的Supabase项目URL>
SUPABASE_SERVICE_KEY=<你的Supabase服务密钥>
```

## SSH 密钥配置步骤

### 步骤 1: 生成 SSH 密钥对（如果还没有）

在你的本地机器上运行：

```bash
# 生成新的SSH密钥对
ssh-keygen -t rsa -b 4096 -C "github-actions@yourdomain.com"

# 保存到默认位置或指定位置
# 例如：~/.ssh/github_actions_key
```

### 步骤 2: 将公钥添加到 ECS 服务器

```bash
# 复制公钥内容
cat ~/.ssh/github_actions_key.pub

# SSH 到你的 ECS 服务器
ssh -o ServerAliveInterval=60 root@120.55.193.82

# 在服务器上添加公钥到 authorized_keys
echo "<你的公钥内容>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### 步骤 3: 在 GitHub 中配置 Secrets

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret** 添加以下 secrets：

#### ECS_HOST
```
120.55.193.82
```

#### ECS_USER
```
root
```

#### ECS_SSH_KEY
```
-----BEGIN OPENSSH PRIVATE KEY-----
<你的私钥内容>
-----END OPENSSH PRIVATE KEY-----
```

**注意**: 复制整个私钥文件内容，包括开始和结束标记。

```bash
# 获取私钥内容
cat ~/.ssh/github_actions_key
```

#### SUPABASE_URL
```
https://your-project-id.supabase.co
```

#### SUPABASE_SERVICE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 测试 SSH 连接

在配置完成后，测试 SSH 连接是否正常：

```bash
# 使用私钥测试连接
ssh -i ~/.ssh/github_actions_key -o ServerAliveInterval=60 root@120.55.193.82
```

## ECS 服务器准备

确保你的 ECS 服务器已安装 Docker：

```bash
# 安装 Docker（如果未安装）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 将用户添加到 docker 组（可选）
sudo usermod -aG docker $USER
```

## 自动部署触发条件

配置完成后，以下操作会自动触发部署：

1. **推送到 `master` 分支**
2. **修改 `bookupload_service/` 目录下的任何文件**

### 测试自动部署

```bash
# 在 bookupload_service 目录下做一个小修改
echo "# Test deployment" >> bookupload_service/README.md

# 提交并推送到 master 分支
git add .
git commit -m "test: trigger auto deployment"
git push origin master
```

## 监控部署状态

1. 进入 GitHub 仓库的 **Actions** 页面
2. 查看最新的 workflow 运行状态
3. 点击具体的 workflow 查看详细日志

## 故障排除

### 常见问题

1. **SSH 连接失败**
   - 检查 ECS_HOST、ECS_USER 是否正确
   - 确认私钥格式正确（包含完整的开始和结束标记）
   - 确认公钥已正确添加到服务器的 ~/.ssh/authorized_keys

2. **Docker 拉取镜像失败**
   - 确认服务器能访问 ghcr.io
   - 检查 GitHub Container Registry 权限

3. **服务启动失败**
   - 检查 SUPABASE_URL 和 SUPABASE_SERVICE_KEY 是否正确
   - 确认端口 8082 未被占用

### 手动验证部署

```bash
# SSH 到服务器检查容器状态
ssh -o ServerAliveInterval=60 root@120.55.193.82

# 查看容器状态
docker ps

# 查看容器日志
docker logs click-book-service

# 测试健康检查
curl http://localhost:8082/health
```

## 安全注意事项

1. **私钥安全**: 确保私钥只存储在 GitHub Secrets 中，不要提交到代码仓库
2. **最小权限**: SSH 用户只应有必要的权限
3. **定期轮换**: 定期更换 SSH 密钥和 Supabase 密钥
4. **监控访问**: 定期检查服务器访问日志