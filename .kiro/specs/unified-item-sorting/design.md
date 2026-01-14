# 设计文档：统一项目排序

## 概述

本设计文档描述了统一排序系统的实现，该系统允许监控、文件夹和按钮在单个列表中自由重新排序。目前，这三种项目类型只能在各自的组内排序（监控与监控、文件夹与文件夹、按钮与按钮）。新系统将把所有项目视为统一列表的一等成员，实现灵活的组织，同时保持文件夹包含语义。

设计遵循分层架构：
- **数据库层**：具有统一位置管理的 SQLite 模式
- **后端层**：用于 CRUD 和批量位置更新的 Rust/Tauri 命令
- **状态管理层**：具有统一项目列表的 Zustand 存储
- **UI 层**：使用 dnd-kit 进行拖放的 React 组件

## 架构

### 当前架构

当前系统维护三个独立的位置序列：
- 监控在其容器（根目录或文件夹）内具有位置 0、1、2、...
- 文件夹在根级别具有位置 0、1、2、...
- 按钮在其容器（根目录或文件夹）内具有位置 0、1、2、...

这创建了固定的显示顺序：监控 → 文件夹 → 按钮

### 新架构

新系统将为根级别的所有项目使用单一统一位置序列：
- 所有没有 folder_id 的项目（监控、文件夹、按钮）共享位置 0、1、2、...
- 文件夹内的项目为每个文件夹维护单独的位置序列
- 显示顺序仅由位置字段决定，而不是由项目类型决定

```
根级别：
  位置 0：监控 A
  位置 1：文件夹 X
  位置 2：按钮 B
  位置 3：监控 C
  位置 4：按钮 D

文件夹 X：
  位置 0：按钮 E
  位置 1：监控 F
  位置 2：按钮 G
```

## 组件和接口

### 1. 数据库模式

不需要更改模式 - 所有三个表都已经有一个 `position` 字段。但是，语义发生了变化：

**当前语义**：
- 位置相对于容器内的项目类型
- 监控、文件夹和按钮具有独立的位置序列

**新语义**：
- 位置相对于容器，不考虑项目类型
- 同一容器（根目录或特定文件夹）中的所有项目共享统一的位置序列

### 2. 后端 API（Rust/Tauri）

#### 新 API 端点：获取所有项目

```rust
#[tauri::command]
pub async fn get_all_items(
    state: State<'_, AppState>
) -> Result<Vec<UnifiedItem>, String>
```

Returns all items (monitors, folders, buttons) sorted by position. Each item includes a `item_type` discriminator.

```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "item_type")]
pub enum UnifiedItem {
    Monitor(Monitor),
    Folder(Folder),
    Button(Button),
}
```

#### New API Endpoint: Batch Update Positions

```rust
#[tauri::command]
pub async fn update_unified_positions(
    updates: Vec<UnifiedPositionUpdate>,
    state: State<'_, AppState>
) -> Result<(), String>

#[derive(Deserialize)]
pub struct UnifiedPositionUpdate {
    pub id: String,
    pub item_type: String, // "monitor", "folder", or "button"
    pub position: i32,
    pub folder_id: Option<String>,
}
```

Updates positions for multiple items in a single database transaction. Validates that:
- All positions are non-negative
- No duplicate positions within the same container
- All referenced items exist

#### Modified Repository Functions

Update existing repository functions to support unified queries:

```rust
// New function in repository.rs
pub fn get_all_items_by_container(
    conn: &Connection,
    folder_id: Option<&str>
) -> Result<Vec<(String, String, i32)>> // (id, item_type, position)
```

This function queries all three tables and returns a unified list of (id, type, position) tuples for a given container.

### 3. Frontend State Management

#### New Unified Store

Create a new `unifiedStore.ts` that manages all items together:

```typescript
interface UnifiedItem {
  id: string;
  type: 'monitor' | 'folder' | 'button';
  position: number;
  folder_id: string | null;
  data: Monitor | Folder | Button;
}

interface UnifiedState {
  items: UnifiedItem[];
  
  // Fetch all items
  fetchAllItems: () => Promise<void>;
  
  // Get items for a specific container
  getItemsByContainer: (folderId: string | null) => UnifiedItem[];
  
  // Reorder items
  reorderItems: (
    itemId: string,
    newPosition: number,
    newFolderId: string | null
  ) => Promise<void>;
  
  // CRUD operations
  addItem: (item: UnifiedItem) => void;
  updateItem: (id: string, updates: Partial<UnifiedItem>) => void;
  deleteItem: (id: string) => void;
}
```

#### Integration with Existing Stores

