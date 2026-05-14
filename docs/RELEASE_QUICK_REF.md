# 版本发布快速参考

## 🚀 三步发布新版本

### 1️⃣ 更新版本信息

```bash
# 编辑 package.json，更新 version 字段
# 编辑 CHANGELOG.md，添加新版本说明
```

### 2️⃣ 提交并打标签

```bash
git add CHANGELOG.md package.json
git commit -m "chore: release v1.1.0"
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin main
git push origin v1.1.0  # ⭐ 这一步触发自动发布
```

### 3️⃣ 等待自动化完成

GitHub Actions 会自动：
- ✅ 运行测试
- ✅ 构建 Docker 镜像
- ✅ 推送 Docker Hub（带版本标签）
- ✅ 创建 GitHub Release

---

## 📋 版本号规则

```
v主版本.次版本.修订版本

示例：
v1.0.0  → 首次发布
v1.1.0  → 新增功能（向后兼容）
v1.1.1  → Bug 修复
v2.0.0  → 重大突破
```

---

## 🔍 检查发布状态

### GitHub Actions
访问：https://github.com/your-username/web-hub/actions

### GitHub Releases
访问：https://github.com/your-username/web-hub/releases

### Docker Hub
访问：https://hub.docker.com/r/your-username/webhub/tags

---

## ⚠️ 注意事项

- 标签必须以 `v` 开头（如 `v1.1.0`）
- 确保所有测试通过后再推送标签
- 推送标签后无法修改，只能发布新版本
- Docker Hub 账号密码需配置在 GitHub Secrets 中

---

## 📖 详细文档

查看完整版：[docs/RELEASE_GUIDE.md](RELEASE_GUIDE.md)

---

*快速参考 | 最后更新：2026-05-14*