#!/bin/bash
#
# WebHub - Linux 停止脚本
# 用法: ./stop.sh [端口]
# 示例: ./stop.sh        # 停止默认端口 3000 的服务
#       ./stop.sh 8080    # 停止端口 8080 的服务
#

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
echo "  WebHub - 停止服务"
echo "========================================"
echo ""

cd "$PROJECT_DIR"

STOPPED=0

# 方式 1: 通过 PID 文件停止
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${GREEN}[停止中] 正在停止进程 $PID...${NC}"
        kill "$PID" 2>/dev/null
        
        # 等待进程退出
        for i in {1..10}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                echo -e "${GREEN}✅ 服务已停止 (PID: $PID)${NC}"
                STOPPED=1
                break
            fi
            sleep 1
        done
        
        # 如果还没停止，强制终止
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${YELLOW}[警告] 进程未响应，强制终止...${NC}"
            kill -9 "$PID" 2>/dev/null
            sleep 1
            if ! kill -0 "$PID" 2>/dev/null; then
                echo -e "${GREEN}✅ 服务已强制停止 (PID: $PID)${NC}"
                STOPPED=1
            fi
        fi
    else
        echo -e "${YELLOW}[提示] PID $PID 的进程不存在${NC}"
    fi
    rm -f "$PID_FILE"
fi

# 方式 2: 如果方式 1 未成功，通过端口查找
if [ $STOPPED -eq 0 ]; then
    echo -e "${YELLOW}[查找] 通过端口 $PORT 查找服务...${NC}"
    
    if command -v lsof &> /dev/null; then
        PID=$(lsof -ti:$PORT 2>/dev/null)
    elif command -v ss &> /dev/null; then
        PID=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1)
    else
        PID=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1)
    fi
    
    if [ -n "$PID" ]; then
        PROCESS=$(ps -p "$PID" -o comm= 2>/dev/null)
        echo -e "${GREEN}[发现] 端口 $PORT 被 $PROCESS (PID: $PID) 占用${NC}"
        echo ""
        
        read -p "是否停止此进程？(y/N): " choice
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            kill "$PID" 2>/dev/null
            sleep 2
            
            if kill -0 "$PID" 2>/dev/null; then
                kill -9 "$PID" 2>/dev/null
            fi
            
            echo -e "${GREEN}✅ 服务已停止 (PID: $PID)${NC}"
            STOPPED=1
        else
            echo -e "${YELLOW}[取消] 已取消操作${NC}"
        fi
    else
        echo -e "${YELLOW}[提示] 端口 $PORT 没有服务运行${NC}"
    fi
fi

echo ""
if [ $STOPPED -eq 1 ]; then
    echo "========================================"
    echo -e "  ${GREEN}✅ 服务已停止${NC}"
    echo "========================================"
else
    echo "========================================"
    echo -e "  ${YELLOW}ℹ️  未找到运行中的服务${NC}"
    echo "========================================"
fi
echo ""