The existing `launcherStore` and `monitorStore` will be kept for backward compatibility but will sync with the unified store:

```typescript
// In unifiedStore
const syncWithLegacyStores = () => {
  const monitors = items
    .filter(i => i.type === 'monitor')
    .map(i => i.data as Monitor);
  useMonitorStore.getState().setMonitors(monitors);
  
  const buttons = items
    .filter(i => i.type === 'button')
    .map(i => i.data as Button);
  useLauncherStore.getState().setButtons(buttons);
  
  const folders = items
    .filter(i => i.type === 'folder')
    .map(i => i.data as Folder);
  useLauncherStore.getState().setFolders(folders);
};
```

### 4. Drag and Drop System

#### Modified DragDropWrapper

Update `DragDropWrapper.tsx` to handle unified sorting:

**Key Changes**:
1. Remove type-specific sorting logic
2. Treat all items uniformly when determining drop position
3. Calculate new positions based on unified list order

**Algorithm for Position Calculation**:

```typescript
function calculateNewPosition(
  items: UnifiedItem[],
  draggedItemId: string,
  dropTargetId: string,
  dropPosition: 'before' | 'after'
): number {
  const containerItems = items.filter(i => 
    i.folder_id === items.find(x => x.id === draggedItemId)?.folder_id
  );
  
  const targetIndex = containerItems.findIndex(i => i.id === dropTargetId);
  const newIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1;
  
  return newIndex;
}
```

**Reordering Logic**:

```typescript
async function handleReorder(
  draggedId: string,
  newPosition: number,
  newFolderId: string | null
) {
  // Get all items in the target container
  const containerItems = items.filter(i => i.folder_id === newFolderId);
  
  // Remove dragged item from its current position
  const draggedItem = items.find(i => i.id === draggedId);
  const otherItems = containerItems.filter(i => i.id !== draggedId);
  
  // Insert at new position
  otherItems.splice(newPosition, 0, draggedItem);
  
  // Recalculate all positions
  const updates = otherItems.map((item, index) => ({
    id: item.id,
    item_type: item.type,
    position: index,
    folder_id: newFolderId,
  }));
  
  // Batch update
  await updateUnifiedPositions(updates);
}
```

### 5. UI Components

#### Modified HomePage

Update `HomePage.tsx` to render items from the unified store:

```typescript
function HomePage() {
  const { items, fetchAllItems } = useUnifiedStore();
  
  useEffect(() => {
    fetchAllItems();
  }, []);
  
  const rootItems = items
    .filter(i => i.folder_id === null)
    .sort((a, b) => a.position - b.position);
  
  return (
    <DragDropWrapper>
      {rootItems.map(item => (
        <UnifiedCard key={item.id} item={item} />
      ))}
    </DragDropWrapper>
  );
}
```

#### New UnifiedCard Component

Create a wrapper component that renders the appropriate card based on item type:

```typescript
function UnifiedCard({ item }: { item: UnifiedItem }) {
  switch (item.type) {
    case 'monitor':
      return <MonitorCard monitor={item.data as Monitor} />;
    case 'folder':
      return <FolderCard folder={item.data as Folder} />;
    case 'button':
      return <ButtonCard button={item.data as Button} />;
  }
}
```

## Data Models

### UnifiedItem (Frontend)

```typescript
interface UnifiedItem {
  id: string;
  type: 'monitor' | 'folder' | 'button';
  position: number;
  folder_id: string | null;
  data: Monitor | Folder | Button;
}
```

### UnifiedPositionUpdate (API)

```typescript
interface UnifiedPositionUpdate {
  id: string;
  item_type: 'monitor' | 'folder' | 'button';
  position: number;
  folder_id: string | null;
}
```

### Database Models (No Changes)

The existing `Monitor`, `Folder`, and `Button` models remain unchanged. The `position` field already exists in all three tables.

## 正确性属性

*属性是在系统的所有有效执行中应该保持为真的特征或行为——本质上是关于系统应该做什么的正式陈述。属性充当人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：查询返回按位置排序的项目

*对于任何*具有相同 folder_id 的数据库中的项目集，查询这些项目应该返回按位置升序排序的项目，不考虑项目类型。

**验证：需求 1.2**

### 属性 2：新项目获得下一个位置

*对于任何*容器中的现有项目列表，在该容器中创建新项目应该为其分配等于 max(existing_positions) + 1 的位置。

**验证：需求 1.4**

### 属性 3：插入移动后续项目

*对于任何*项目列表和任何有效的插入位置，在该位置插入项目应该增加先前具有 position >= insertion_position 的所有项目的位置。

**验证：需求 2.1**

