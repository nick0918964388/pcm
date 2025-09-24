/**
 * API 基礎設定和通用函數
 */

// API 基礎設定
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// 通用 API 配置
const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * 通用 API 請求函數
 */
export const api = {
  get: async <T>(url: string): Promise<T> => {
    // 模擬 API 請求
    console.log(`API GET: ${API_CONFIG.baseURL}${url}`);

    // 返回模擬響應
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({} as T);
      }, 300);
    });
  },

  post: async <T>(url: string, data?: any): Promise<T> => {
    // 模擬 API 請求
    console.log(`API POST: ${API_CONFIG.baseURL}${url}`, data);

    // 返回模擬響應
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({} as T);
      }, 300);
    });
  },

  put: async <T>(url: string, data?: any): Promise<T> => {
    // 模擬 API 請求
    console.log(`API PUT: ${API_CONFIG.baseURL}${url}`, data);

    // 返回模擬響應
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({} as T);
      }, 300);
    });
  },

  delete: async <T>(url: string): Promise<T> => {
    // 模擬 API 請求
    console.log(`API DELETE: ${API_CONFIG.baseURL}${url}`);

    // 返回模擬響應
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({} as T);
      }, 300);
    });
  },
};

export default api;
