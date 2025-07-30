# EPUB 解析服务部署脚本 (PowerShell)
# 使用方法: .\deploy.ps1 [环境]

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

$ImageName = "epub-extractor"
$ContainerName = "epub-extractor-service"
$Port = "8082"

Write-Host "🚀 开始部署 EPUB 解析服务 (环境: $Environment)" -ForegroundColor Green

# 检查必需的环境变量
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_KEY) {
    Write-Host "❌ 错误: 请设置 SUPABASE_URL 和 SUPABASE_SERVICE_KEY 环境变量" -ForegroundColor Red
    Write-Host "示例:" -ForegroundColor Yellow
    Write-Host "`$env:SUPABASE_URL = 'https://your-project.supabase.co'" -ForegroundColor Yellow
    Write-Host "`$env:SUPABASE_SERVICE_KEY = 'your_service_key'" -ForegroundColor Yellow
    exit 1
}

# 检查 Docker 是否运行
try {
    docker version | Out-Null
} catch {
    Write-Host "❌ 错误: Docker 未运行或未安装" -ForegroundColor Red
    exit 1
}

# 停止并删除现有容器
Write-Host "🛑 停止现有容器..." -ForegroundColor Yellow
try {
    docker stop $ContainerName 2>$null
    docker rm $ContainerName 2>$null
} catch {
    # 忽略错误，容器可能不存在
}

# 构建新镜像
Write-Host "🔨 构建 Docker 镜像..." -ForegroundColor Yellow
docker build -t $ImageName .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 镜像构建失败" -ForegroundColor Red
    exit 1
}

# 启动新容器
Write-Host "🚀 启动新容器..." -ForegroundColor Yellow
$BucketHtml = if ($env:BUCKET_HTML) { $env:BUCKET_HTML } else { "bookhtml" }
$BucketCover = if ($env:BUCKET_COVER) { $env:BUCKET_COVER } else { "bookcovers" }
$PublicBucket = if ($env:PUBLIC_BUCKET) { $env:PUBLIC_BUCKET } else { "true" }

docker run -d `
  --name $ContainerName `
  -p "${Port}:8082" `
  -e "SUPABASE_URL=$env:SUPABASE_URL" `
  -e "SUPABASE_SERVICE_KEY=$env:SUPABASE_SERVICE_KEY" `
  -e "BUCKET_HTML=$BucketHtml" `
  -e "BUCKET_COVER=$BucketCover" `
  -e "PUBLIC_BUCKET=$PublicBucket" `
  -e "NODE_ENV=$Environment" `
  --restart unless-stopped `
  $ImageName

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 容器启动失败" -ForegroundColor Red
    exit 1
}

# 等待服务启动
Write-Host "⏳ 等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 健康检查
Write-Host "🔍 执行健康检查..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 部署成功! 服务运行在 http://localhost:$Port" -ForegroundColor Green
        Write-Host "📊 健康检查: http://localhost:$Port/health" -ForegroundColor Cyan
        Write-Host "📚 API 文档: 查看 README.md" -ForegroundColor Cyan
    } else {
        throw "健康检查返回状态码: $($response.StatusCode)"
    }
} catch {
    Write-Host "❌ 健康检查失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "查看容器日志:" -ForegroundColor Yellow
    docker logs $ContainerName
    exit 1
}

# 显示容器状态
Write-Host "📋 容器状态:" -ForegroundColor Cyan
docker ps --filter "name=$ContainerName" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 清理旧镜像
Write-Host "🧹 清理旧镜像..." -ForegroundColor Yellow
docker image prune -f | Out-Null

Write-Host "🎉 部署完成!" -ForegroundColor Green

# 显示有用的命令
Write-Host "`n📝 有用的命令:" -ForegroundColor Cyan
Write-Host "查看日志: docker logs -f $ContainerName" -ForegroundColor Gray
Write-Host "停止服务: docker stop $ContainerName" -ForegroundColor Gray
Write-Host "重启服务: docker restart $ContainerName" -ForegroundColor Gray