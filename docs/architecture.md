# 桌面应用架构设计文档

## 1. 项目概述

### 1.1 项目目标
创建一个跨平台桌面应用，实现自定义编排按钮和程序监控功能，支持 Shell（macOS/Linux）、JavaScript 和 Python 三种语言的脚本执行与监控。

### 1.2 核心功能
- 自定义按钮编排（拖拽、文件夹管理）
- 脚本执行（支持 Shell、JS、Python）
- 程序监控（定时检查进程状态、API 调用）
- 日志实时查看与管理
- 本地数据持久化

### 1.3 按钮类型说明
- **执行按钮**: 点击后执行脚本（Shell/JS/Python），执行完成后结束
- **监控按钮**: 后台定时运行，持续监控进程状态或 API 响应，直到手动停止
  - 监控进程：定时检查指定进程是否运行（如 node、java 进程）
  - 监控 API：定时调用 API 接口，检查返回内容是否符合预期

### 1.4 技术栈
- **前端**: React 18 + TypeScript + Vite + DaisyUI + TailwindCSS
- **后端**: Rust + Tauri v2 + Axum
- **数据库**: SQLite (本地存储)
- **构建工具**: Vite (前端) + Cargo (后端)
- **进程管理**: Rust 原生进程控制 + 跨平台兼容

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         Desktop App                         │
├─────────────────────────────────────────────────────────────┤
│                     Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  首页视图     │  │  管理页视图   │  │  日志视图     │      │
│  │ (启动台)      │  │ (按钮管理)    │  │ (日志面板)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                      State Management                        │
│                   (React Context + Zustand)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Tauri IPC Commands
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Rust)                         │
├─────────────────────────────────────────────────────────────┤
│                      Tauri Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  命令处理器   │  │  事件总线     │  │  窗口管理     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  脚本执行器   │  │  监控管理器   │  │  日志收集器   │      │
│  │ (Shell/JS/   │  │ (进程跟踪)    │  │ (实时流)      │      │
│  │  Python)     │  └──────────────┘  └──────────────┘      │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  SQLite DB   │  │  File System │  │  Process Mgr │      │
│  │ (rusqlite)   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 架构分层说明

#### Frontend Layer (React)
- **视图层**: 页面组件、UI 组件库 (DaisyUI)
- **状态管理**: React Context API + Zustand (轻量级状态管理)
- **交互逻辑**: 拖拽、点击、表单处理
- **通信层**: Tauri API 调用后端命令

#### Backend Layer (Rust/Tauri)
- **Tauri Layer**: IPC 通信、窗口管理、原生功能桥接
- **Business Logic**: 脚本执行、进程监控、日志处理
- **Data Access**: SQLite 数据访问、文件系统操作

---

## 3. 模块设计

### 3.1 前端模块

#### 3.1.1 页面模块

**首页**
```typescript
src/pages/HomePage/
├── components/
│   ├── StatusArea.tsx          // 状态区（监控按钮）
│   ├── ButtonArea.tsx          // 按钮区（执行按钮）
│   ├── DraggableButton.tsx     // 可拖拽按钮
│   ├── MonitorCard.tsx         // 监控卡片
│   ├── FolderGrid.tsx          // 文件夹网格
│   └── LogPanel.tsx            // 日志面板
├── hooks/
│   ├── useDragAndDrop.ts       // 拖拽逻辑
│   ├── useLauncherData.ts      // 启动台数据
│   ├── useMonitors.ts          // 监控数据
│   └── useLogs.ts              // 日志数据
└── HomePage.tsx                // 主页面
```

**管理页**
```typescript
src/pages/ManagePage/
├── components/
│   ├── ButtonCreator.tsx       // 按钮创建器
│   ├── MonitorCreator.tsx      // 监控创建器
│   ├── ButtonList.tsx          // 按钮列表
│   ├── ScriptEditor.tsx        // 脚本编辑器
│   └── LanguageSelector.tsx    // 语言选择器
├── forms/
│   ├── ButtonForm.tsx          // 按钮表单
│   ├── MonitorForm.tsx         // 监控表单
│   └── ScriptForm.tsx          // 脚本表单
└── ManagePage.tsx              // 主页面
```

