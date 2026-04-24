# WebHub Docker 快速参考

## 🚀 一键启动

```bash
# Windows
docker-start.bat

# Linux/Mac
./docker-start.sh
```

## 📋 常用命令速查

| 操作 | 命令 |
|------|------|
| **启动服务** | `docker-compose up -d` |
| **停止服务** | `docker-compose down` |
| **重启服务** | `docker-compose restart` |
| **查看日志** | `docker-compose logs -f` |
| **查看状态** | `docker-compose ps` |
| **重新构建** | `docker-compose up -d --build` |
| **进入容器** | `docker exec -it webhub sh` |
| **查看资源** | `docker stats webhub` |

## 🔍 故障排查

```bash
# 查看错误日志
docker-compose logs webhub

# 检查健康状态
docker inspect --format='{{.State.Health.Status}}' webhub

# 清理并重新开始
docker-compose down
docker-compose up -d --build
```

## 📁 数据位置

- **数据库**: `./data/webhub.db`
- **截图文件**: `./public/screenshots/`

## 🌐 访问地址

```
http://localhost:3000
```

## ⚙️ 修改端口

编辑 `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # 宿主机端口:容器端口
```

---

📖 详细文档：[DOCKER.md](DOCKER.md)
