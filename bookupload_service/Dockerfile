FROM node:20-slim

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖（仅生产环境）
RUN npm ci --omit=dev && npm cache clean --force

# 复制源代码
COPY . .

# 创建临时目录
RUN mkdir -p temp

# 设置环境变量
ENV NODE_ENV=production \
    PORT=8082 \
    SUPABASE_URL= \
    SUPABASE_SERVICE_KEY= \
    SUPABASE_STORAGE_BUCKET=bookepub \
    MAX_FILE_SIZE=50MB \
    TEMP_DIR=/tmp

# 暴露端口
EXPOSE 8082

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8082/health || exit 1

# 启动应用
CMD ["node", "server.js"]