#### 3.1.2 通用组件模块

```typescript
src/components/
├── Layout/
│   ├── AppLayout.tsx           // 主布局
│   ├── Sidebar.tsx             // 侧边栏
│   └── Header.tsx              // 顶部栏
├── UI/
│   ├── Button.tsx              // 通用按钮
│   ├── Modal.tsx               // 模态框
│   ├── Toast.tsx               // 通知
│   └── Loading.tsx             // 加载状态
└── Icons/                      // 图标组件
```

#### 3.1.3 状态管理模块

```typescript
src/store/
├── launcherStore.ts            // 启动台状态
│   - buttons: Button[]
│   - folders: Folder[]
│   - layout: LayoutConfig
├── logStore.ts                 // 日志状态
│   - logs: LogEntry[]
│   - isPanelOpen: boolean
│   - maxLogs: number
└── manageStore.ts              // 管理状态
│   - editingButton: Button | null
│   - editingMonitor: Monitor | null
```

### 3.2 后端模块

#### 3.2.1 Tauri 命令模块

```rust
src-tauri/src/commands/
├── launcher_commands.rs        // 启动台命令
│   - get_buttons()
│   - save_buttons()
│   - create_folder()
│   - move_button_to_folder()
├── script_commands.rs          // 脚本执行命令
│   - execute_shell()
│   - execute_js()
│   - execute_python()
│   - stop_execution()
├── monitor_commands.rs         // 监控命令
│   - start_monitor()
│   - stop_monitor()
│   - get_monitor_status()
└── log_commands.rs             // 日志命令
│   - get_logs()
│   - clear_logs()
│   - stream_logs()
```

#### 3.2.2 业务逻辑模块

```rust
src-tauri/src/
├── executor/
│   ├── shell_executor.rs       // Shell 脚本执行器
│   ├── js_executor.rs          // JavaScript 执行器 (Deno)
│   ├── python_executor.rs      // Python 执行器
│   └── mod.rs
├── monitor/
│   ├── process_monitor.rs      // 进程监控
│   ├── resource_monitor.rs     // 资源监控
│   └── mod.rs
├── logger/
│   ├── log_collector.rs        // 日志收集器
│   ├── log_buffer.rs           // 日志缓冲
│   └── mod.rs
└── database/
    ├── models.rs               // 数据模型
    ├── repository.rs           // 数据仓库
    └── schema.sql              // 数据库 schema
```

#### 3.2.3 数据库模块

```sql
-- buttons 表
CREATE TABLE buttons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    script_type TEXT NOT NULL,  -- 'shell', 'js', 'python'
    script_content TEXT NOT NULL,
    folder_id TEXT,             -- NULL 表示在根目录
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id)
);

-- folders 表
CREATE TABLE folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

-- monitors 表
CREATE TABLE monitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    monitor_type TEXT NOT NULL,  -- 'process', 'api'
    target TEXT NOT NULL,         -- 进程名称/PID 或 API URL
    check_interval INTEGER NOT NULL,
    expected_result TEXT,         -- API 监控的预期返回内容
    alert_on_failure BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    last_check_time INTEGER,
    last_status TEXT,             -- 'running', 'stopped', 'error'
    created_at INTEGER NOT NULL
);

-- logs 表
CREATE TABLE logs (
    id TEXT PRIMARY KEY,
    button_id TEXT,
    monitor_id TEXT,
    level TEXT NOT NULL,         -- 'info', 'warning', 'error'
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (button_id) REFERENCES buttons(id),
    FOREIGN KEY (monitor_id) REFERENCES monitors(id)
);
```

---

## 4. 核心流程设计

### 4.1 按钮执行流程

```
用户点击按钮
    ↓
Frontend 调用 execute_script(button_id)
    ↓
Tauri 接收命令，查询数据库获取脚本信息
    ↓
根据 script_type 选择对应的执行器
    ↓
执行器创建子进程执行脚本
    ↓
实时捕获 stdout/stderr
    ↓
通过 Tauri Events 推送日志到前端
    ↓
前端更新日志面板
    ↓
进程结束，保存执行结果到数据库
```

### 4.2 监控流程