### 属性 4：删除消除间隙

*对于任何*项目列表，删除项目后，剩余项目应该具有从 0 开始的连续位置，没有间隙（位置应该是 0、1、2、...、n-1）。

**验证：需求 2.2**

### 属性 5：位置始终唯一

*对于任何*操作（创建、更新、删除、重新排序），操作完成后，同一容器中的所有项目应该具有唯一的位置值。

**验证：需求 2.4**

### 属性 6：放置持久化位置

*对于任何*项目和任何有效的放置位置，放置项目并从数据库重新加载后，项目应该在新位置。

**验证：需求 3.2**

### 属性 7：取消恢复位置

*对于任何*项目列表，如果启动拖动操作然后取消，所有项目应该具有与拖动开始前相同的位置。

**验证：需求 3.4**

### 属性 8：存储提供排序列表

*对于任何*前端存储中的项目集，调用 getItemsByContainer 应该返回按位置升序排序的项目。

**验证：需求 4.1**

### 属性 9：文件夹项目从主列表中排除

*对于任何*项目列表，具有非空 folder_id 的项目不应出现在 getItemsByContainer(null) 的结果中。

**验证：需求 5.1**

### 属性 10：文件夹项目按位置排序

*对于任何*文件夹，调用 getItemsByContainer(folderId) 应该返回按相对于该文件夹的位置排序的项目，不考虑项目类型。

**验证：需求 5.2**

### 属性 11：移动项目重新计算位置

*对于任何*在容器之间移动的项目（进入/离开文件夹），移动后源容器和目标容器都应该具有没有间隙的连续位置。

**验证：需求 5.3**

### 属性 12：独立位置序列

*对于任何*时间点，主列表（folder_id = null）和每个文件夹应该具有独立的位置序列，每个序列都从 0 开始且没有间隙。

**验证：需求 5.4**

### 属性 13：API 返回排序项目

*对于任何*数据库中的项目集，调用 get_all_items API 应该返回按位置升序排序的项目。

**验证：需求 7.1**

### 属性 14：API 验证唯一位置

*对于任何*批量位置更新，其中同一容器中的两个项目将具有相同的位置，API 应该拒绝更新并返回错误。

**验证：需求 7.3**

### 属性 15：存储更新反映更改

*对于任何*项目操作（创建、更新、删除），统一存储的项目列表应该立即反映更改。

**验证：需求 8.2**

### 属性 16：拒绝无效位置

*对于任何*为负或会在序列中创建间隙的位置值，系统应该拒绝更新并返回错误。

**验证：需求 10.4**

## Error Handling

### Position Conflict Resolution

When position conflicts are detected (e.g., two items with the same position in the same container):

1. **Detection**: Check for conflicts during batch updates and on application startup
2. **Resolution**: Automatically reassign positions sequentially based on creation time
3. **Logging**: Log a warning with details of the conflict and resolution

```typescript
function resolvePositionConflicts(items: UnifiedItem[]): UnifiedItem[] {
  const byContainer = groupBy(items, i => i.folder_id ?? 'root');
  
  return Object.values(byContainer).flatMap(containerItems => {
    // Sort by position, then by created_at for conflicts
    const sorted = containerItems.sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.data.created_at - b.data.created_at;
    });
    
    // Reassign sequential positions
    return sorted.map((item, index) => ({
      ...item,
      position: index,
    }));
  });
}
```

### Failed Position Updates

When a position update fails:

1. **Rollback**: Revert the frontend state to the previous positions
2. **Error Message**: Display a user-friendly error message
3. **Retry**: Optionally queue the update for retry if it was a network error

```typescript
async function handleReorderWithRollback(updates: UnifiedPositionUpdate[]) {
  const previousState = [...items];
  
  try {
    // Optimistically update UI
    applyPositionUpdates(updates);
    
    // Persist to backend
    await updateUnifiedPositions(updates);
  } catch (error) {
    // Rollback on failure
    setItems(previousState);
    
    showError('Failed to update item positions. Please try again.');
    console.error('Position update failed:', error);
  }
}
```

### Database Connection Loss

When the database connection is lost during reordering:

1. **Queue**: Store pending updates in a queue
2. **Retry**: Attempt to reconnect and apply queued updates
3. **Notification**: Inform the user that changes are pending

