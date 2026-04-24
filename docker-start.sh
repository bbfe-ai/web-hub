#!/bin/bash

echo "========================================"
echo "  WebHub Docker 启动脚本"
echo "========================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "[错误] Docker 未安装"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "[1/3] 检查 Docker 服务状态..."
if ! docker info &> /dev/null; then
    echo "[错误] Docker 服务未运行，请启动 Docker"
    exit 1
fi
echo "[成功] Docker 服务正常运行"
echo ""

echo "[2/3] 构建 Docker 镜像..."
if ! docker-compose build; then
    echo "[错误] 镜像构建失败"
    exit 1
fi
echo "[成功] 镜像构建完成"
echo ""

echo "[3/3] 启动容器..."
if ! docker-compose up -d; then
    echo "[错误] 容器启动失败"
    exit 1
fi
echo "[成功] 容器启动成功"
echo ""

echo "========================================"
echo "  WebHub 已成功启动！"
echo "  访问地址: http://localhost:3000"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "========================================"
echo ""