```
用户在管理页创建监控
    ↓
Frontend 调用 create_monitor(config)
    ↓
Tauri 保存监控配置到数据库
    ↓
用户在首页点击"启动监控"
    ↓
Tauri 创建后台监控任务 (tokio::spawn)
    ↓
定时循环执行检查:
  - 进程监控: 检查进程是否存在
  - API 监控: 调用 API 并验证返回内容
    ↓
记录检查结果到数据库
    ↓
如果检测到异常:
  - 推送告警日志到前端
  - 更新监控卡片状态为"告警"
  - 可选：执行关联的恢复脚本
    ↓
前端实时更新监控状态显示
    ↓
用户点击"停止监控"，清理后台任务
```

### 4.3 拖拽与布局流程

```
用户拖拽按钮
    ↓
Frontend 更新临时布局状态
    ↓
拖拽结束，调用 save_layout()
    ↓
Tauri 批量更新数据库
    ↓
返回成功，前端持久化布局
```

---

## 5. 技术细节

### 5.1 脚本执行实现

#### Shell 执行
```rust
use std::process::Command;

pub fn execute_shell(script: &str) -> Result<Output> {
    let output = Command::new("bash")
        .arg("-c")
        .arg(script)
        .output()?;
    Ok(output)
}
```

#### JavaScript 执行
```rust
use deno_runtime::deno_core::JsRuntime;

pub async fn execute_js(script: &str) -> Result<String> {
    let mut runtime = JsRuntime::new(Default::default());
    let result = runtime.execute_script("[script]", script)?;
    // 处理结果
}
```

#### Python 执行
```rust
use std::process::Command;

pub fn execute_python(script: &str) -> Result<Output> {
    let output = Command::new("python3")
        .arg("-c")
        .arg(script)
        .output()?;
    Ok(output)
}
```

### 5.2 日志实时流

```rust
// 使用 Tauri Events 实现日志流
#[tauri::command]
async fn stream_logs(app_handle: tauri::AppHandle) -> Result<(), Error> {
    let _id = app_handle.listen("log-event", |event| {
        // 处理日志事件
    });
    Ok(())
}

// Rust 发送日志到前端
app_handle.emit("log-entry", LogEntry {
    level: "info".to_string(),
    message: output,
    timestamp: timestamp,
})?;
```

### 5.3 进程监控

```rust
use sysinfo::{ProcessExt, System, SystemExt};

pub struct ProcessMonitor {
    system: System,
    target_name: String,
    monitor_type: MonitorType,
}

pub enum MonitorType {
    Process(String),      // 进程名称
    Api {
        url: String,
        expected: String,
    },
}

impl ProcessMonitor {
    pub async fn check_status(&mut self) -> MonitorStatus {
        match &self.monitor_type {
            MonitorType::Process(name) => {
                self.system.refresh_processes();
                let exists = self.system.processes_by_name(name).count() > 0;

                if exists {
                    MonitorStatus::Running
                } else {
                    MonitorStatus::Stopped
                }
            }
            MonitorType::Api { url, expected } => {
                match reqwest::get(url).await {
                    Ok(response) => {
                        let body = response.text().await.unwrap_or_default();
                        if body.contains(expected) {
                            MonitorStatus::Running
                        } else {
                            MonitorStatus::Error("返回内容不匹配".to_string())
                        }
                    }
                    Err(e) => MonitorStatus::Error(e.to_string()),
                }
            }
        }
    }
}
```

---

## 6. 项目目录结构

