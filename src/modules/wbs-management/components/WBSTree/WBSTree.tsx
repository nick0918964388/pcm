/**
 * @fileoverview WBS 樹狀結構主組件
 * @version 1.0
 * @date 2025-09-01
 *
 * 提供 WBS 樹狀結構的主要顯示組件，支援虛擬化渲染、展開/摺疊、拖拽等功能
 */

'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { WBSItem, WBSFilters } from '@/types/wbs';
import { WBSNode } from './WBSNode';
import { WBSToolbar } from './WBSToolbar';
import { WBSNodeContent } from './WBSNodeContent';
import { flattenWBSTree, FlatWBSNode } from '@/utils/wbsUtils';
import { useWBSTreeManager } from '@/hooks/useWBSTree';
import { useWBSDragDrop } from '@/hooks/useWBSOperations';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, Search } from 'lucide-react';

// ==================== TYPES ====================

export interface WBSTreeProps {
  /** 專案 ID */
  projectId: string;
  /** WBS 樹狀資料 */
  tree?: WBSItem[];
  /** 篩選條件 */
  filters?: WBSFilters;
  /** 篩選變更回調 */
  onFiltersChange?: (filters: WBSFilters) => void;
  /** 節點選擇回調 */
  onNodeSelect?: (nodeId: string, selected: boolean) => void;
  /** 節點編輯回調 */
  onNodeEdit?: (node: WBSItem) => void;
  /** 節點刪除回調 */
  onNodeDelete?: (node: WBSItem) => void;
  /** 節點新增回調 */
  onNodeAdd?: (parentId?: string) => void;
  /** 是否啟用虛擬化 */
  virtualized?: boolean;
  /** 虛擬化高度 */
  height?: number;
  /** 節點高度 */
  itemHeight?: number;
  /** 是否啟用拖拽 */
  draggable?: boolean;
  /** 是否唯讀 */
  readonly?: boolean;
  /** 是否顯示搜索框 */
  showSearch?: boolean;
  /** 是否顯示工具列 */
  showToolbar?: boolean;
  /** 組件類名 */
  className?: string;
  /** 測試 ID */
  testId?: string;
}

/**
 * 樹節點項目類型（用於虛擬化）
 */
interface TreeItemData {
  items: FlatWBSNode[];
  expandedNodes: Set<string>;
  selectedNodes: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onSelectNode: (nodeId: string, multiSelect?: boolean) => void;
  onNodeEdit?: (node: WBSItem) => void;
  onNodeDelete?: (node: WBSItem) => void;
  onNodeAdd?: (parentId?: string) => void;
  draggable: boolean;
  readonly: boolean;
  dragState: any;
  onDragStart: (nodeId: string) => void;
  onDragEnter: (nodeId: string) => void;
  onDragOver: (nodeId: string, position: string) => void;
  onDragLeave: () => void;
  onDrop: (targetId: string, position: string) => void;
}

// ==================== COMPONENT ====================

