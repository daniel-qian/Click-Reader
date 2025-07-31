#!/bin/bash

# ECS 快速部署脚本
# 一键部署EPUB解析服务到阿里云ECS Ubuntu环境

set -e

echo "🚀 ECS快速部署开始..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
SERVICE_NAME="click-book-service"
PORT="8082"
ENV_FILE=".env"

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查系统要求
check_requirements() {
    print_info "检查系统要求..."
    
    # 检查操作系统
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_error "此脚本仅支持Linux系统"
        exit 1
    fi
    
    # 检查是否为Ubuntu
    if ! grep -q "Ubuntu" /etc/os-release 2>/dev/null; then
        print_warning "建议在Ubuntu系统上运行"
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        echo "安装命令:"
        echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
        echo "  sudo sh get-docker.sh"
        echo "  sudo usermod -aG docker \$USER"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_warning "Docker Compose未安装，将使用docker命令部署"
        USE_COMPOSE=false
    else
        USE_COMPOSE=true
    fi
    
    # 检查用户权限
    if ! groups $USER | grep -q docker; then
        print_error "当前用户不在docker组中"
        echo "请运行: sudo usermod -aG docker \$USER && newgrp docker"
        exit 1
    fi
    
    print_success "系统要求检查通过"
}

# 检查环境配置
check_environment() {
    print_info "检查环境配置..."
    
    if [ ! -f "$ENV_FILE" ]; then
        print_warning "环境变量文件不存在，创建默认配置"
        
        if [ -f ".env.example" ]; then
            cp .env.example $ENV_FILE
            print_info "已复制 .env.example 到 $ENV_FILE"
        else
            # 创建基本的.env文件
            cat > $ENV_FILE << EOF
# 服务配置
PORT=8082
NODE_ENV=production

# Supabase配置 - 请填写您的实际配置
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_service_key_here
SUPABASE_STORAGE_BUCKET=your_bucket_name_here

# 可选配置
MAX_FILE_SIZE=50MB
TEMP_DIR=/tmp
EOF
            print_info "已创建默认 $ENV_FILE 文件"
        fi
        
        print_warning "请编辑 $ENV_FILE 文件配置您的Supabase信息"
        print_info "编辑命令: nano $ENV_FILE"
        
        read -p "是否现在编辑配置文件？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            nano $ENV_FILE
        else
            print_warning "请稍后手动编辑 $ENV_FILE 文件"
        fi
    fi
    
    # 验证关键配置
    if grep -q "your_supabase_url_here" $ENV_FILE; then
        print_error "请先配置 $ENV_FILE 文件中的Supabase信息"
        exit 1
    fi
    
    print_success "环境配置检查完成"
}

# 部署服务
deploy_service() {
    print_info "开始部署服务..."
    
    if [ "$USE_COMPOSE" = true ]; then
        # 使用Docker Compose部署
        print_info "使用Docker Compose部署"
        
        # 停止现有服务
        docker-compose down 2>/dev/null || true
        
        # 构建并启动
        docker-compose up -d --build
        
        if [ $? -eq 0 ]; then
            print_success "Docker Compose部署成功"
        else
            print_error "Docker Compose部署失败"
            exit 1
        fi
    else
        # 使用传统Docker命令部署
        print_info "使用Docker命令部署"
        
        # 停止并删除现有容器
        docker stop $SERVICE_NAME 2>/dev/null || true
        docker rm $SERVICE_NAME 2>/dev/null || true
        
        # 构建镜像
        docker build -t $SERVICE_NAME .
        
        if [ $? -ne 0 ]; then
            print_error "Docker镜像构建失败"
            exit 1
        fi
        
        # 启动容器
        docker run -d \
            --name $SERVICE_NAME \
            --restart unless-stopped \
            -p $PORT:8082 \
            --env-file $ENV_FILE \
            --memory="512m" \
            --cpus="0.5" \
            $SERVICE_NAME
        
        if [ $? -eq 0 ]; then
            print_success "Docker容器启动成功"
        else
            print_error "Docker容器启动失败"
            exit 1
        fi
    fi
}

# 健康检查
health_check() {
    print_info "执行健康检查..."
    
    local max_attempts=12
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
            print_success "服务健康检查通过"
            return 0
        fi
        
        print_info "健康检查尝试 $attempt/$max_attempts..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_error "健康检查失败"
    print_info "查看日志: docker logs $SERVICE_NAME"
    return 1
}

# 显示部署结果
show_result() {
    print_success "🎉 部署完成！"
    
    echo
    echo "📋 服务信息:"
    echo "   容器名称: $SERVICE_NAME"
    echo "   本地端口: $PORT"
    echo "   本地访问: http://localhost:$PORT"
    echo "   健康检查: http://localhost:$PORT/health"
    
    # 获取公网IP
    local public_ip=$(curl -s ifconfig.me 2>/dev/null || echo "未获取")
    if [ "$public_ip" != "未获取" ]; then
        echo "   公网访问: http://$public_ip:$PORT"
        echo "   (需确保安全组已开放$PORT端口)"
    fi
    
    echo
    echo "📝 管理命令:"
    echo "   查看状态: docker ps | grep $SERVICE_NAME"
    echo "   查看日志: docker logs -f $SERVICE_NAME"
    echo "   停止服务: docker stop $SERVICE_NAME"
    echo "   重启服务: docker restart $SERVICE_NAME"
    
    if [ "$USE_COMPOSE" = true ]; then
        echo "   Compose停止: docker-compose down"
        echo "   Compose重启: docker-compose restart"
    fi
    
    echo
    echo "🔧 故障排除:"
    echo "   如果服务无法访问，请检查:"
    echo "   1. 阿里云安全组是否开放$PORT端口"
    echo "   2. Ubuntu防火墙: sudo ufw allow $PORT"
    echo "   3. 服务日志: docker logs $SERVICE_NAME"
}

# 主函数
main() {
    echo "======================================"
    echo "🚀 EPUB解析服务 - ECS快速部署"
    echo "======================================"
    echo
    
    check_requirements
    check_environment
    deploy_service
    
    if health_check; then
        show_result
    else
        print_error "部署失败，请检查日志"
        exit 1
    fi
}

# 捕获中断信号
trap 'print_error "部署被中断"; exit 1' INT TERM

# 运行主函数
main "$@"