# 贡献指南

感谢你对 WebHub 项目的关注！我们欢迎各种形式的贡献，包括代码、文档、问题报告和功能建议。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [提交 Issue](#提交-issue)
- [提交 Pull Request](#提交-pull-request)
- [开发环境搭建](#开发环境搭建)
- [代码规范](#代码规范)
- [Commit 规范](#commit-规范)
- [测试](#测试)
- [文档贡献](#文档贡献)
- [相关资源](#相关资源)

---

## 行为准则

本项目采用 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。我们希望所有参与者都能尊重他人，营造友好、包容的社区环境。

### 我们的承诺

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

---

## 如何贡献

### 1. 报告 Bug

如果你发现了 Bug，请：

1. **搜索现有 Issues**：确认该问题尚未被报告
2. **创建新 Issue**：使用 Bug Report 模板
3. **提供详细信息**：
   - 环境信息（Node.js 版本、操作系统、浏览器）
   - 复现步骤
   - 预期行为 vs 实际行为
   - 错误日志或截图

### 2. 提出新功能

如果你有新功能想法：

1. **先创建 Feature Request Issue**：讨论功能的必要性和实现方案
2. **等待维护者反馈**：确认功能符合项目方向
3. **开始开发**：获得认可后再编写代码

### 3. 改进文档

文档永远需要改进！你可以：

- 修正拼写错误或语法问题
- 补充不清晰的说明
- 添加示例代码或使用场景
- 翻译文档到其他语言

### 4. 代码贡献

- 修复已报告的 Bug
- 实现已批准的新功能
- 优化性能或重构代码
- 添加单元测试

---

## 提交 Issue

### Bug 报告模板

```
**描述问题**
清晰简洁地描述 bug 是什么。

**复现步骤**
1. ...
2. ...
3. ...

**预期行为**
期望发生什么。

**实际行为**
实际发生了什么。

**环境信息**
- Node.js 版本: 
- 操作系统: 
- 浏览器: 
- WebHub 版本: 

**错误日志**
```
粘贴相关错误日志
```

**截图**
如果适用，添加截图帮助说明。

**其他信息**
任何额外的上下文信息。
```

### 功能请求模板

```
**功能描述**
清晰简洁地描述你想要的功能。

**使用场景**
这个功能能解决什么问题？在什么场景下使用？

**解决方案**
如果你已经有实现思路，可以描述一下。

**替代方案**
你考虑过哪些替代方案？

**其他信息**
任何额外的上下文或截图。
```

---

## 提交 Pull Request

### 工作流程

1. **Fork 本仓库**
   - 点击 GitHub 页面右上角的 "Fork" 按钮

2. **克隆到本地**
   ```bash
   git clone https://github.com/your-username/web-hub.git
   cd web-hub
   ```

3. **添加上游远程仓库**
   ```bash
   git remote add upstream https://github.com/original-owner/web-hub.git
   ```

4. **创建特性分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/issue-description
   ```

5. **进行开发**
   - 编写代码
   - 添加测试（如适用）
   - 更新文档

6. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

7. **同步主分支**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

8. **推送到你的 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

9. **创建 Pull Request**
   - 访问你的 Fork 仓库
   - 点击 "Compare & pull request"
   - 填写 PR 描述
   - 关联相关 Issue（使用 `Closes #123` 语法）

### PR 检查清单

提交 PR 前，请确认：

- [ ] 代码遵循项目规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] Commit 消息符合规范
- [ ] PR 描述清晰完整
- [ ] 已通过本地测试

### PR 审核流程

1. **自动化检查**：CI 会自动运行测试和代码检查
2. **代码审查**：至少一名维护者会审查代码
3. **反馈修改**：根据审查意见进行修改
4. **合并**：审查通过后合并到主分支

---

## 开发环境搭建

### 前置要求

- Node.js ≥ 18.0
- npm ≥ 9.0
- Git

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/web-hub.git
cd web-hub

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问应用
# http://localhost:3000
```

### 调试技巧

- **后端日志**：查看终端输出
- **前端调试**：打开浏览器开发者工具 (F12)
- **数据库查看**：使用 [DB Browser for SQLite](https://sqlitebrowser.org/)
- **截图日志**：查看 `data/logs/` 目录

---

## 代码规范

### JavaScript 规范

- **使用 ES6+ 语法**
  ```javascript
  // ✅ 推荐
  const name = 'WebHub';
  const greet = () => `Hello, ${name}!`;
  
  // ❌ 避免
  var name = 'WebHub';
  function greet() { return 'Hello, ' + name + '!'; }
  ```

- **命名规范**
  ```javascript
  // 变量/函数：camelCase
  const userName = 'admin';
  function getUserInfo() { }
  
  // 类名：PascalCase
  class ProjectManager { }
  
  // 常量：UPPER_SNAKE_CASE
  const MAX_SCREENSHOTS = 4;
  
  // 私有方法：前缀下划线
  function _internalHelper() { }
  ```

- **代码格式**
  - 使用 2 空格缩进
  - 语句末尾加分号
  - 对象属性引号：仅在必要时使用
  ```javascript
  // ✅ 推荐
  const config = {
    port: 3000,
    host: 'localhost'
  };
  
  // 键名包含特殊字符时需要引号
  const data = {
    'user-name': 'admin'
  };
  ```

### CSS 规范

- **选择器命名**：使用 kebab-case
  ```css
  .project-card { }
  .screenshot-preview { }
  ```

- **属性顺序**：布局 → 盒模型 → 视觉 → 其他
  ```css
  .card {
    /* 布局 */
    display: flex;
    position: relative;
    
    /* 盒模型 */
    width: 100%;
    padding: 16px;
    margin: 8px;
    
    /* 视觉 */
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    
    /* 其他 */
    cursor: pointer;
    transition: all 0.3s ease;
  }
  ```

### HTML 规范

- 使用语义化标签
- 属性使用双引号
- 嵌套缩进 2 空格

```
<!-- ✅ 推荐 -->
<article class="project-card">
  <header>
    <h2>项目名称</h2>
  </header>
  <div class="card-body">
    <p>项目描述</p>
  </div>
</article>
```

---

## Commit 规范

我们采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

### 示例

```
# 新功能
git commit -m "feat: add screenshot paste upload feature"

# 修复 bug
git commit -m "fix: prevent hover preview from blocking mouse events"

# 文档更新
git commit -m "docs: update API documentation with examples"

# 性能优化
git commit -m "perf: optimize puppeteer browser instance reuse"

# 重构
git commit -m "refactor: extract screenshot logic to separate module"

# 带 scope
git commit -m "feat(api): add batch delete endpoint"

# 带 body 和 footer
git commit -m "fix: resolve screenshot timeout issue

Add 15 second timeout protection for puppeteer page loading.
This prevents the server from hanging when a page fails to load.

Closes #123"
```

### 使用 Commitizen（可选）

```
# 安装
npm install -g commitizen cz-conventional-changelog

# 初始化
commitizen init cz-conventional-changelog --save-dev --save-exact

# 使用
git cz
```

---

## 测试

### 运行测试

```
# 运行所有测试
npm test

# 运行单个测试文件
npm test -- tests/screenshot.test.js

# 生成覆盖率报告
npm run test:coverage
```

### 编写测试

我们使用 Jest 作为测试框架。

```
// tests/project.test.js
const request = require('supertest');
const app = require('../server');

describe('Project API', () => {
  describe('GET /api/projects', () => {
    it('should return all projects', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
  
  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const newProject = {
        name: 'Test Project',
        url: 'http://example.com'
      };
      
      const res = await request(app)
        .post('/api/projects')
        .send(newProject);
      
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe(newProject.name);
    });
  });
});
```

### 测试覆盖目标

- 核心 API 接口：100% 覆盖
- 工具函数：80% 以上覆盖
- 总体覆盖率：70% 以上

---

## 文档贡献

### README 改进

- 修正错误或过时的信息
- 添加更多示例和截图
- 改进语言表达和结构

### API 文档

确保 API 文档与实际实现保持一致：

- 请求方法和路径
- 请求参数和示例
- 响应格式和状态码
- 错误处理

### 代码注释

- 复杂逻辑必须添加注释
- 公共 API 使用 JSDoc 格式
- 注释应解释"为什么"而非"是什么"

```
/**
 * 获取项目列表，支持分类和关键词过滤
 * @param {Object} req - Express 请求对象
 * @param {string} [req.query.category] - 分类过滤
 * @param {string} [req.query.keyword] - 关键词搜索
 * @returns {Array} 项目列表
 */
function getProjects(req, res) {
  // 实现...
}
```

---

## 成为维护者

如果你满足以下条件，可以申请成为项目维护者：

- 持续贡献代码或文档
- 积极参与 Issue 和 PR 讨论
- 帮助解答社区问题
- 认同项目愿景和价值观

请联系当前维护者了解详情。

---

## 联系方式

- **Issues**: [GitHub Issues](https://github.com/your-username/web-hub/issues)
- **Email**: your-email@example.com
- **Discussions**: [GitHub Discussions](https://github.com/your-username/web-hub/discussions)

---

## 相关资源

- 📘 **[README.md](../README.md)** - 项目主文档，包含功能介绍、快速开始和 API 文档
- 🗺️ **[ROADMAP.md](ROADMAP.md)** - 了解项目未来发展方向和计划
- ✅ **[OPEN_SOURCE_CHECKLIST.md](OPEN_SOURCE_CHECKLIST.md)** - 开源项目完整检查清单
- 🐳 **[DOCKER.md](DOCKER.md)** - Docker 部署详细指南
- 📋 **[DOCKER_QUICK_REFERENCE.md](DOCKER_QUICK_REFERENCE.md)** - Docker 常用命令速查

---

## 致谢

感谢所有为 WebHub 做出贡献的开发者！

<a href="https://github.com/your-username/web-hub/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=your-username/web-hub" />
</a>

---

*本贡献指南参考了多个优秀开源项目的实践，感谢他们的启发。*