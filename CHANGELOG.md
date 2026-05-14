# Changelog

所有重要的项目变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [Unreleased]

### 待发布功能
- 用户认证系统
- 深色主题支持
- 移动端适配

---

## [1.0.0] - 2026-05-14

### ✨ 新增功能
- 项目管理：新增/编辑/删除 Web 项目
- 多截图支持：每项目最多 4 张截图
- 三种截图方式：自动截图、手动截图、粘贴上传
- 双视图切换：网格视图 / 列表视图
- 分类管理：自定义分类标签
- 内嵌浏览：iframe 内嵌打开项目
- 拖拽导入：从地址栏拖拽 URL
- 富文本描述：Quill 编辑器支持
- 数据统计：项目总数和分类统计
- Docker 容器化部署支持

### 🐛 Bug 修复
- 修复截图超时导致的卡死问题
- 修复 hover 预览遮挡鼠标事件的问题
- 修复富文本内容在列表视图显示 HTML 标签的问题

### 🔧 优化改进
- Puppeteer 浏览器实例复用，提升性能
- 截图加载超时保护（15 秒）
- 悬浮层 pointer-events 穿透优化
- 列表视图纯文本提取，防止 XSS

### 📝 文档
- 完善 README 文档
- 添加 Docker 部署指南
- 添加 API 接口文档
- 添加贡献指南
- 添加项目路线图

---

## 版本说明

### 版本号格式：MAJOR.MINOR.PATCH

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的功能新增
- **PATCH**：向后兼容的问题修正

### 类型前缀

- `Added` - 新增功能
- `Changed` - 现有功能的变更
- `Deprecated` - 即将废弃的功能
- `Removed` - 已移除的功能
- `Fixed` - Bug 修复
- `Security` - 安全相关的修复或改进

---

[Unreleased]: https://github.com/your-username/web-hub/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-username/web-hub/releases/tag/v1.0.0