```
dev-tools/
├── src/                          # 前端源码
│   ├── main.tsx                  # 入口文件
│   ├── App.tsx                   # 主应用组件
│   ├── assets/                   # 静态资源
│   ├── components/               # 通用组件
│   │   ├── Layout/
│   │   ├── UI/
│   │   └── Icons/
│   ├── pages/                    # 页面组件
│   │   ├── HomePage/
│   │   └── ManagePage/
│   ├── store/                    # 状态管理
│   │   ├── launcherStore.ts
│   │   ├── logStore.ts
│   │   └── manageStore.ts
│   ├── hooks/                    # 自定义 Hooks
│   ├── types/                    # TypeScript 类型定义
│   └── utils/                    # 工具函数
├── src-tauri/                    # Tauri 后端
│   ├── src/
│   │   ├── main.rs               # Rust 入口
│   │   ├── commands/             # Tauri 命令
│   │   ├── executor/             # 脚本执行器
│   │   ├── monitor/              # 监控模块
│   │   ├── logger/               # 日志模块
│   │   ├── database/             # 数据库模块
│   │   └── lib.rs                # 库文件
│   ├── Cargo.toml                # Rust 依赖
│   ├── tauri.conf.json           # Tauri 配置
│   └── src-tauri.conf.json       # Tauri 配置
├── docs/                         # 文档
│   ├── architecture.md           # 架构设计文档
│   └── ui-design.md              # UI设计文档
├── package.json                  # Node 依赖
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 配置
└── README.md                     # 项目说明
```

---

## 7. 安全性考虑

### 7.1 脚本执行安全
- 所有脚本执行在独立的子进程中
- 沙箱隔离，防止访问系统敏感路径
- 执行超时控制，防止无限循环
- 权限限制，禁止危险操作

### 7.2 数据安全
- SQLite 数据库文件加密
- 本地数据存储在应用专用目录
- 定期备份机制

### 7.3 进程管理
- 所有启动的进程记录 PID
- 应用退出时清理所有子进程
- 资源泄漏防护

---

## 8. 性能优化

### 8.1 前端优化
- React.memo 优化组件渲染
- 虚拟滚动处理大量按钮
- 代码分割，按路由加载
- 图片懒加载

### 8.2 后端优化
- 异步任务处理 (tokio)
- 连接池管理
- 日志缓冲批量写入
- 进程池复用

---

## 9. 扩展性设计

### 9.1 插件系统
预留插件接口，支持第三方扩展：
```rust
pub trait Plugin {
    fn name(&self) -> &str;
    fn execute(&self, script: &str) -> Result<Output>;
}
```

### 9.2 语言扩展
通过插件机制轻松添加新语言支持（如 Ruby、Go 等）

### 9.3 主题系统
支持自定义主题，用户可导入导出主题配置

---

## 10. 测试策略

### 10.1 单元测试
- 前端组件测试
- Rust 模块单元测试

### 10.2 集成测试
- Tauri 命令测试
- 数据库操作测试

### 10.3 E2E 测试
- 用户操作流程测试
- 跨平台兼容性测试

---

## 11. 部署与打包

### 11.1 开发环境
```bash
npm run tauri dev
```

### 11.2 生产打包
```bash
npm run tauri build
```

### 11.3 支持平台
- macOS (Universal Binary)
- Linux (AppImage, DEB)
- Windows (MSI, NSIS)

---

## 12. 开发计划

### Phase 1: 基础框架 (2周)
- 项目初始化
- 基础 UI 框架搭建
- Tauri 环境配置
- 数据库设计实现

### Phase 2: 核心功能 (4周)
- 按钮创建与管理
- 脚本执行 (Shell + Python)
- 基础监控功能
- 日志系统

### Phase 3: 高级功能 (3周)
- JavaScript 支持
- 拖拽与文件夹管理
- 高级监控功能
- 日志面板优化

### Phase 4: 优化与测试 (2周)
- 性能优化
- 跨平台测试
- Bug 修复
- 文档完善

---

## 13. 依赖管理

### 前端主要依赖
- react: ^18.2.0
- typescript: ^5.0.0
- @tauri-apps/api: ^2.0.0
- daisyui: ^4.0.0
- zustand: ^4.4.0
- react-beautiful-dnd: ^13.1.0

### 后端主要依赖
- tauri: ^2.0.0
- tokio: ^1.0.0
- sqlx: ^0.7.0 (或 rusqlite)
- serde: ^1.0.0
- sysinfo: ^0.30.0
- deno_runtime: ^0.1.0 (可选)

---

## 14. 参考资料

- [Tauri 官方文档](https://tauri.app/)
- [React 官方文档](https://react.dev/)
- [DaisyUI 文档](https://daisyui.com/)
- [Rust 异步编程](https://rust-lang.github.io/async-book/)
- [SQLx 文档](https://docs.rs/sqlx/)
