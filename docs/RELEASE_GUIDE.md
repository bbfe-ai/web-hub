# 版本发布指南

本文档说明如何为 WebHub 项目创建和发布新版本。

## 📋 版本命名规范

WebHub 遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：`MAJOR.MINOR.PATCH`

- **MAJOR** (主版本号)：不兼容的 API 变更
- **MINOR** (次版本号)：向后兼容的功能新增
- **PATCH** (修订号)：向后兼容的问题修正

### 示例

- `v1.0.0` - 首个稳定版本
- `v1.1.0` - 新增功能（向后兼容）
- `v1.1.1` - Bug 修复
- `v2.0.0` - 重大突破或不兼容变更

---

## 🚀 发布流程

### 步骤 1：更新 CHANGELOG.md

在发布前，确保 [CHANGELOG.md](CHANGELOG.md) 已更新：

```markdown
## [1.1.0] - 2026-05-20

### Added
- 用户认证系统
- 深色主题支持

### Fixed
- 修复截图上传失败的问题
```

### 步骤 2：更新 package.json 版本号

编辑 `package.json`：

```json
{
  "name": "web-hub",
  "version": "1.1.0",  // 更新版本号
  ...
}
```

### 步骤 3：提交更改

```bash
git add CHANGELOG.md package.json
git commit -m "chore: release v1.1.0"
```

### 步骤 4：创建 Git Tag

```bash
# 创建标签
git tag -a v1.1.0 -m "Release version 1.1.0"

# 推送标签到远程仓库
git push origin v1.1.0
```

### 步骤 5：自动发布 🎉

推送到远程后，GitHub Actions 会自动：

1. ✅ 运行所有测试
2. ✅ 构建 Docker 镜像
3. ✅ 推送 Docker 镜像（带版本标签）
4. ✅ 创建 GitHub Release
5. ✅ 附加 CHANGELOG.md 作为发布说明

---

## 🤖 自动化说明

### 触发条件

当推送以 `v` 开头的标签时，自动触发发布流程：

```bash
git push origin v1.1.0  # ✅ 触发自动发布
git push origin main     # ❌ 仅运行测试和构建 latest 镜像
```

### 自动执行的任务

#### 1. 测试阶段
- Node.js 18.x 和 20.x 兼容性测试
- Docker 镜像构建测试
- 容器运行测试

#### 2. Docker 推送
推送以下标签到 Docker Hub：
- `webhub:latest` - 最新版本
- `webhub:<commit-sha>` - 特定提交版本
- `webhub:1.1.0` - 语义化版本标签（仅 tag 推送时）

#### 3. GitHub Release
自动创建 Release，包含：
- 版本号标签
- 从 CHANGELOG.md 提取的发布说明
- 附加文件（LICENSE 等）

---

## 📝 最佳实践

### 1. 发布前检查清单

- [ ] 所有测试通过
- [ ] CHANGELOG.md 已更新
- [ ] package.json 版本号已更新
- [ ] 文档已同步更新
- [ ] 无未提交的代码
- [ ] 已在本地测试过主要功能

### 2. Commit 消息规范

使用约定式提交（Conventional Commits）：

```bash
feat: add user authentication system
fix: resolve screenshot upload timeout
docs: update API documentation
chore: release v1.1.0
```

### 3. 预发布版本

对于测试版本，使用后缀：

```bash
# Alpha 版本
git tag -a v1.2.0-alpha.1 -m "Pre-release alpha 1"

# Beta 版本
git tag -a v1.2.0-beta.1 -m "Pre-release beta 1"

# RC 版本
git tag -a v1.2.0-rc.1 -m "Release candidate 1"
```

在 CI 配置中标记为预发布：

```yaml
- name: Create GitHub Release
  uses: softprops/action-gh-release@v1
  with:
    prerelease: true  # 标记为预发布
```

### 4. 回滚版本

如果发布后发现严重问题：

```bash
# 1. 删除远程标签
git push --delete origin v1.1.0

# 2. 删除本地标签
git tag -d v1.1.0

# 3. 修复问题后重新发布
git tag -a v1.1.1 -m "Release version 1.1.1 (hotfix)"
git push origin v1.1.1
```

---

## 🔧 手动发布（可选）

如果不想使用自动化，可以手动创建 Release：

### 方法 1：GitHub Web 界面

1. 访问：https://github.com/your-username/web-hub/releases
2. 点击 "Draft a new release"
3. 选择或创建标签
4. 填写发布标题和说明
5. 点击 "Publish release"

### 方法 2：GitHub CLI

```bash
# 安装 GitHub CLI
brew install gh  # macOS
# 或
winget install GitHub.cli  # Windows

# 创建 Release
gh release create v1.1.0 \
  --title "Release v1.1.0" \
  --notes-file CHANGELOG.md \
  --target main
```

---

## 📊 版本历史

| 版本 | 发布日期 | 类型 | 说明 |
|------|---------|------|------|
| v1.0.0 | 2026-05-14 | Major | 首次正式发布 |
| - | - | - | 等待下一个版本... |

---

## ❓ 常见问题

### Q1: 为什么我的 Release 没有自动创建？

检查以下几点：
1. 标签格式是否正确（必须以 `v` 开头）
2. 是否推送到远程仓库
3. GitHub Actions 是否正常运行
4. 查看 Actions 日志排查错误

### Q2: 如何修改自动发布的配置？

编辑 `.github/workflows/ci.yml` 文件中的 `release` job。

### Q3: Docker 镜像在哪里查看？

访问 Docker Hub：https://hub.docker.com/r/your-username/webhub

### Q4: 可以自定义 Release 说明吗？

可以！修改 `CHANGELOG.md` 或在创建 tag 时使用 `-m` 参数添加说明。

---

## 📞 需要帮助？

如有任何问题，请：
- 查看 [GitHub Actions 文档](https://docs.github.com/en/actions)
- 阅读 [语义化版本规范](https://semver.org/)
- 提交 Issue 寻求帮助

---

*最后更新：2026-05-14*