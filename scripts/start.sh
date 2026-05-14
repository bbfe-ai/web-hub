#!/bin/bash
#
# WebHub - Linux 启动脚本
# 用法: ./start.sh [端口]
# 示例: ./start.sh        # 使用默认端口 3000
#       ./start.sh 8080    # 使用端口 8080
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEFAULT_PORT=3000
PORT=${1:-$DEFAULT_PORT}
PID_FILE="$PROJECT_DIR/.webhub.pid"

echo ""
echo "========================================"
echo "  WebHub - 项目管理中心"
echo "========================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[错误] 未检测到 Node.js，请先安装 Node.js (>= 18.0)${NC}"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}[错误] Node.js 版本过低 (当前: $(node -v)), 需要 >= 18.0${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[提示] 首次运行，正在安装依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[错误] 依赖安装失败${NC}"
        exit 1
    fi
    echo ""
fi

# 检查端口占用
if command -v lsof &> /dev/null; then
    EXISTING_PID=$(lsof -ti:$PORT 2>/dev/null)
elif command -v ss &> /dev/null; then
    EXISTING_PID=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1)
else
    EXISTING_PID=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1)
fi

if [ -n "$EXISTING_PID" ]; then
    echo -e "${YELLOW}[警告] 端口 $PORT 已被进程 $EXISTING_PID 占用${NC}"
    echo ""
    read -p "是否强制关闭旧进程并重启？(y/N): " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then
        kill -9 "$EXISTING_PID" 2>/dev/null
        echo -e "${GREEN}已终止进程 $EXISTING_PID${NC}"
        sleep 2
    else
        echo -e "${YELLOW}[提示] 请手动关闭占用端口 $PORT 的进程${NC}"
        exit 1
    fi
fi

# 检查是否已有服务在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo -e "${YELLOW}[警告] 检测到运行中的服务 (PID: $OLD_PID)${NC}"
        read -p "是否先停止旧服务？(y/N): " choice
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            kill "$OLD_PID" 2>/dev/null
            sleep 2
            # 如果还在运行，强制终止
            if kill -0 "$OLD_PID" 2>/dev/null; then
                kill -9 "$OLD_PID" 2>/dev/null
            fi
            echo -e "${GREEN}旧服务已停止${NC}"
        fi
    fi
    rm -f "$PID_FILE"
fi

echo -e "${GREEN}[启动中] 正在启动 WebHub 服务...${NC}"
echo ""

# 启动服务（后台运行）
PORT="$PORT" nohup node server.js > webhub.log 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

# 等待服务启动
sleep 3

# 检查服务状态
if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "========================================"
    echo -e "  ${GREEN}✅ WebHub 已成功启动${NC}"
    echo -e "  访问地址: ${BLUE}http://localhost:$PORT${NC}"
    echo -e "  进程 PID: $SERVER_PID"
    echo -e "  日志文件: webhub.log"
    echo "========================================"
    echo ""
    
    # 检查 log 中是否有错误
    if grep -q "Error" webhub.log 2>/dev/null; then
        echo -e "${RED}[警告] 启动日志中发现错误信息:${NC}"
        grep "Error" webhub.log
        echo ""
    fi
else
    echo -e "${RED}[错误] 服务启动失败，请查看日志:${NC}"
    cat webhub.log
    rm -f "$PID_FILE"
    exit 1
fi

echo -e "${YELLOW}[提示] 使用 ./stop.sh 停止服务${NC}"
echo -e "${YELLOW}[提示] 查看日志: tail -f webhub.log${NC}"
echo ""