```typescript
const pendingUpdates: UnifiedPositionUpdate[] = [];

async function handleReorderWithQueue(updates: UnifiedPositionUpdate[]) {
  try {
    await updateUnifiedPositions(updates);
  } catch (error) {
    if (isConnectionError(error)) {
      pendingUpdates.push(...updates);
      showWarning('Connection lost. Changes will be saved when reconnected.');
      startRetryLoop();
    } else {
      throw error;
    }
  }
}
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Position Calculation**:
   - Test calculating new position when dropping before/after an item
   - Test position calculation for empty containers
   - Test position calculation when moving between containers

2. **Conflict Resolution**:
   - Test resolving conflicts with 2 items at same position
   - Test resolving conflicts with multiple items at same position
   - Test conflict resolution preserves relative order by creation time

3. **Validation**:
   - Test rejecting negative positions
   - Test rejecting duplicate positions in same container
   - Test accepting valid position updates

4. **Migration**:
   - Test migration preserves relative order (monitors, folders, buttons)
   - Test migration assigns sequential positions
   - Test migration handles empty tables

### Property-Based Tests

Property-based tests will verify universal properties across all inputs using a PBT library (fast-check for TypeScript, proptest for Rust). Each test will run a minimum of 100 iterations.

**Test Configuration**:
- Library: fast-check (TypeScript), proptest (Rust)
- Iterations: 100 minimum per property
- Tag format: `Feature: unified-item-sorting, Property N: <property_text>`

**Property Test Implementation**:

1. **Property 1: Query Returns Items Sorted by Position**
   - Generate: Random list of items with random positions
   - Action: Query items by container
   - Assert: Result is sorted by position

2. **Property 2: New Item Gets Next Position**
   - Generate: Random list of items
   - Action: Create new item
   - Assert: New item position = max(existing) + 1

3. **Property 3: Insertion Shifts Subsequent Items**
   - Generate: Random list of items, random insertion position
   - Action: Insert item at position
   - Assert: All items with position >= insertion_position are incremented

4. **Property 4: Deletion Eliminates Gaps**
   - Generate: Random list of items
   - Action: Delete random item
   - Assert: Remaining positions are 0, 1, 2, ..., n-1

5. **Property 5: Positions Are Always Unique**
   - Generate: Random operation (create/update/delete/reorder)
   - Action: Perform operation
   - Assert: All positions in same container are unique

6. **Property 6: Drop Persists Position**
   - Generate: Random item, random drop position
   - Action: Drop item, reload from database
   - Assert: Item is at new position

7. **Property 7: Cancel Restores Positions**
   - Generate: Random list of items
   - Action: Start drag, cancel drag
   - Assert: All positions unchanged

8. **Property 8: Store Provides Sorted List**
   - Generate: Random items in store
   - Action: Call getItemsByContainer
   - Assert: Result is sorted by position

9. **Property 9: Folder Items Excluded from Main List**
   - Generate: Random items, some with folder_id
   - Action: Call getItemsByContainer(null)
   - Assert: No items with non-null folder_id in result

10. **Property 10: Folder Items Sorted by Position**
    - Generate: Random folder with random items
    - Action: Call getItemsByContainer(folderId)
    - Assert: Result is sorted by position

11. **Property 11: Moving Item Recalculates Positions**
    - Generate: Random item, random source/dest containers
    - Action: Move item between containers
    - Assert: Both containers have sequential positions

12. **Property 12: Separate Position Sequences**
    - Generate: Random items across multiple containers
    - Action: Query all containers
    - Assert: Each container has positions 0, 1, 2, ..., n-1

13. **Property 13: API Returns Sorted Items**
    - Generate: Random items in database
    - Action: Call get_all_items API
    - Assert: Result is sorted by position

14. **Property 14: API Validates Unique Positions**
    - Generate: Batch update with duplicate positions
    - Action: Call update_unified_positions API
    - Assert: API returns error

15. **Property 15: Store Updates Reflect Changes**
    - Generate: Random item operation
    - Action: Perform operation
    - Assert: Store's item list reflects change

16. **Property 16: Invalid Positions Rejected**
    - Generate: Invalid position value (negative or creates gap)
    - Action: Attempt to update position
    - Assert: System rejects update with error

### Integration Tests

Integration tests will verify end-to-end workflows:

1. **Full Reorder Workflow**:
   - Create items of all types
   - Drag and drop to reorder
   - Verify database persistence
   - Reload and verify order maintained

2. **Folder Movement Workflow**:
   - Create items in root and folders
   - Move items between containers
   - Verify positions recalculated correctly

3. **Migration Workflow**:
   - Set up database with old position scheme
   - Run migration
   - Verify new unified positions
   - Verify relative order preserved

## 迁移策略

### 迁移脚本

创建在应用程序启动时运行的迁移脚本（一次性）：

```rust
pub fn migrate_to_unified_positions(conn: &Connection) -> Result<()> {
    // Check if migration already done
    if is_migration_complete(conn)? {
        return Ok(());
    }
    
    // Start transaction
    let tx = conn.transaction()?;
    
    // Get all items
    let monitors = get_all_monitors(&tx)?;
    let folders = get_all_folders(&tx)?;
    let buttons = get_all_buttons(&tx)?;
    
    // Assign new positions: monitors first, then folders, then buttons
    let mut position = 0;
    
    for monitor in monitors.iter().filter(|m| m.folder_id.is_none()) {
        update_monitor_position(&tx, &monitor.id, position)?;
        position += 1;
    }
    
    for folder in folders.iter() {
        update_folder_position(&tx, &folder.id, position)?;
        position += 1;
    }
    
    for button in buttons.iter().filter(|b| b.folder_id.is_none()) {
        update_button_position(&tx, &button.id, position)?;
        position += 1;
    }
    
    // Handle items in folders (separate position sequences per folder)
    let folder_ids: Vec<String> = folders.iter().map(|f| f.id.clone()).collect();
    
    for folder_id in folder_ids {
        let mut folder_position = 0;
        
        for monitor in monitors.iter().filter(|m| m.folder_id.as_deref() == Some(&folder_id)) {
            update_monitor_position(&tx, &monitor.id, folder_position)?;
            folder_position += 1;
        }
        
        for button in buttons.iter().filter(|b| b.folder_id.as_deref() == Some(&folder_id)) {
            update_button_position(&tx, &button.id, folder_position)?;
            folder_position += 1;
        }
    }
    
    // Mark migration as complete
    mark_migration_complete(&tx)?;
    
    // Commit transaction
    tx.commit()?;
    
    Ok(())
}
```

### 迁移验证

迁移后，验证：
1. 所有项目都有有效位置（>= 0）
2. 同一容器内没有重复位置
3. 位置在每个容器内是连续的（0、1、2、...、n-1）
4. 保留相对顺序（根级别的监控在文件夹之前，文件夹在按钮之前）

### 回滚策略

如果迁移失败：
1. 事务自动回滚
2. 记录详细错误
3. 应用程序继续使用旧位置方案
4. 通知用户报告问题

## 代码清理策略

### 要删除的旧代码

实施统一排序系统后，以下代码将变得多余：

**后端（Rust/Tauri）**：
- `update_button_positions` - 替换为 `update_unified_positions`
- `update_monitor_positions` - 替换为 `update_unified_positions`
- `update_folder_positions` - 替换为 `update_unified_positions`
- 相应的 Tauri 命令处理程序

**前端（TypeScript）**：
- `src/api/tauri.ts` 中的 `updateButtonPositions`
- `src/api/tauri.ts` 中的 `updateMonitorPositions`
- `src/api/tauri.ts` 中的 `updateFolderPositions`
- `DragDropWrapper.tsx` 中的类型特定排序逻辑

### 弃用策略

为了保持向后兼容性，在完全删除之前：

1. **第一阶段**：标记为已弃用
   - 在旧函数上添加 `@deprecated` 注释
   - 在内部将旧函数重定向到新的统一 API
   - 记录弃用警告

2. **第二阶段**：监控使用情况
   - 记录对已弃用函数的调用
   - 确认没有外部依赖项

3. **第三阶段**：删除
   - 在确认没有使用后删除已弃用的代码
   - 更新所有文档和示例

### 清理检查清单

- [ ] 删除后端的旧位置更新函数
- [ ] 删除前端的旧位置更新 API 调用
- [ ] 清理 DragDropWrapper 中的类型特定逻辑
- [ ] 删除未使用的导入
- [ ] 更新 API 文档
- [ ] 更新代码注释
- [ ] 运行 linter 和格式化程序
- [ ] 验证没有破坏性更改

## 性能考虑

### Database Queries

- Use indexed queries on `position` and `folder_id` fields
- Batch position updates in a single transaction
- Limit query results to visible items (pagination if needed)

### Frontend Rendering

- Use React.memo for item cards to prevent unnecessary re-renders
- Virtualize long lists (react-window) if item count exceeds 100
- Debounce position updates during drag operations

### Drag and Drop

- Use CSS transforms for drag preview (GPU-accelerated)
- Throttle position calculations during drag
- Batch state updates to minimize re-renders

## Implementation Notes

### Backward Compatibility

- Existing APIs remain functional
- Old position values are migrated automatically
- Frontend can still use legacy stores if needed

### Future Enhancements

- Multi-select drag and drop
- Keyboard shortcuts for reordering
- Undo/redo for position changes
- Custom sorting (alphabetical, by creation date, etc.)