export const WBSTree: React.FC<WBSTreeProps> = ({
  projectId,
  tree: propTree,
  filters,
  onFiltersChange,
  onNodeSelect,
  onNodeEdit,
  onNodeDelete,
  onNodeAdd,
  virtualized = false,
  height = 600,
  itemHeight = 48,
  draggable = true,
  readonly = false,
  showSearch = true,
  showToolbar = true,
  className,
  testId = 'wbs-tree',
}) => {
  // ===== STATES =====
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTree, setFilteredTree] = useState<WBSItem[]>([]);

  // ===== HOOKS =====
  const {
    treeData,
    expandedNodes,
    selectedNodes,
    dragState,
    viewState,
    loading,
    error,
    toggleNode,
    selectNode,
    setViewMode,
    toggleShowCompleted,
    toggleFilterPanel,
  } = useWBSTreeManager(projectId);

  const {
    dragState: dragDropState,
    startDrag,
    dragEnter,
    dragOver,
    dragLeave,
    drop,
    cancelDrag,
  } = useWBSDragDrop(projectId);

  // ===== COMPUTED VALUES =====
  const currentTree = propTree || treeData;

  // 扁平化樹狀結構用於虛擬化
  const flattenedItems = useMemo(() => {
    return flattenWBSTree(
      filteredTree.length > 0 ? filteredTree : currentTree
    ).filter(item => {
      // 只顯示展開節點的子項目
      if (item.level > 0) {
        const parentPath = item.path.slice(0, -1);
        return parentPath.every(nodeId => expandedNodes.has(nodeId));
      }
      return true;
    });
  }, [currentTree, filteredTree, expandedNodes]);

  // ===== EFFECTS =====
  // 搜索過濾
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTree([]);
      return;
    }

    const filterNodes = (nodes: WBSItem[]): WBSItem[] => {
      const results: WBSItem[] = [];

      for (const node of nodes) {
        const matchesSearch =
          node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.code?.toLowerCase().includes(searchQuery.toLowerCase());

        const filteredChildren = node.children
          ? filterNodes(node.children)
          : [];

        if (matchesSearch || filteredChildren.length > 0) {
          results.push({
            ...node,
            children: filteredChildren,
          });
        }
      }

      return results;
    };

    const filtered = filterNodes(currentTree);
    setFilteredTree(filtered);
  }, [searchQuery, currentTree]);

  // ===== HANDLERS =====
  const handleNodeToggle = useCallback(
    (nodeId: string) => {
      toggleNode(nodeId);
    },
    [toggleNode]
  );

  const handleNodeSelect = useCallback(
    (nodeId: string, multiSelect = false) => {
      selectNode(nodeId, multiSelect);
      onNodeSelect?.(nodeId, !selectedNodes.has(nodeId));
    },
    [selectNode, selectedNodes, onNodeSelect]
  );

  const handleDragStart = useCallback(
    (nodeId: string) => {
      if (!draggable || readonly) return;
      startDrag(nodeId);
    },
    [draggable, readonly, startDrag]
  );

  const handleDragEnter = useCallback(
    (nodeId: string) => {
      if (!draggable || readonly) return;
      dragEnter(nodeId);
    },
    [draggable, readonly, dragEnter]
  );

  const handleDragOver = useCallback(
    (nodeId: string, position: 'before' | 'after' | 'inside') => {
      if (!draggable || readonly) return;
      dragOver(nodeId, position);
    },
    [draggable, readonly, dragOver]
  );

  const handleDragLeave = useCallback(() => {
    if (!draggable || readonly) return;
    dragLeave();
  }, [draggable, readonly, dragLeave]);

  const handleDrop = useCallback(
    async (targetId: string, position: 'before' | 'after' | 'inside') => {
      if (!draggable || readonly) return;
      await drop(targetId, position);
    },
    [draggable, readonly, drop]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // ===== RENDER HELPERS =====
  const VirtualizedTreeItem = ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: TreeItemData;
  }) => {
    const item = data.items[index];
    if (!item) return null;

    return (
      <div style={style}>
        <WBSNode
          node={item}
          level={item.level}
          expanded={data.expandedNodes.has(item.id)}
          selected={data.selectedNodes.has(item.id)}
          onToggle={() => data.onToggleExpand(item.id)}
          onSelect={selected => data.onSelectNode(item.id, false)}
          onEdit={data.onNodeEdit}
          onDelete={data.onNodeDelete}
          onAdd={data.onNodeAdd}
          draggable={data.draggable}
          readonly={data.readonly}
          dragState={data.dragState}
          onDragStart={data.onDragStart}
          onDragEnter={data.onDragEnter}
          onDragOver={data.onDragOver}
          onDragLeave={data.onDragLeave}
          onDrop={data.onDrop}
        />
      </div>
    );
  };

  const RegularTreeNodes = () => (
    <div className='space-y-1'>
      {flattenedItems.map(item => (
        <WBSNode
          key={item.id}
          node={item}
          level={item.level}
          expanded={expandedNodes.has(item.id)}
          selected={selectedNodes.has(item.id)}
          onToggle={() => handleNodeToggle(item.id)}
          onSelect={selected => handleNodeSelect(item.id, false)}
          onEdit={onNodeEdit}
          onDelete={onNodeDelete}
          onAdd={onNodeAdd}
          draggable={draggable}
          readonly={readonly}
          dragState={dragDropState}
          onDragStart={handleDragStart}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );

  // ===== RENDER =====
  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center p-8 text-red-500',
          className
        )}
        data-testid={`${testId}-error`}
      >
        <AlertCircle className='w-6 h-6 mr-2' />
        <span>載入 WBS 資料時發生錯誤: {error}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white dark:bg-gray-800',
        className
      )}
      data-testid={testId}
    >
      {/* 工具列 */}
      {showToolbar && (
        <WBSToolbar
          onAddRoot={() => onNodeAdd?.()}
          onExpandAll={() => {
            // 展開所有節點
            const allNodeIds = flattenWBSTree(currentTree).map(node => node.id);
            allNodeIds.forEach(nodeId => {
              if (!expandedNodes.has(nodeId)) {
                toggleNode(nodeId);
              }
            });
          }}
          onCollapseAll={() => {
            // 摺疊所有節點
            expandedNodes.forEach(nodeId => toggleNode(nodeId));
          }}
          onToggleCompleted={() => toggleShowCompleted()}
          onToggleFilters={() => toggleFilterPanel()}
          showCompleted={viewState.showCompleted}
          filtersOpen={viewState.filterPanelOpen}
        />
      )}

      {/* 搜索框 */}
      {showSearch && (
        <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder='搜索 WBS 節點...'
              className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                aria-label='清除搜索'
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* 樹狀結構容器 */}
      <div className='flex-1 overflow-hidden'>
        {loading ? (
          <div
            className='flex items-center justify-center h-full'
            data-testid={`${testId}-loading`}
          >
            <Loader2 className='w-6 h-6 animate-spin mr-2 text-blue-600' />
            <span className='text-gray-600 dark:text-gray-400'>
              載入 WBS 資料中...
            </span>
          </div>
        ) : flattenedItems.length === 0 ? (
          <div
            className='flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400'
            data-testid={`${testId}-empty`}
          >
            <div className='text-6xl mb-4'>📋</div>
            <h3 className='text-lg font-medium mb-2'>
              {searchQuery ? '沒有找到相關節點' : '暫無 WBS 資料'}
            </h3>
            <p className='text-sm text-center max-w-md'>
              {searchQuery
                ? '請嘗試使用不同的搜索關鍵詞，或清除搜索條件查看所有節點。'
                : '點擊上方的「新增」按鈕開始建立您的工作分解結構。'}
            </p>
          </div>
        ) : (
          <div className='h-full overflow-auto p-4'>
            {virtualized ? (
              <List
                height={height}
                itemCount={flattenedItems.length}
                itemSize={itemHeight}
                itemData={
                  {
                    items: flattenedItems,
                    expandedNodes,
                    selectedNodes,
                    onToggleExpand: handleNodeToggle,
                    onSelectNode: handleNodeSelect,
                    onNodeEdit,
                    onNodeDelete,
                    onNodeAdd,
                    draggable,
                    readonly,
                    dragState: dragDropState,
                    onDragStart: handleDragStart,
                    onDragEnter: handleDragEnter,
                    onDragOver: handleDragOver,
                    onDragLeave: handleDragLeave,
                    onDrop: handleDrop,
                  } as TreeItemData
                }
              >
                {VirtualizedTreeItem}
              </List>
            ) : (
              <RegularTreeNodes />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WBSTree;
