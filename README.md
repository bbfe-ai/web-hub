# WebHub - 项目管理中心

> 轻量级 Web 项目统一管理平台，支持多截图预览、粘贴上传、拖拽导入、分类管理、内嵌浏览。

[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18.0-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-success)](https://expressjs.com)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue)](https://www.docker.com)

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [系统要求](#系统要求)
- [快速开始](#快速开始)
  - [方式一：Docker 部署（推荐）](#方式一docker-部署推荐)
  - [方式二：本地运行](#方式二本地运行)
- [配置说明](#配置说明)
- [项目结构](#项目结构)
- [API 接口](#api-接口)
- [截图机制](#截图机制)
- [常见问题](#常见问题)
- [License](#license)

---

## 项目简介

WebHub 是一个简洁高效的 Web 项目管理中心，将分散的内部系统、管理后台、开发工具等集中在一个平台统一管理。

### 核心能力

- **项目统一管理** — 新增、编辑、删除 Web 项目，支持名称/URL/用户名/密码/分类/描述
- **多截图预览** — 每个项目最多 4 张截图，自动截图 + 手动截图 + 粘贴上传
- **分类与搜索** — 自定义分类标签，关键词实时搜索
- **双视图切换** — 网格视图 / 列表视图自由切换
- **内嵌浏览** — iframe 内嵌打开项目，支持截图捕获
- **拖拽导入** — 从浏览器地址栏拖拽 URL 自动创建项目
- **粘贴上传** — 编辑面板中 Ctrl+V 粘贴截图，即时关联项目
- **富文本描述** — Quill 编辑器支持加粗、列表、代码块等格式

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 📋 项目管理 | 新增 / 编辑 / 删除 Web 项目，支持用户名密码存储 |
| 📸 多截图 | 每项目最多 4 张截图，自动/手动/粘贴三种方式 |
| 🖼️ 截图预览 | 卡片展示截图缩略图，hover 延迟 800ms 弹出大图 |
| 📋 粘贴上传 | 编辑面板中 Ctrl+V 粘贴剪贴板图片作为截图 |
| 🔗 拖拽导入 | 从浏览器地址栏拖拽 URL 到页面自动创建项目 |
| 🔍 搜索过滤 | 按项目名称、URL、描述搜索 |
| 📂 分类管理 | 自定义分类，侧边栏 Tab 快速切换 |
| 🖥️ 双视图 | 网格视图 / 列表视图 |
| 🌐 内嵌浏览 | iframe 内嵌打开，支持截图捕获和新窗口打开 |
| ✏️ 富文本 | Quill 编辑器，支持加粗/斜体/列表/代码块/颜色 |
| 📊 数据统计 | 项目总数、分类统计 |
| 💾 SQLite | better-sqlite3 轻量级数据库，零配置 |

---

## 系统要求

| 组件 | 版本要求 |
|------|----------|
| Node.js | ≥ 18.0 |
| npm | ≥ 9.0 |
| 磁盘空间 | ≥ 500MB (含 Puppeteer Chromium) |

> **注意**：首次 `npm install` 时 Puppeteer 会自动下载 Chromium (~170MB)，请确保网络通畅。

---

## 快速开始

### 方式一：Docker 部署（推荐）⭐

> **优势**：一键启动、环境隔离、自动重启、易于部署

#### 前置要求

- 已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)

#### 一键启动

**Windows 用户：**
```bash
docker-start.bat
```

**Linux/Mac 用户：**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

#### 手动管理

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问：**http://localhost:3000**

📖 详细文档：[DOCKER.md](DOCKER.md)

---

### 方式二：本地运行

#### 1. 安装依赖

```bash
cd web-hub
npm install
```

#### 2. 启动服务

```bash
# Windows
start.bat

# Linux
chmod +x start.sh && ./start.sh

# 或直接使用 npm
npm start
```

#### 3. 访问系统

打开浏览器访问：**http://localhost:3000**

#### 4. 关闭服务

```bash
# Windows
stop.bat

# Linux
./stop.sh

# 或手动终止
taskkill /F /IM node.exe   # Windows
pkill -f "node server.js"  # Linux
```

---

## 配置说明

所有配置通过环境变量设置，可在项目根目录创建 `.env` 文件：

```env
# 服务端口 (默认: 3000)
PORT=3000
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | HTTP 服务端口 | `3000` |

---

## 项目结构

```
web-hub/
├── data/                    # 运行时数据
│   ├── webhub.db           # SQLite 数据库
│   ├── screenshots/        # 截图文件存储
│   │   ├── project-1-*.png
│   │   └── project-2-*.png
│   └── logs/               # 截图日志
├── public/                  # 静态资源
│   ├── css/
│   │   └── style.css       # 样式文件（亮色主题）
│   ├── js/
│   │   └── app.js          # 前端逻辑
│   ├── thumbnails/          # 缩略图缓存
│   └── index.html          # 主页面
├── scripts/                 # 启动/停止脚本
│   ├── start.bat / start.sh
│   └── stop.bat / stop.sh
├── server.js               # Express 后端服务
├── cleanup.js              # 截图清理工具
├── package.json
└── README.md
```

---

## API 接口

### 项目管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/projects` | 获取项目列表（支持 `?category=` & `?keyword=`） |
| `GET` | `/api/projects/:id` | 获取单个项目详情 |
| `POST` | `/api/projects` | 新增项目 |
| `PUT` | `/api/projects/:id` | 更新项目 |
| `DELETE` | `/api/projects/:id` | 删除项目（同时删除关联截图） |
| `GET` | `/api/projects/:id/open` | 打开项目（无截图时自动触发截图） |

### 截图管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/projects/:id/screenshots` | 获取项目所有截图 |
| `POST` | `/api/projects/:id/screenshot` | 手动触发 Puppeteer 截图 |
| `POST` | `/api/projects/:id/screenshot-upload` | 上传粘贴的图片作为截图（multipart/form-data） |
| `DELETE` | `/api/projects/:id/screenshot/:screenshotId` | 删除指定截图 |

### 统计与分类

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/stats` | 获取统计数据（总数、分类统计） |
| `GET` | `/api/categories` | 获取所有分类 |

### 请求示例

#### 新增项目

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "内部管理系统",
    "url": "http://10.174.16.229:8088/",
    "username": "admin",
    "password": "123456",
    "description": "企业内部门户系统",
    "category": "内部系统"
  }'
```

#### 粘贴上传截图

```bash
curl -X POST http://localhost:3000/api/projects/1/screenshot-upload \
  -F "screenshot=@clipboard-image.png"
```

#### 手动触发截图

```bash
curl -X POST http://localhost:3000/api/projects/1/screenshot
```

---

## 截图机制

### 三种截图方式

| 方式 | 触发条件 | 说明 |
|------|----------|------|
| **自动截图** | 首次打开项目（无截图时） | Puppeteer 无头浏览器访问 URL 并截图 |
| **手动截图** | 点击"截图"按钮 | 在 iframe 内嵌浏览时手动触发 |
| **粘贴上传** | 编辑面板中 Ctrl+V | 从剪贴板粘贴图片直接上传 |

### 截图策略

- **数量限制**：每个项目最多 4 张截图
- **分辨率**：1280 × 800 标准桌面尺寸
- **加载策略**：`networkidle0` + 2 秒等待，确保页面完全渲染
- **超时保护**：15 秒加载超时自动跳过
- **浏览器池**：复用 Puppeteer 实例，避免重复启动
- **首张为主图**：第一张截图自动设为卡片缩略图

### 截图存储

- **路径**：`data/screenshots/project-{id}-{timestamp}.png`
- **格式**：PNG
- **访问**：`/screenshots/{filename}`

---

## 常见问题

### Q1: Puppeteer 下载 Chromium 失败？

```bash
# 设置国内镜像
PUPPETEER_DOWNLOAD_BASE_URL=https://npmmirror.com/mirrors npm install
```

### Q2: 截图显示空白/黑色？

- 检查目标 URL 是否可访问
- 部分页面需要较长加载时间，已内置 2 秒等待
- 查看控制台日志中的截图错误信息

### Q3: 如何修改端口？

```bash
PORT=8080 npm start
```

### Q4: 内嵌页面无法显示？

部分网站设置 `X-Frame-Options` 或 `CSP frame-ancestors` 阻止 iframe 嵌入，这是浏览器安全限制。建议使用"新窗口"按钮直接打开。

### Q5: 拖拽标签页没有反应？

Chrome 标签栏拖拽不暴露 URL 数据（浏览器安全限制）。替代方式：
- 从浏览器**地址栏**选中 URL 后拖拽（推荐）
- 从**书签栏**拖拽书签
- 手动复制 URL 后在新增面板粘贴

### Q6: 如何清理截图？

```bash
# 删除所有截图文件
rm -f data/screenshots/*.png

# 重置数据库
sqlite3 data/webhub.db "DELETE FROM project_screenshots;"
sqlite3 data/webhub.db "UPDATE projects SET thumbnail = '';"
```

---

## License

ISC

---

*最后更新：2026-04-17*
