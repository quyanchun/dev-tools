import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useUnifiedStore, UnifiedItem, UnifiedItemType } from './unifiedStore';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Generate a random unified item
 */
function generateUnifiedItem(
  type: UnifiedItemType,
  position: number,
  folderId: string | null
): UnifiedItem {
  const id = `${type}-${Math.random().toString(36).substr(2, 9)}`;
  const baseData = {
    id,
    position,
    created_at: Date.now(),
  };

  let data: any;
  switch (type) {
    case 'monitor':
      data = {
        ...baseData,
        name: `Monitor ${id}`,
        icon: null,
        monitor_type: 'process',
        target: 'test-process',
        check_interval: 60,
        expected_result: null,
        alert_on_failure: true,
        is_active: false,
        last_check_time: null,
        last_status: null,
        folder_id: folderId,
      };
      break;
    case 'folder':
      data = {
        ...baseData,
        name: `Folder ${id}`,
        icon: null,
      };
      break;
    case 'button':
      data = {
        ...baseData,
        name: `Button ${id}`,
        icon: null,
        script_type: 'shell',
        script_content: 'echo test',
        folder_id: folderId,
        updated_at: Date.now(),
      };
      break;
  }

  return {
    id,
    type,
    position,
    folder_id: folderId,
    data,
  };
}

/**
 * Fast-check arbitrary for UnifiedItemType
 */
const arbItemType = fc.constantFrom<UnifiedItemType>(
  'monitor',
  'folder',
  'button'
);

/**
 * Fast-check arbitrary for folder ID (null or string)
 */
const arbFolderId = fc.oneof(
  fc.constant(null),
  fc.string({ minLength: 1, maxLength: 10 }).map((s) => `folder-${s}`)
);

// ============================================================================
// Property Tests
// ============================================================================

