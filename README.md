# DevTools - 桌面开发工具

一个基于 Tauri v2 的跨平台桌面应用，支持自定义按钮编排和程序监控功能。

## 功能特性

- 🚀 **执行按钮**: 支持 Shell、JavaScript、Python 脚本执行
- 📊 **程序监控**: 定时监控进程状态和 API 健康检查
- 📁 **文件夹管理**: 拖拽排序，自定义布局
- 🔄 **统一排序**: 监控、文件夹和按钮可在单个列表中自由重新排序
- 📋 **实时日志**: 查看脚本执行和监控日志
- 🎨 **主题切换**: 支持亮色/暗色主题

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + DaisyUI
- **后端**: Rust + Tauri v2
- **数据库**: SQLite
- **状态管理**: Zustand
- **路由**: React Router

## 环境要求

### 必需
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Rust**: >= 1.70.0 (Tauri 需要)

### 安装 Rust

**macOS/Linux**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**或使用 Homebrew (macOS)**:
```bash
brew install rust
```

**验证安装**:
```bash
rustc --version
cargo --version
```

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd dev-tools
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动开发服务器

**仅前端开发 (不需要 Rust)**:
```bash
npm run dev
```
访问 http://localhost:1420/

**完整应用 (需要 Rust)**:
```bash
npm run tauri dev
```
这将启动 Tauri 桌面应用

### 4. 构建生产版本
```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`

## 项目结构

```
dev-tools/
├── docs/                    # 设计文档
│   ├── architecture.md      # 架构设计
│   ├── ui-design.md         # UI 设计
│   └── task-breakdown.md    # 任务拆分
├── src/                     # 前端源码
│   ├── api/                 # API 调用
│   ├── components/          # React 组件
│   │   └── Layout/          # 布局组件
│   ├── pages/               # 页面组件
│   │   ├── HomePage/        # 首页
│   │   ├── ManagePage/      # 管理页
│   │   └── SettingsPage/    # 设置页
│   ├── store/               # Zustand 状态管理
│   ├── types/               # TypeScript 类型定义
│   └── utils/               # 工具函数
├── src-tauri/               # Rust 后端
│   └── src/
│       ├── commands/        # Tauri 命令
│       ├── database/        # 数据库模块
│       ├── executor/        # 脚本执行器
│       ├── monitor/         # 监控模块
│       └── logger/          # 日志模块
└── package.json
```

## 开发指南

### 可用命令

```bash
# 启动前端开发服务器
npm run dev

# 启动 Tauri 开发模式
npm run tauri dev

# 构建生产版本
npm run tauri build

# 代码格式化
npm run format

# 代码检查
npm run lint
```

### 开发流程

1. **前端开发**: 使用 `npm run dev` 进行快速开发和热重载
2. **后端开发**: 修改 `src-tauri/src/` 下的 Rust 代码
3. **完整测试**: 使用 `npm run tauri dev` 测试前后端集成
4. **构建发布**: 使用 `npm run tauri build` 构建应用

### 数据库

应用使用 SQLite 数据库，数据文件位置：
- **macOS**: `~/Library/Application Support/com.dev-tools-temp.app/devtools.db`
- **Linux**: `~/.local/share/dev-tools-temp/devtools.db`
- **Windows**: `%APPDATA%\com.dev-tools-temp.app\devtools.db`

数据库包含以下表：
- `buttons`: 执行按钮配置
- `folders`: 文件夹配置
- `monitors`: 监控配置
- `logs`: 日志记录

#### 统一排序系统

应用使用统一排序系统，允许监控、文件夹和按钮在单个列表中自由重新排序：

- **统一位置**: 所有项目类型共享统一的位置序列（0, 1, 2, ...）
- **容器隔离**: 主列表和每个文件夹维护独立的位置序列
- **自动迁移**: 首次启动时自动从旧的类型特定位置迁移到统一位置
- **原子更新**: 位置更新在单个事务中完成，确保数据一致性

**API 更新**:
- 使用 `get_all_items()` 获取所有项目（按位置排序）
- 使用 `update_unified_positions()` 批量更新位置
- 旧的类型特定位置更新函数已被移除（`update_button_positions`, `update_monitor_positions`, `update_folder_positions`）

**前端状态管理**:
- 使用 `unifiedStore` 进行位置和排序操作
- `launcherStore` 和 `monitorStore` 保留用于 CRUD 操作（已标记为部分弃用）
- 拖放操作使用统一的位置计算算法

## 开发进度

- ✅ Phase 1: 项目初始化与基础框架
- ⏳ Phase 2: 执行按钮功能实现
- ⏳ Phase 3: 监控功能实现
- ⏳ Phase 4: 拖拽与布局功能
- ⏳ Phase 5: 日志系统完善
- ⏳ Phase 6: 设置与主题
- ⏳ Phase 7: 高级功能与优化
- ⏳ Phase 8: 测试与打包

详细任务拆分请查看 [docs/task-breakdown.md](docs/task-breakdown.md)

## 推荐 IDE 设置

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## 常见问题

### Q: 运行 `npm run tauri dev` 报错 "cargo not found"
**A**: 需要先安装 Rust 工具链，参考上面的"安装 Rust"部分。

### Q: 前端可以运行，但 Tauri 应用无法启动
**A**: 确保已安装 Rust，并且运行了 `source $HOME/.cargo/env`。

### Q: 数据库文件在哪里？
**A**: 参考上面的"数据库"部分，根据操作系统查找对应路径。

### Q: 如何重置数据库？
**A**: 删除数据库文件，应用会在下次启动时自动重新创建。

### Q: 从旧版本升级后，项目顺序是否会保留？
**A**: 是的。应用会在首次启动时自动运行迁移脚本，将旧的类型特定位置转换为统一位置。迁移会保留相对顺序（监控优先、文件夹第二、按钮第三）。

### Q: 如何使用新的统一排序 API？
**A**: 
- **后端**: 使用 `update_unified_positions()` 替代旧的 `update_button_positions()`, `update_monitor_positions()`, `update_folder_positions()`
- **前端**: 使用 `unifiedStore.reorderItems()` 进行位置更新
- **API**: 使用 `updateUnifiedPositions()` 替代旧的类型特定函数

## 迁移指南

### 从旧版本升级

如果你从使用旧的类型特定位置系统的版本升级：

1. **自动迁移**: 首次启动时会自动运行迁移脚本
2. **数据备份**: 建议在升级前备份数据库文件
3. **验证**: 启动后验证所有项目的顺序是否正确
4. **回滚**: 如果迁移失败，应用会自动回滚并记录错误

### API 迁移

**旧代码**:
```typescript
// 旧的类型特定更新
await updateButtonPositions([{ id: 'btn1', position: 0 }]);
await updateMonitorPositions([{ id: 'mon1', position: 1 }]);
await updateFolderPositions([{ id: 'fld1', position: 2 }]);
```

**新代码**:
```typescript
// 新的统一更新
await updateUnifiedPositions([
  { id: 'btn1', item_type: 'button', position: 0, folder_id: null },
  { id: 'mon1', item_type: 'monitor', position: 1, folder_id: null },
  { id: 'fld1', item_type: 'folder', position: 2, folder_id: null },
]);
```

### 状态管理迁移

**旧代码**:
```typescript
// 旧的类型特定排序
const { reorderButtons } = useLauncherStore();
reorderButtons(newOrder);
```

**新代码**:
```typescript
// 新的统一排序
const { reorderItems } = useUnifiedStore();
await reorderItems(itemId, newPosition, folderId);
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue。
