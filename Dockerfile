FROM node:20-alpine AS builder

WORKDIR /app

# 安装 better-sqlite3 编译所需的依赖
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# 设置国内镜像并安装生产环境依赖
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci --only=production

# 运行阶段
FROM node:20-alpine

WORKDIR /app

# 安装 Chromium + 中文字体，供 Puppeteer 截图使用
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

# 使用系统 Chromium，跳过 Puppeteer 自带下载
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 从 builder 阶段复制依赖和源码
COPY . .
COPY --from=builder /app/node_modules ./node_modules

# 创建必要目录并设置权限
RUN mkdir -p /app/data /app/config && \
    chmod -R 755 /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
