/**
 * @fileoverview 專案人員搜索輸入組件
 * @version 1.0
 * @date 2025-08-31
 *
 * 提供即時搜索、自動建議、搜索歷史等功能的搜索輸入組件
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Clock, Loader2 } from 'lucide-react';
import { useProjectMemberSearch } from '@/hooks/useProjectMembers';
import { SearchSuggestion } from '@/services/projectStaffWbsApi';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

export interface ProjectMemberSearchInputProps {
  /** 專案 ID */
  projectId: string;
  /** 搜索回調函數 */
  onSearch: (query: string) => void;
  /** 輸入框占位符 */
  placeholder?: string;
  /** 是否顯示清除按鈕 */
  showClearButton?: boolean;
  /** 是否顯示搜索歷史 */
  showHistory?: boolean;
  /** 搜索歷史記錄 */
  searchHistory?: string[];
  /** 最大歷史記錄數量 */
  maxHistoryItems?: number;
  /** 組件類名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自動聚焦 */
  autoFocus?: boolean;
}

// ==================== COMPONENT ====================

export const ProjectMemberSearchInput: React.FC<
  ProjectMemberSearchInputProps
> = ({
  projectId,
  onSearch,
  placeholder = '搜索專案成員...',
  showClearButton = true,
  showHistory = false,
  searchHistory = [],
  maxHistoryItems = 5,
  className,
  disabled = false,
  autoFocus = false,
}) => {
  // ===== STATES =====
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showHistoryList, setShowHistoryList] = useState(false);

  // ===== REFS =====
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ===== HOOKS =====
  const { query, suggestions, isLoading, error, search, clearSearch } =
    useProjectMemberSearch(projectId, {
      debounceMs: 300,
      minLength: 1,
    });

  // ===== EFFECTS =====
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 當有建議時顯示下拉選單
  useEffect(() => {
    setIsDropdownOpen(suggestions.length > 0 && inputValue.length > 0);
  }, [suggestions, inputValue]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setShowHistoryList(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===== HANDLERS =====
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      setShowHistoryList(false);

      if (value.length > 0) {
        search(value);
        onSearch(value);
        setSelectedIndex(-1);
      } else {
        onSearch('');
      }
    },
    [search, onSearch]
  );

  const handleInputFocus = useCallback(() => {
    if (showHistory && searchHistory.length > 0 && inputValue.length === 0) {
      setShowHistoryList(true);
    }
  }, [showHistory, searchHistory.length, inputValue.length]);

  const handleClear = useCallback(() => {
    setInputValue('');
    clearSearch();
    onSearch('');
    setIsDropdownOpen(false);
    setShowHistoryList(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, [clearSearch, onSearch]);

  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion | string) => {
      const value =
        typeof suggestion === 'string' ? suggestion : suggestion.value;
      setInputValue(value);
      onSearch(value);
      setIsDropdownOpen(false);
      setShowHistoryList(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
    },
    [onSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = showHistoryList ? searchHistory : suggestions;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            const selectedItem = items[selectedIndex];
            handleSuggestionClick(selectedItem);
          }
          break;

        case 'Escape':
          setIsDropdownOpen(false);
          setShowHistoryList(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [
      selectedIndex,
      showHistoryList,
      searchHistory,
      suggestions,
      handleSuggestionClick,
    ]
  );

  // ===== RENDER HELPERS =====
  const renderSuggestionItem = (
    suggestion: SearchSuggestion,
    index: number
  ) => (
    <div
      key={`${suggestion.type}-${suggestion.value}`}
      className={cn(
        'flex items-center px-3 py-2 cursor-pointer text-sm',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        selectedIndex === index && 'bg-gray-100 dark:bg-gray-800'
      )}
      onClick={() => handleSuggestionClick(suggestion)}
      data-testid={`suggestion-${index}`}
    >
      <div className='flex-1'>
        <div className='font-medium text-gray-900 dark:text-gray-100'>
          {suggestion.label}
        </div>
        {suggestion.type && (
          <div className='text-xs text-gray-500 dark:text-gray-400 capitalize'>
            {suggestion.type}
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryItem = (item: string, index: number) => (
    <div
      key={item}
      className={cn(
        'flex items-center px-3 py-2 cursor-pointer text-sm',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        selectedIndex === index && 'bg-gray-100 dark:bg-gray-800'
      )}
      onClick={() => handleSuggestionClick(item)}
      data-testid={`history-${index}`}
    >
      <Clock className='w-4 h-4 mr-2 text-gray-400' />
      <span className='text-gray-700 dark:text-gray-300'>{item}</span>
    </div>
  );

  // ===== RENDER =====
  return (
    <div className={cn('relative w-full', className)}>
      {/* 搜索輸入框 */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />

        <input
          ref={inputRef}
          type='text'
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'dark:bg-gray-800 dark:border-gray-600 dark:text-white',
            'dark:focus:ring-blue-400'
          )}
          aria-label='搜索專案成員'
          aria-expanded={isDropdownOpen || showHistoryList}
          aria-haspopup='listbox'
          role='combobox'
        />

        {/* 載入指示器 */}
        {isLoading && (
          <div
            className='absolute right-8 top-1/2 transform -translate-y-1/2'
            data-testid='search-loading'
          >
            <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
          </div>
        )}

        {/* 清除按鈕 */}
        {showClearButton && inputValue && !isLoading && (
          <button
            type='button'
            onClick={handleClear}
            className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
            aria-label='清除搜索'
          >
            <X className='w-4 h-4' />
          </button>
        )}
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div className='absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'>
          {error.message}
        </div>
      )}

      {/* 下拉選單 */}
      {(isDropdownOpen || showHistoryList) && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10',
            'max-h-64 overflow-y-auto',
            'dark:bg-gray-800 dark:border-gray-600'
          )}
          role='listbox'
        >
          {/* 搜索歷史 */}
          {showHistoryList && searchHistory.length > 0 && (
            <>
              <div className='px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700'>
                最近搜索
              </div>
              {searchHistory
                .slice(0, maxHistoryItems)
                .map((item, index) => renderHistoryItem(item, index))}
            </>
          )}

          {/* 搜索建議 */}
          {isDropdownOpen && suggestions.length > 0 && (
            <>
              {showHistoryList && searchHistory.length > 0 && (
                <div className='border-t border-gray-200 dark:border-gray-700' />
              )}
              {suggestions.map((suggestion, index) =>
                renderSuggestionItem(suggestion, index)
              )}
            </>
          )}

          {/* 無結果提示 */}
          {isDropdownOpen &&
            suggestions.length === 0 &&
            inputValue &&
            !isLoading && (
              <div className='px-3 py-4 text-sm text-gray-500 text-center dark:text-gray-400'>
                沒有找到相關結果
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default ProjectMemberSearchInput;
