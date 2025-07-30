#!/bin/bash

# EPUB 解析服务部署脚本
# 适用于 Ubuntu/Linux 环境（阿里云ECS）

set -e

# 配置变量
IMAGE_NAME="epub-extractor-service"
CONTAINER_NAME="epub-extractor-service"
PORT="8082"
DOCKERFILE_PATH="."
ENV_FILE=".env"
NETWORK_NAME="epub-network"

echo "🚀 开始在ECS Ubuntu环境部署 EPUB 解析服务..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "💡 运行以下命令安装 Docker:"
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "   sudo sh get-docker.sh"
    echo "   sudo usermod -aG docker \$USER"
    exit 1
fi

# 检查用户是否在docker组中
if ! groups $USER | grep -q docker; then
    echo "⚠️  当前用户不在docker组中，请运行:"
    echo "   sudo usermod -aG docker \$USER"
    echo "   newgrp docker"
    exit 1
fi

# 检查环境变量文件
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  环境变量文件 $ENV_FILE 不存在，请先配置环境变量"
    echo "💡 可以复制 .env.example 并修改配置"
    echo "   cp .env.example .env"
    echo "   nano .env"
    exit 1
fi

# 检查端口是否被占用
echo "🔍 检查端口 $PORT 是否可用..."
if netstat -tlnp 2>/dev/null | grep -q ":$PORT "; then
    echo "⚠️  端口 $PORT 已被占用，请检查:"
    netstat -tlnp | grep ":$PORT "
    echo "💡 如需强制部署，请先停止占用端口的进程"
    read -p "是否继续部署？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 创建Docker网络（如果不存在）
echo "🌐 创建Docker网络..."
docker network create $NETWORK_NAME 2>/dev/null || echo "网络 $NETWORK_NAME 已存在"

# 停止并删除现有容器（如果存在）
echo "🛑 停止现有容器..."
if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
    echo "停止容器 $CONTAINER_NAME"
    docker stop $CONTAINER_NAME
fi

if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
    echo "删除容器 $CONTAINER_NAME"
    docker rm $CONTAINER_NAME
fi

# 构建新的 Docker 镜像
echo "🔨 构建 Docker 镜像..."
docker build -t $IMAGE_NAME $DOCKERFILE_PATH

if [ $? -ne 0 ]; then
    echo "❌ Docker镜像构建失败"
    exit 1
fi

# 运行新容器
echo "🚀 启动新容器..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    --network $NETWORK_NAME \
    -p $PORT:8082 \
    --env-file $ENV_FILE \
    --memory="512m" \
    --cpus="0.5" \
    $IMAGE_NAME

if [ $? -ne 0 ]; then
    echo "❌ 容器启动失败"
    exit 1
fi

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 健康检查
echo "🔍 执行健康检查..."
HEALTH_CHECK_COUNT=0
MAX_HEALTH_CHECKS=6

while [ $HEALTH_CHECK_COUNT -lt $MAX_HEALTH_CHECKS ]; do
    if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
        echo "✅ 服务部署成功！"
        echo "🌐 本地访问: http://localhost:$PORT"
        echo "📊 健康检查: http://localhost:$PORT/health"
        echo "📋 查看日志: docker logs $CONTAINER_NAME"
        
        # 显示公网IP（如果可用）
        PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "未获取到公网IP")
        if [ "$PUBLIC_IP" != "未获取到公网IP" ]; then
            echo "🌍 公网访问: http://$PUBLIC_IP:$PORT (需确保安全组已开放端口)"
        fi
        
        break
    else
        HEALTH_CHECK_COUNT=$((HEALTH_CHECK_COUNT + 1))
        echo "健康检查失败，重试中... ($HEALTH_CHECK_COUNT/$MAX_HEALTH_CHECKS)"
        sleep 10
    fi
done

if [ $HEALTH_CHECK_COUNT -eq $MAX_HEALTH_CHECKS ]; then
    echo "❌ 健康检查失败，请检查日志:"
    echo "   docker logs $CONTAINER_NAME"
    echo "   docker ps"
    exit 1
fi

# 清理旧镜像
echo "🧹 清理旧镜像..."
docker image prune -f

echo "🎉 ECS部署完成！"
echo "📝 管理命令:"
echo "   查看状态: docker ps"
echo "   查看日志: docker logs -f $CONTAINER_NAME"
echo "   停止服务: docker stop $CONTAINER_NAME"
echo "   重启服务: docker restart $CONTAINER_NAME"