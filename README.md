# WebHub - 项目管理中心

> 轻量级 Web 项目统一管理平台，支持自动截图预览、分类管理、内嵌浏览。

[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18.0-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-success)](https://expressjs.com)

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [系统要求](#系统要求)
- [快速开始](#快速开始)
  - [Windows 启动](#windows-启动)
  - [Linux 启动](#linux-启动)
- [配置说明](#配置说明)
- [项目结构](#项目结构)
- [API 接口](#api-接口)
- [自动截图机制](#自动截图机制)
- [常见问题](#常见问题)
- [License](#license)

---

## 项目简介

WebHub 是一个简洁高效的 Web 项目管理中心，提供以下核心能力：

- **项目统一管理**：将分散的 Web 系统集中在一个平台管理
- **自动截图预览**：打开项目时自动 Capture 页面截图，卡片实时展示
- **分类与搜索**：支持自定义分类、关键词搜索
- **双视图切换**：网格视图 / 列表视图 自由切换
- **内嵌浏览**：点击项目后 iframe 内嵌打开，无需跳转

---

## 功能特性

| 功能 | 说明 |
|------|------|
| 📋 项目管理 | 新增 / 编辑 / 删除 Web 项目 |
| 📸 自动截图 | 打开项目时自动截图，1 小时内不重复 |
| 🔍 搜索过滤 | 按项目名称、URL、描述搜索 |
| 📂 分类管理 | 自定义分类，Tab 快速切换 |
| 🖼️ 双视图 | 网格视图 / 列表视图 |
| 🔗 内嵌浏览 | iframe 内嵌打开，支持新标签页打开 |
| 📊 数据统计 | 项目总数、分类统计 |
| 💾 SQLite | 轻量级数据库，零配置 |

---

## 系统要求

| 组件 | 版本要求 |
|------|----------|
| Node.js | ≥ 18.0 |
| npm | ≥ 9.0 |
| 磁盘空间 | ≥ 500MB (含 Puppeteer Chromium) |

> **注意**：首次安装 `npm install` 时 Puppeteer 会自动下载 Chromium (~170MB)，请确保网络通畅。

---

## 快速开始

### 1. 安装依赖

```bash
cd web-hub
npm install
```

### 2. 启动服务

#### Windows 启动

```bash
# 方式 1：使用脚本（推荐）
start.bat

# 方式 2：npm 命令
npm start
```

#### Linux 启动

```bash
# 方式 1：使用脚本（推荐）
chmod +x start.sh
./start.sh

# 方式 2：npm 命令
npm start

# 方式 3：后台运行
npm start &
```

### 3. 访问系统

打开浏览器访问：**http://localhost:3000**

### 4. 关闭服务

#### Windows 关闭

```bash
# 使用脚本（推荐）
stop.bat

# 或者查找并终止进程
taskkill /F /IM node.exe
```

#### Linux 关闭

```bash
# 使用脚本（推荐）
./stop.sh

# 或者查找并终止进程
pkill -f "node server.js"
# 或
kill $(lsof -ti:3000)
```

---

## 配置说明

所有配置通过环境变量设置，可在项目根目录创建 `.env` 文件：

```env
# 服务端口 (默认: 3000)
PORT=3000
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | HTTP 服务端口 | `3000` |

---

## 项目结构

```
web-hub/
├── data/                    # 数据库文件
│   └── webhub.db           # SQLite 数据库
├── public/                  # 静态资源
│   ├── css/
│   │   └── style.css       # 样式文件
│   ├── js/
│   │   └── app.js          # 前端逻辑
│   ├── screenshots/        # 自动截图存储目录
│   │   ├── project-1.png
│   │   └── project-2.png
│   └── index.html          # 主页面
├── scripts/                 # 启动/停止脚本
│   ├── start.bat           # Windows 启动脚本
│   ├── stop.bat            # Windows 停止脚本
│   ├── start.sh            # Linux 启动脚本
│   └── stop.sh             # Linux 停止脚本
├── node_modules/            # 依赖包
├── server.js               # Express 后端服务
├── package.json            # 项目配置
└── README.md               # 项目文档
```

---

## API 接口

### 项目管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/projects` | 获取项目列表 (支持 `?category=` & `?keyword=`) |
| `GET` | `/api/projects/:id` | 获取单个项目详情 |
| `POST` | `/api/projects` | 新增项目 |
| `PUT` | `/api/projects/:id` | 更新项目 |
| `DELETE` | `/api/projects/:id` | 删除项目 |
| `GET` | `/api/projects/:id/open` | 打开项目（自动截图） |
| `POST` | `/api/projects/:id/screenshot` | 手动触发截图 |

### 统计与分类

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/stats` | 获取统计数据 |
| `GET` | `/api/categories` | 获取所有分类 |

### 请求示例

#### 新增项目

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "内部管理系统",
    "url": "http://10.174.16.229:8088/",
    "description": "企业内部门户系统",
    "category": "内部系统"
  }'
```

#### 获取项目列表

```bash
# 获取全部
curl http://localhost:3000/api/projects

# 按分类筛选
curl "http://localhost:3000/api/projects?category=内部系统"

# 关键词搜索
curl "http://localhost:3000/api/projects?keyword=管理"
```

#### 手动触发截图

```bash
curl -X POST http://localhost:3000/api/projects/1/screenshot
```

---

## 自动截图机制

### 工作原理

```
用户点击"打开项目"
        ↓
检查截图是否存在
        ↓
   不存在 或 超过 1 小时
        ↓
Puppeteer 无头浏览器启动
        ↓
访问目标 URL，等待加载完成
        ↓
截图保存至 /public/screenshots/
        ↓
更新数据库 thumbnail 字段
        ↓
返回项目数据（含最新版截图）
```

### 截图策略

| 策略 | 说明 |
|------|------|
| **自动触发** | 首次打开项目时自动截图 |
| **缓存更新** | 截图超过 1 小时自动刷新 |
| **分辨率** | 1280 × 800 标准桌面尺寸 |
| **超时保护** | 15 秒加载超时自动跳过，不影响正常浏览 |
| **失败容错** | 截图失败不影响 iframe 内嵌打开 |

### 截图存储

- **路径**：`public/screenshots/project-{id}.png`
- **格式**：PNG
- **命名**：按项目 ID 唯一标识

---

## 常见问题

### Q1: Puppeteer 下载 Chromium 失败？

```bash
# 设置国内镜像
PUPPETEER_DOWNLOAD_BASE_URL=https://npmmirror.com/mirrors npm install

# 或使用淘宝源
npm config set PUPPETEER_DOWNLOAD_BASE_URL https://npmmirror.com/mirrors
npm install
```

### Q2: 截图显示空白页面？

目标页面加载慢或被反爬虫策略拦截，可尝试：
- 检查目标 URL 是否可访问
- 查看控制台日志中的截图错误信息
- 截图失败不影响 iframe 内嵌打开

### Q3: 如何修改端口？

```bash
# 方式 1：环境变量
PORT=8080 npm start

# 方式 2：修改 server.js 默认值
const PORT = process.env.PORT || 8080;
```

### Q4: 如何清理截图缓存？

```bash
# 删除所有截图
rm -f public/screenshots/*.png

# 重置数据库 thumbnail 字段
sqlite3 data/webhub.db "UPDATE projects SET thumbnail = '';"
```

### Q5: 内嵌页面无法显示？

部分网站设置 `X-Frame-Options: DENY` 阻止 iframe 嵌入，这是正常的安全限制。建议使用"新窗口打开"按钮。

---

## License

ISC

---

*最后更新：2026-04-10*