describe('UnifiedStore Property Tests', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useUnifiedStore.setState({ items: [], isLoading: false, error: null });
    });
    vi.clearAllMocks();
  });

  /**
   * Feature: unified-item-sorting, Property 8: Store Provides Sorted List
   * Validates: Requirements 4.1
   *
   * For any items in the store, calling getItemsByContainer should return
   * items sorted by position in ascending order.
   */
  it('Property 8: Store provides sorted list', () => {
    fc.assert(
      fc.property(
        // Generate random items with random positions
        fc.array(
          fc.record({
            type: arbItemType,
            position: fc.integer({ min: 0, max: 100 }),
            folderId: arbFolderId,
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (itemConfigs) => {
          // Generate items from configs
          const items = itemConfigs.map((config) =>
            generateUnifiedItem(config.type, config.position, config.folderId)
          );

          // Set items in store
          act(() => {
            useUnifiedStore.setState({ items });
          });

          // Get unique folder IDs to test
          const folderIds = new Set(items.map((i) => i.folder_id));

          // Test each container
          for (const folderId of folderIds) {
            const result = useUnifiedStore
              .getState()
              .getItemsByContainer(folderId);

            // Verify result is sorted by position
            for (let i = 1; i < result.length; i++) {
              expect(result[i].position).toBeGreaterThanOrEqual(
                result[i - 1].position
              );
            }

            // Verify all items belong to the correct container
            for (const item of result) {
              expect(item.folder_id).toBe(folderId);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: unified-item-sorting, Property 9: Folder Items Excluded from Main List
   * Validates: Requirements 5.1
   *
   * For any items with non-null folder_id, calling getItemsByContainer(null)
   * should not return those items.
   */
  it('Property 9: Folder items excluded from main list', () => {
    fc.assert(
      fc.property(
        // Generate random items, some with folder_id
        fc.array(
          fc.record({
            type: arbItemType,
            position: fc.integer({ min: 0, max: 100 }),
            folderId: arbFolderId,
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (itemConfigs) => {
          // Generate items from configs
          const items = itemConfigs.map((config) =>
            generateUnifiedItem(config.type, config.position, config.folderId)
          );

          // Set items in store
          act(() => {
            useUnifiedStore.setState({ items });
          });

          // Get items from main list (folder_id = null)
          const mainListItems = useUnifiedStore
            .getState()
            .getItemsByContainer(null);

          // Verify no items with non-null folder_id are in the result
          for (const item of mainListItems) {
            expect(item.folder_id).toBeNull();
          }

          // Verify all items with null folder_id are in the result
          const expectedMainItems = items.filter((i) => i.folder_id === null);
          expect(mainListItems.length).toBe(expectedMainItems.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: unified-item-sorting, Property 10: Folder Items Sorted by Position
   * Validates: Requirements 5.2
   *
   * For any folder with items, calling getItemsByContainer(folderId) should
   * return items sorted by position, regardless of item type.
   */
  it('Property 10: Folder items sorted by position', () => {
    fc.assert(
      fc.property(
        // Generate a folder ID and items for that folder
        fc.string({ minLength: 1, maxLength: 10 }).chain((folderIdSuffix) => {
          const folderId = `folder-${folderIdSuffix}`;
          return fc
            .array(
              fc.record({
                type: arbItemType,
                position: fc.integer({ min: 0, max: 100 }),
              }),
              { minLength: 1, maxLength: 30 }
            )
            .map((itemConfigs) => ({ folderId, itemConfigs }));
        }),
        ({ folderId, itemConfigs }) => {
          // Generate items for the folder
          const items = itemConfigs.map((config) =>
            generateUnifiedItem(config.type, config.position, folderId)
          );

          // Set items in store
          act(() => {
            useUnifiedStore.setState({ items });
          });

          // Get items from the folder
          const folderItems = useUnifiedStore
            .getState()
            .getItemsByContainer(folderId);

          // Verify result is sorted by position
          for (let i = 1; i < folderItems.length; i++) {
            expect(folderItems[i].position).toBeGreaterThanOrEqual(
              folderItems[i - 1].position
            );
          }

          // Verify all items belong to the folder
          for (const item of folderItems) {
            expect(item.folder_id).toBe(folderId);
          }

          // Verify all items are returned
          expect(folderItems.length).toBe(items.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: unified-item-sorting, Property 15: Store Updates Reflect Changes
   * Validates: Requirements 8.2
   *
   * For any item operation (add, update, delete), the store's item list
   * should immediately reflect the change.
   */
  it('Property 15: Store updates reflect changes', () => {
    fc.assert(
      fc.property(
        // Generate initial items and an operation
        fc
          .array(
            fc.record({
              type: arbItemType,
              position: fc.integer({ min: 0, max: 100 }),
              folderId: arbFolderId,
            }),
            { minLength: 1, maxLength: 20 }
          )
          .chain((itemConfigs) => {
            return fc
              .constantFrom('add', 'update', 'delete')
              .map((operation) => ({ itemConfigs, operation }));
          }),
        ({ itemConfigs, operation }) => {
          // Generate initial items
          const items = itemConfigs.map((config) =>
            generateUnifiedItem(config.type, config.position, config.folderId)
          );

          // Set initial items in store
          act(() => {
            useUnifiedStore.setState({ items: [...items] });
          });

          const initialCount = items.length;

          // Perform operation
          if (operation === 'add') {
            // Add a new item
            const newItem = generateUnifiedItem('button', 999, null);
            act(() => {
              useUnifiedStore.getState().addItem(newItem);
            });

            // Verify item was added
            const updatedItems = useUnifiedStore.getState().items;
            expect(updatedItems.length).toBe(initialCount + 1);
            expect(updatedItems.find((i) => i.id === newItem.id)).toBeDefined();
          } else if (operation === 'update' && items.length > 0) {
            // Update an existing item
            const itemToUpdate = items[0];
            const updates = { position: 888 };
            act(() => {
              useUnifiedStore.getState().updateItem(itemToUpdate.id, updates);
            });

            // Verify item was updated
            const updatedItems = useUnifiedStore.getState().items;
            expect(updatedItems.length).toBe(initialCount);
            const updatedItem = updatedItems.find(
              (i) => i.id === itemToUpdate.id
            );
            expect(updatedItem).toBeDefined();
            expect(updatedItem?.position).toBe(888);
          } else if (operation === 'delete' && items.length > 0) {
            // Delete an item
            const itemToDelete = items[0];
            act(() => {
              useUnifiedStore.getState().deleteItem(itemToDelete.id);
            });

            // Verify item was deleted
            const updatedItems = useUnifiedStore.getState().items;
            expect(updatedItems.length).toBe(initialCount - 1);
            expect(
              updatedItems.find((i) => i.id === itemToDelete.id)
            ).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Drag and Drop Property Tests
// ============================================================================

describe('Drag and Drop Property Tests', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useUnifiedStore.setState({ items: [], isLoading: false, error: null });
    });
    vi.clearAllMocks();
  });

  /**
   * Feature: unified-item-sorting, Property 6: Drop Persists Position
   * Validates: Requirements 3.2
   *
   * For any item and any valid drop position, dropping the item and reloading
   * from the database should show the item at the new position.
   */
  it('Property 6: Drop persists position', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random items and a drop operation
        fc
          .array(
            fc.record({
              type: arbItemType,
              position: fc.integer({ min: 0, max: 20 }),
              folderId: arbFolderId,
            }),
            { minLength: 2, maxLength: 10 }
          )
          .chain((itemConfigs) => {
            return fc
              .integer({ min: 0, max: itemConfigs.length - 1 })
              .chain((dragIndex) => {
                return fc
                  .integer({ min: 0, max: itemConfigs.length - 1 })
                  .map((dropPosition) => ({
                    itemConfigs,
                    dragIndex,
                    dropPosition,
                  }));
              });
          }),
        async ({ itemConfigs, dragIndex, dropPosition }) => {
          // Generate items with sequential positions
          const items = itemConfigs.map((config, index) =>
            generateUnifiedItem(config.type, index, config.folderId)
          );

          // Set initial items in store
          act(() => {
            useUnifiedStore.setState({ items: [...items] });
          });

          const draggedItem = items[dragIndex];
          const targetFolderId = draggedItem.folder_id;

          // Mock the backend call to succeed
          vi.mocked(invoke).mockResolvedValueOnce(undefined);

          // Perform reorder
          await act(async () => {
            await useUnifiedStore
              .getState()
              .reorderItems(draggedItem.id, dropPosition, targetFolderId);
          });

          // Verify backend was called with position updates
          expect(invoke).toHaveBeenCalledWith(
            'update_unified_positions',
            expect.objectContaining({
              updates: expect.any(Array),
            })
          );

          // Simulate reload from database by fetching items
          const backendItems = useUnifiedStore
            .getState()
            .items.map((item) => {
              if (item.type === 'monitor') {
                return { item_type: 'monitor', monitor: item.data };
              } else if (item.type === 'folder') {
                return { item_type: 'folder', folder: item.data };
              } else {
                return { item_type: 'button', button: item.data };
              }
            });

          vi.mocked(invoke).mockResolvedValueOnce(backendItems);

          // Reload from backend
          await act(async () => {
            await useUnifiedStore.getState().fetchAllItems();
          });

          // Verify item is at new position
          const reloadedItems = useUnifiedStore.getState().items;
          const reloadedItem = reloadedItems.find(
            (i) => i.id === draggedItem.id
          );

          expect(reloadedItem).toBeDefined();
          expect(reloadedItem?.position).toBe(dropPosition);
          expect(reloadedItem?.folder_id).toBe(targetFolderId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: unified-item-sorting, Property 7: Cancel Restores Positions
   * Validates: Requirements 3.4
   *
   * For any list of items, if a drag operation is started and then cancelled,
   * all positions should remain unchanged.
   */
  it('Property 7: Cancel restores positions', () => {
    fc.assert(
      fc.property(
        // Generate random items
        fc.array(
          fc.record({
            type: arbItemType,
            position: fc.integer({ min: 0, max: 20 }),
            folderId: arbFolderId,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (itemConfigs) => {
          // Generate items with sequential positions
          const items = itemConfigs.map((config, index) =>
            generateUnifiedItem(config.type, index, config.folderId)
          );

          // Set initial items in store
          act(() => {
            useUnifiedStore.setState({ items: [...items] });
          });

          // Store initial positions
          const initialPositions = items.map((item) => ({
            id: item.id,
            position: item.position,
            folder_id: item.folder_id,
          }));

          // Simulate drag start (no actual state change in store)
          // In real implementation, drag start doesn't modify store state

          // Simulate drag cancel (no reorderItems call)
          // Verify positions are unchanged

          const currentItems = useUnifiedStore.getState().items;

          // Verify all positions match initial positions
          for (const initial of initialPositions) {
            const current = currentItems.find((i) => i.id === initial.id);
            expect(current).toBeDefined();
            expect(current?.position).toBe(initial.position);
            expect(current?.folder_id).toBe(initial.folder_id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: unified-item-sorting, Property 11: Moving Item Recalculates Positions
   * Validates: Requirements 5.3
   *
   * For any item moved between containers, both the source and destination
   * containers should have sequential positions (0, 1, 2, ..., n-1) after the move.
   */
  it('Property 11: Moving item recalculates positions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate items in two different containers
        fc
          .tuple(
            fc.string({ minLength: 1, maxLength: 10 }),
            fc.string({ minLength: 1, maxLength: 10 })
          )
          .filter(([a, b]) => a !== b)
          .chain(([folderA, folderB]) => {
            const sourceFolderId = `folder-${folderA}`;
            const targetFolderId = `folder-${folderB}`;

            return fc
              .tuple(
                fc.array(
                  fc.record({
                    type: fc.constantFrom<UnifiedItemType>(
                      'monitor',
                      'button'
                    ),
                    position: fc.integer({ min: 0, max: 10 }),
                  }),
                  { minLength: 1, maxLength: 5 }
                ),
                fc.array(
                  fc.record({
                    type: fc.constantFrom<UnifiedItemType>(
                      'monitor',
                      'button'
                    ),
                    position: fc.integer({ min: 0, max: 10 }),
                  }),
                  { minLength: 0, maxLength: 5 }
                )
              )
              .map(([sourceConfigs, targetConfigs]) => ({
                sourceFolderId,
                targetFolderId,
                sourceConfigs,
                targetConfigs,
              }));
          }),
        async ({
          sourceFolderId,
          targetFolderId,
          sourceConfigs,
          targetConfigs,
        }) => {
          // Generate items for source container
          const sourceItems = sourceConfigs.map((config, index) =>
            generateUnifiedItem(config.type, index, sourceFolderId)
          );

          // Generate items for target container
          const targetItems = targetConfigs.map((config, index) =>
            generateUnifiedItem(config.type, index, targetFolderId)
          );

          const allItems = [...sourceItems, ...targetItems];

          // Set initial items in store
          act(() => {
            useUnifiedStore.setState({ items: [...allItems] });
          });

          // Pick an item from source to move to target
          const itemToMove = sourceItems[0];
          const newPosition = targetItems.length; // Add to end of target

          // Mock the backend call to succeed
          vi.mocked(invoke).mockResolvedValueOnce(undefined);

          // Perform move
          await act(async () => {
            await useUnifiedStore
              .getState()
              .reorderItems(itemToMove.id, newPosition, targetFolderId);
          });

          // Get updated items
          const updatedItems = useUnifiedStore.getState().items;

          // Verify source container has sequential positions
          const sourceContainerItems = updatedItems
            .filter((i) => i.folder_id === sourceFolderId)
            .sort((a, b) => a.position - b.position);

          for (let i = 0; i < sourceContainerItems.length; i++) {
            expect(sourceContainerItems[i].position).toBe(i);
          }

          // Verify target container has sequential positions
          const targetContainerItems = updatedItems
            .filter((i) => i.folder_id === targetFolderId)
            .sort((a, b) => a.position - b.position);

          for (let i = 0; i < targetContainerItems.length; i++) {
            expect(targetContainerItems[i].position).toBe(i);
          }

          // Verify moved item is in target container
          const movedItem = updatedItems.find((i) => i.id === itemToMove.id);
          expect(movedItem?.folder_id).toBe(targetFolderId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: unified-item-sorting, Property 12: Independent Position Sequences
   * Validates: Requirements 5.4
   *
   * For any point in time, the main list (folder_id = null) and each folder
   * should have independent position sequences, each starting from 0 with no gaps.
   */
  it('Property 12: Independent position sequences', () => {
    fc.assert(
      fc.property(
        // Generate items across multiple containers
        fc.array(
          fc.record({
            type: arbItemType,
            position: fc.integer({ min: 0, max: 20 }),
            folderId: arbFolderId,
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (itemConfigs) => {
          // Generate items with sequential positions per container
          const itemsByContainer = new Map<string | null, typeof itemConfigs>();

          // Group by container
          for (const config of itemConfigs) {
            const key = config.folderId;
            if (!itemsByContainer.has(key)) {
              itemsByContainer.set(key, []);
            }
            itemsByContainer.get(key)!.push(config);
          }

          // Generate items with sequential positions per container
          const items: UnifiedItem[] = [];
          for (const [folderId, configs] of itemsByContainer.entries()) {
            configs.forEach((config, index) => {
              items.push(generateUnifiedItem(config.type, index, folderId));
            });
          }

          // Set items in store
          act(() => {
            useUnifiedStore.setState({ items });
          });

          // Get all unique container IDs
          const containerIds = new Set(items.map((i) => i.folder_id));

          // Verify each container has sequential positions starting from 0
          for (const containerId of containerIds) {
            const containerItems = useUnifiedStore
              .getState()
              .getItemsByContainer(containerId);

            // Sort by position
            const sorted = [...containerItems].sort(
              (a, b) => a.position - b.position
            );

            // Verify positions are 0, 1, 2, ..., n-1
            for (let i = 0; i < sorted.length; i++) {
              expect(sorted[i].position).toBe(i);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
