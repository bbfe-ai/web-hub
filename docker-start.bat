@echo off
chcp 65001 >nul
echo ========================================
echo   WebHub Docker 启动脚本
echo ========================================
echo.

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未安装或未添加到系统路径
    echo 请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [1/3] 检查 Docker 服务状态...
docker info >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 服务未运行，请启动 Docker Desktop
    pause
    exit /b 1
)
echo [成功] Docker 服务正常运行
echo.

echo [2/3] 构建 Docker 镜像...
docker-compose build
if errorlevel 1 (
    echo [错误] 镜像构建失败
    pause
    exit /b 1
)
echo [成功] 镜像构建完成
echo.

echo [3/3] 启动容器...
docker-compose up -d
if errorlevel 1 (
    echo [错误] 容器启动失败
    pause
    exit /b 1
)
echo [成功] 容器启动成功
echo.

echo ========================================
echo   WebHub 已成功启动！
echo   访问地址: http://localhost:3000
echo   查看日志: docker-compose logs -f
echo   停止服务: docker-compose down
echo ========================================
echo.
pause
