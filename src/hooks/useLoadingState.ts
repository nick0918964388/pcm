import { useState, useEffect, useCallback } from 'react';

interface LoadingStateOptions {
  /** 最小載入時間（毫秒），防止載入狀態閃爍 */
  minDuration?: number;
  /** 初始載入狀態 */
  initialLoading?: boolean;
}

interface LoadingState {
  /** 是否正在載入 */
  isLoading: boolean;
  /** 設置載入狀態 */
  setLoading: (loading: boolean) => void;
  /** 開始載入 */
  startLoading: () => void;
  /** 結束載入 */
  stopLoading: () => void;
  /** 執行帶載入狀態的異步操作 */
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>;
}

/**
 * 載入狀態管理 Hook
 *
 * 提供統一的載入狀態管理，包括最小載入時間控制
 * 用於防止載入狀態閃爍，提供更好的用戶體驗
 */
export function useLoadingState(
  options: LoadingStateOptions = {}
): LoadingState {
  const { minDuration = 300, initialLoading = false } = options;

  const [isLoading, setIsLoading] = useState(initialLoading);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  const setLoading = useCallback(
    (loading: boolean) => {
      if (loading) {
        setLoadingStartTime(Date.now());
        setIsLoading(true);
      } else {
        const now = Date.now();
        const elapsed = loadingStartTime ? now - loadingStartTime : 0;

        if (elapsed < minDuration) {
          // 確保最小載入時間
          setTimeout(() => {
            setIsLoading(false);
            setLoadingStartTime(null);
          }, minDuration - elapsed);
        } else {
          setIsLoading(false);
          setLoadingStartTime(null);
        }
      }
    },
    [minDuration, loadingStartTime]
  );

  const startLoading = useCallback(() => {
    setLoading(true);
  }, [setLoading]);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  const withLoading = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        const result = await asyncFn();
        return result;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}

/**
 * 多重載入狀態管理 Hook
 *
 * 管理多個並行的載入狀態
 */
export function useMultipleLoadingState() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading,
    }));
  }, []);

  const isLoading = useCallback(
    (key: string) => {
      return loadingStates[key] || false;
    },
    [loadingStates]
  );

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  const withLoading = useCallback(
    async <T>(key: string, asyncFn: () => Promise<T>): Promise<T> => {
      setLoading(key, true);
      try {
        const result = await asyncFn();
        return result;
      } finally {
        setLoading(key, false);
      }
    },
    [setLoading]
  );

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    withLoading,
  };
}
