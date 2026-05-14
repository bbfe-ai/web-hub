# WebHub Docker 部署指南

## 📦 快速开始

### 前置要求

- 已安装 [Docker](https://www.docker.com/products/docker-desktop)
- 已安装 [Docker Compose](https://docs.docker.com/compose/)（Docker Desktop 已内置）

### 一键启动

#### Windows 用户
双击运行 `docker-start.bat` 或在命令行执行：
```bash
docker-start.bat
```

#### Linux/Mac 用户
```bash
chmod +x docker-start.sh
./docker-start.sh
```

### 手动启动

```bash
# 构建镜像
docker-compose build

# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 🏗️ 架构说明

```
┌─────────────────────────────────────────────┐
│           宿主机 (Host Machine)              │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │     Docker Container (webhub)        │   │
│  │                                      │   │
│  │  /app                                │   │
│  │  ├── server.js          ← 应用入口   │   │
│  │  ├── public/            ← 静态资源   │   │
│  │  │   ├── index.html                 │   │
│  │  │   ├── css/                       │   │
│  │  │   ├── js/                        │   │
│  │  │   └── screenshots/   ← 截图文件  │   │
│  │  ├── data/              ← 数据库    │   │
│  │  │   └── webhub.db                  │   │
│  │  └── node_modules/      ← 依赖包    │   │
│  │                                      │   │
│  │  端口: 3000                          │   │
│  │  健康检查: 每30秒                     │   │
│  └──────────────────────────────────────┘   │
│           ↕ Volume Mounts                    │
│  ┌──────────────────────────────────────┐   │
│  │   ./data/                ← 持久化DB  │   │
│  │   ./public/screenshots/  ← 持久化截图│   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
           ↕ Port Mapping
    http://localhost:3000
```

## 🌐 访问应用

启动成功后，在浏览器中访问：
```
http://localhost:3000
```

## 🔧 常用命令

### 查看容器状态
```bash
docker-compose ps
```

### 查看实时日志
```bash
docker-compose logs -f
```

### 停止服务
```bash
docker-compose down
```

### 重启服务
```bash
docker-compose restart
```

### 重新构建并启动
```bash
docker-compose up -d --build
```

### 进入容器内部
```bash
docker exec -it webhub sh
```

### 查看资源使用情况
```bash
docker stats webhub
```

## 📁 数据持久化

以下目录已配置为卷挂载，数据会持久化保存在宿主机：

- `./data/` - SQLite 数据库文件
- `./public/screenshots/` - 项目截图文件

**注意**：首次启动时会自动创建这些目录。

## ⚙️ 环境变量配置

可以通过以下方式修改配置：

### 方法 1：修改 docker-compose.yml
在 `environment` 部分添加或修改：
```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
```

### 方法 2：使用 .env 文件
在项目根目录创建 `.env` 文件：
```env
PORT=3000
NODE_ENV=production
```

## 🐛 故障排查

### 1. 端口被占用
如果 3000 端口已被占用，修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8080:3000"  # 将宿主机的 8080 映射到容器的 3000
```

### 2. 容器启动失败
查看错误日志：
```bash
docker-compose logs webhub
```

### 3. 截图功能异常
确保容器有足够的内存（建议至少 1GB）：
```bash
docker stats webhub
```

### 4. 权限问题
如果遇到权限问题，修复目录权限：
```bash
# Linux/Mac
sudo chown -R $USER:$USER ./data ./public/screenshots

# Windows（以管理员身份运行）
icacls data /grant Users:F /T
icacls public\screenshots /grant Users:F /T
```

### 5. 清理并重新开始
```bash
# 停止并删除容器
docker-compose down

# 清理未使用的镜像
docker image prune -f

# 重新构建和启动
docker-compose up -d --build
```

## 🚀 生产环境部署

### 使用固定版本标签
```bash
# 构建时添加版本标签
docker build -t webhub:v1.0.0 .

# 运行时指定版本
docker run -d --name webhub -p 3000:3000 webhub:v1.0.0
```

### 启用自动重启
已在 `docker-compose.yml` 中配置 `restart: unless-stopped`，容器会在以下情况自动重启：
- 容器异常退出
- Docker 服务重启
- 系统重启

### 资源限制
已在 `docker-compose.yml` 中配置资源限制：
- 内存：1GB
- CPU：1核

根据服务器配置调整这些值。

### 反向代理（可选）
如果使用 Nginx 反向代理：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 监控和维护

### 健康检查
容器配置了健康检查，每 30 秒检测一次服务状态：
```bash
docker inspect --format='{{.State.Health.Status}}' webhub
```

### 备份数据
```bash
# 备份数据库
cp data/webhub.db data/webhub.db.backup.$(date +%Y%m%d)

# 备份截图
tar -czf screenshots.backup.$(date +%Y%m%d).tar.gz public/screenshots/
```

### 更新应用
```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## 📝 技术说明

- **基础镜像**: Node.js 18 Alpine（体积小，安全性高）
- **浏览器**: Chromium（通过系统包安装，无需 Puppeteer 下载）
- **数据库**: SQLite（文件型数据库，无需额外服务）
- **端口**: 3000（可配置）
- **工作目录**: /app

## 💡 提示

1. 首次构建可能需要几分钟时间（取决于网络速度）
2. 建议定期备份 `data/` 目录中的数据库文件
3. 截图文件会逐渐增多，注意磁盘空间
4. 可以通过 `docker-compose logs -f` 实时查看应用日志
