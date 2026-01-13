# DevTools - 桌面开发工具

一个基于 Tauri v2 的跨平台桌面应用，支持自定义按钮编排和程序监控功能。

## 功能特性

- 🚀 **执行按钮**: 支持 Shell、JavaScript、Python 脚本执行
- 📊 **程序监控**: 定时监控进程状态和 API 健康检查
- 📁 **文件夹管理**: 拖拽排序，自定义布局
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

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue。
