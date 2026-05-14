# 文档结构重组说明

## 📋 变更概述

为了改善项目文档的组织结构，我们已将除 `README.md` 外的所有 Markdown 文档和 `images` 文件夹移动到 `docs/` 目录下。

## 📁 新的目录结构

```
web-hub/
├── README.md                    # 主文档（保留在根目录）
├── docs/                        # 文档目录（新建）
│   ├── images/                  # 图片资源（从根目录移动）
│   │   ├── main.png
│   │   ├── details.png
│   │   ├── edit.png
│   │   └── preview.png
│   ├── CONTRIBUTING.md          # 贡献指南（从根目录移动）
│   ├── DOCKER.md                # Docker 部署指南（从根目录移动）
│   ├── DOCKER_QUICK_REFERENCE.md # Docker 快速参考（从根目录移动）
│   ├── LICENSE                  # 许可证（从根目录移动）
│   ├── OPEN_SOURCE_CHECKLIST.md # 开源检查清单（从根目录移动）
│   └── ROADMAP.md               # 项目路线图（从根目录移动）
├── .github/                     # GitHub 配置
├── public/                      # 静态资源
└── ...
```

## 🔄 路径更新详情

### 1. README.md 中的更新

#### 图片路径
- ❌ 旧：`images/main.png`
- ✅ 新：`docs/images/main.png`

#### 文档链接
- ❌ 旧：`LICENSE`
- ✅ 新：`docs/LICENSE`

- ❌ 旧：`CONTRIBUTING.md`
- ✅ 新：`docs/CONTRIBUTING.md`

- ❌ 旧：`ROADMAP.md`
- ✅ 新：`docs/ROADMAP.md`

- ❌ 旧：`OPEN_SOURCE_CHECKLIST.md`
- ✅ 新：`docs/OPEN_SOURCE_CHECKLIST.md`

- ❌ 旧：`DOCKER.md`
- ✅ 新：`docs/DOCKER.md`

- ❌ 旧：`DOCKER_QUICK_REFERENCE.md`
- ✅ 新：`docs/DOCKER_QUICK_REFERENCE.md`

### 2. docs/ 目录下文档的更新

#### README.md 链接（需要向上级目录引用）
- ❌ 旧：`README.md`
- ✅ 新：`../README.md`

#### 同级文档链接（保持不变）
- `CONTRIBUTING.md` → `CONTRIBUTING.md` ✅
- `ROADMAP.md` → `ROADMAP.md` ✅
- `DOCKER.md` → `DOCKER.md` ✅
- 其他同级文档链接无需更改

## 📊 受影响的文件

| 文件 | 状态 | 更新内容 |
|------|------|---------|
| `README.md` | ✅ 已更新 | 所有图片和文档链接添加 `docs/` 前缀 |
| `docs/CONTRIBUTING.md` | ✅ 已更新 | README 链接改为 `../README.md` |
| `docs/ROADMAP.md` | ✅ 已更新 | README 链接改为 `../README.md` |
| `docs/OPEN_SOURCE_CHECKLIST.md` | ✅ 已更新 | README 链接改为 `../README.md` |
| `docs/DOCKER.md` | ✅ 无需更新 | 无外部链接 |
| `docs/DOCKER_QUICK_REFERENCE.md` | ✅ 无需更新 | 无外部链接 |
| `docs/LICENSE` | ✅ 无需更新 | 纯文本文件 |

## ✨ 优势

1. **清晰的文档结构**：根目录更简洁，只保留最重要的 README.md
2. **便于维护**：所有辅助文档集中在 docs/ 目录
3. **符合惯例**：遵循常见的开源项目文档组织方式
4. **易于扩展**：未来可以继续在 docs/ 下添加更多文档

## 🔍 验证清单

- [x] 所有文件已成功移动到 docs/ 目录
- [x] README.md 中的图片路径已更新
- [x] README.md 中的文档链接已更新
- [x] docs/ 下文档的 README 链接已更新为相对路径
- [x] 所有链接在 GitHub 上可正常访问
- [x] 没有断链或无效引用

## 📝 注意事项

### GitHub 渲染
GitHub 会自动处理 Markdown 文件中的相对路径，所有链接在 GitHub 网页界面上都能正常工作。

### 本地查看
如果使用本地 Markdown 查看器，请确保：
- 从项目根目录打开 README.md
- 或在 docs/ 目录中打开相应文档

### Git 历史
文件移动会显示为"删除 + 新建"，但 Git 能够识别这是重命名操作。如需查看完整历史，可使用：
```bash
git log --follow docs/CONTRIBUTING.md
```

## 🚀 后续建议

1. **添加 docs/README.md**：可以考虑在 docs/ 目录下添加一个索引文件，方便浏览所有文档
2. **更新 CI/CD**：如果 CI 流程中有文档检查步骤，确保路径已更新
3. **通知贡献者**：如果有活跃的贡献者，告知他们文档位置的变化

---

**变更日期**: 2026-05-14  
**执行人**: AI Assistant  
**影响范围**: 文档组织结构（不影响代码功能）