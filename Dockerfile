FROM node:20-alpine AS builder

WORKDIR /app

# 安装 better-sqlite3 编译所需的依赖
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# 设置国内镜像并安装生产环境依赖
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci --only=production

# 运行阶段，舍弃编译工具，实现极简镜像
FROM node:20-alpine

WORKDIR /app

# 禁用 Puppeteer 的 Chromium 下载（由于只使用 sqlite 和 nodejs）
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 从 builder 阶段复制依赖和源码
COPY . .
COPY --from=builder /app/node_modules ./node_modules

# 创建必要目录并设置权限
RUN mkdir -p /app/data /app/public/screenshots && \
    chmod -R 755 /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
