/**
 * Photo Search Service
 * Task 8.2: 實作照片搜尋和篩選系統
 *
 * Features:
 * - 多條件搜尋功能（日期、標籤、上傳者等）
 * - 檔案類型和大小範圍篩選
 * - Oracle JSON metadata 欄位查詢
 * - 搜尋結果排序和分頁
 * - Oracle 全文搜尋整合
 * - 搜尋效能優化和快取
 */

import {
  PhotoSearchCriteria,
  Photo,
} from '@/lib/repositories/types/photo.types';
import crypto from 'crypto';

export interface ExtendedSearchCriteria extends PhotoSearchCriteria {
  // 檔案相關篩選
  fileExtensions?: string[];
  fileSizeRange?: {
    min: number;
    max: number;
  };

  // EXIF 和 GPS 篩選
  cameraModel?: string;
  lensModel?: string;
  gpsRadius?: {
    center: { lat: number; lng: number };
    radiusKm: number;
  };

  // 進階篩選
  customFields?: Record<string, any>;
  fullTextQuery?: string;

  // 排序和分頁
  sortBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  pagination?: {
    page: number;
    pageSize: number;
    useCursor?: boolean;
    cursor?: string;
  };
}

export interface SearchQuery {
  sql: string;
  binds: Record<string, any>;
  hints?: string[];
  estimatedRows?: number;
}

export interface SearchResult<T = Photo> {
  items: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startIndex: number;
    endIndex: number;
  };
  executionTime: number;
  queryOptimization?: {
    indexesUsed: string[];
    cacheHit: boolean;
  };
}

export interface FullTextSearchOptions {
  highlight?: boolean;
  fuzzy?: boolean;
  maxResults?: number;
  relevanceThreshold?: number;
}

export interface SearchSuggestion {
  term: string;
  count: number;
  type: 'fileName' | 'description' | 'tag' | 'exif';
  category?: string;
}

export interface SearchAnalytics {
  totalSearches: number;
  averageResponseTime: number;
  popularSearchTerms: Array<{ term: string; frequency: number }>;
  slowQueries: Array<{ query: string; avgTime: number }>;
  indexUsage: Record<string, { usage: number; effectiveness: number }>;
}

// API-friendly interfaces
export interface SearchOptions {
  query: string;
  page: number;
  limit: number;
  userId?: string;
  projectId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdvancedSearchOptions {
  filters: SearchFilters;
  page: number;
  limit: number;
  userId?: string;
  projectId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  fileType?: string;
  minSize?: number;
  maxSize?: number;
  tags?: string[];
  camera?: string;
  gpsLocation?: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export class PhotoSearchService {
  private static readonly MAX_RESULTS = 1000;
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly FULLTEXT_MIN_LENGTH = 2;

  private static queryCache = new Map<
    string,
    { data: any; timestamp: number }
  >();
  private static searchStats = new Map<string, number>();

  /**
   * 建立基礎搜尋查詢
   * Requirements: 6.4
   */
  static buildSearchQuery(criteria: ExtendedSearchCriteria): SearchQuery {
    let sql = `SELECT * FROM active_photos WHERE 1=1`;
    const binds: Record<string, any> = {};
    const hints: string[] = [];
    let paramCounter = 0;

    // 相簿篩選
    if (criteria.albumId) {
      sql += ` AND album_id = :albumId`;
      binds.albumId = criteria.albumId;
      hints.push('INDEX(p idx_photos_album_id)');
    }

    // 上傳者篩選
    if (criteria.uploadedBy) {
      sql += ` AND uploaded_by = :uploadedBy`;
      binds.uploadedBy = criteria.uploadedBy;
      hints.push('INDEX(p idx_photos_uploaded_by)');
    }

    // MIME 類型篩選
    if (criteria.mimeTypes && criteria.mimeTypes.length > 0) {
      const mimeParams = criteria.mimeTypes.map((_, index) => `:mime${index}`);
      sql += ` AND mime_type IN (${mimeParams.join(', ')})`;
      criteria.mimeTypes.forEach((mimeType, index) => {
        binds[`mime${index}`] = mimeType;
      });
      hints.push('INDEX(p idx_photos_mime_type)');
    }

    // 檔案擴展名篩選
    if (criteria.fileExtensions && criteria.fileExtensions.length > 0) {
      const extConditions = criteria.fileExtensions.map((_, index) => {
        paramCounter++;
        const param = `ext${paramCounter}`;
        binds[param] = criteria.fileExtensions![index].toLowerCase();
        return `LOWER(SUBSTR(file_name, -LENGTH(:${param}))) = :${param}`;
      });
      sql += ` AND (${extConditions.join(' OR ')})`;
    }

    // 檔案大小範圍篩選
    if (criteria.fileSizeRange) {
      if (criteria.fileSizeRange.min > 0) {
        sql += ` AND file_size >= :minSize`;
        binds.minSize = criteria.fileSizeRange.min;
      }
      if (criteria.fileSizeRange.max > 0) {
        sql += ` AND file_size <= :maxSize`;
        binds.maxSize = criteria.fileSizeRange.max;
      }
      hints.push('INDEX(p idx_photos_file_size)');
    }

    // 日期範圍篩選
    if (criteria.dateRange) {
      sql += ` AND uploaded_at BETWEEN :startDate AND :endDate`;
      binds.startDate = criteria.dateRange.start;
      binds.endDate = criteria.dateRange.end;
      hints.push('INDEX(p idx_photos_uploaded_at)');
    }

    // 標籤篩選 (Oracle JSON)
    if (criteria.tags && criteria.tags.length > 0) {
      const tagConditions = criteria.tags.map((_, index) => {
        const param = `tag${index}`;
        binds[param] = criteria.tags![index];
        return `JSON_EXISTS(metadata, '$.tags[*]' PASSING :${param} AS "tag" COLUMNS (value VARCHAR2(255) PATH '$') ERROR ON ERROR NULL ON EMPTY)`;
      });
      sql += ` AND (${tagConditions.join(' AND ')})`;
      hints.push('INDEX(p idx_photos_metadata_tags)');
    }

    // GPS 篩選
    if (criteria.hasGPS !== undefined) {
      if (criteria.hasGPS) {
        sql += ` AND JSON_EXISTS(metadata, '$.gps.latitude') AND JSON_EXISTS(metadata, '$.gps.longitude')`;
      } else {
        sql += ` AND (NOT JSON_EXISTS(metadata, '$.gps.latitude') OR NOT JSON_EXISTS(metadata, '$.gps.longitude'))`;
      }
    }

    // GPS 半徑篩選
    if (criteria.gpsRadius) {
      const { center, radiusKm } = criteria.gpsRadius;
      sql += ` AND ACOS(
        SIN(RADIANS(JSON_VALUE(metadata, '$.gps.latitude'))) * SIN(RADIANS(:centerLat)) +
        COS(RADIANS(JSON_VALUE(metadata, '$.gps.latitude'))) * COS(RADIANS(:centerLat)) *
        COS(RADIANS(JSON_VALUE(metadata, '$.gps.longitude')) - RADIANS(:centerLng))
      ) * 6371 <= :radiusKm`;
      binds.centerLat = center.lat;
      binds.centerLng = center.lng;
      binds.radiusKm = radiusKm;
    }

    // 相機型號篩選
    if (criteria.cameraModel) {
      sql += ` AND JSON_VALUE(metadata, '$.exif.camera') LIKE :cameraModel`;
      binds.cameraModel = `%${criteria.cameraModel}%`;
    }

    // 鏡頭型號篩選
    if (criteria.lensModel) {
      sql += ` AND JSON_VALUE(metadata, '$.exif.lens') LIKE :lensModel`;
      binds.lensModel = `%${criteria.lensModel}%`;
    }

    return {
      sql,
      binds,
      hints,
      estimatedRows: this.estimateResultCount(criteria),
    };
  }

  /**
   * 建立排序條件
   */
  static buildSortCriteria(
    sortBy?: Array<{ field: string; direction: 'asc' | 'desc' }>
  ): string {
    if (!sortBy || sortBy.length === 0) {
      return 'ORDER BY uploaded_at DESC'; // 預設排序
    }

    const validFields = [
      'uploadedAt',
      'fileName',
      'fileSize',
      'mimeType',
      'width',
      'height',
    ];
    const sortClauses: string[] = [];

    for (const sort of sortBy) {
      if (validFields.includes(sort.field)) {
        const dbField = this.mapFieldToColumn(sort.field);
        sortClauses.push(`${dbField} ${sort.direction.toUpperCase()}`);
      }
    }

    return sortClauses.length > 0
      ? `ORDER BY ${sortClauses.join(', ')}`
      : 'ORDER BY uploaded_at DESC';
  }

  /**
   * 建立分頁參數
   */
  static buildPaginationParams(
    pagination?: ExtendedSearchCriteria['pagination']
  ): {
    sql: string;
    binds: Record<string, any>;
    totalCount?: number;
    useCursor?: boolean;
  } {
    if (!pagination) {
      return {
        sql: `FETCH FIRST ${this.DEFAULT_PAGE_SIZE} ROWS ONLY`,
        binds: {},
      };
    }

    const { page, pageSize, useCursor, cursor } = pagination;
    const safePageSize = Math.min(
      pageSize || this.DEFAULT_PAGE_SIZE,
      this.MAX_RESULTS
    );

    if (useCursor && cursor) {
      // 基於游標的分頁（適用於大數據集）
      return {
        sql: `AND id > :cursor FETCH FIRST :pageSize ROWS ONLY`,
        binds: { cursor, pageSize: safePageSize },
        useCursor: true,
      };
    } else {
      // 基於偏移的分頁
      const offset = ((page || 1) - 1) * safePageSize;
      return {
        sql: `OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
        binds: { offset, pageSize: safePageSize },
      };
    }
  }

  /**
   * 執行進階搜尋
   */
  static async executeAdvancedSearch(
    criteria: ExtendedSearchCriteria,
    options: { useCache?: boolean; timeout?: number } = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();

    // 生成查詢快取鍵
    const cacheKey = this.generateCacheKey(criteria);

    // 檢查快取
    if (options.useCache !== false) {
      const cached = this.getCachedResults(cacheKey);
      if (cached) {
        return {
          ...cached,
          queryOptimization: { ...cached.queryOptimization, cacheHit: true },
        };
      }
    }

    try {
      // 建立查詢
      const baseQuery = this.buildSearchQuery(criteria);
      const sortClause = this.buildSortCriteria(criteria.sortBy);
      const paginationParams = this.buildPaginationParams(criteria.pagination);

      // 組合完整查詢
      let fullSql = baseQuery.sql;

      // 添加 Oracle 提示
      if (baseQuery.hints && baseQuery.hints.length > 0) {
        fullSql = `SELECT /*+ ${baseQuery.hints.join(' ')} */ * FROM (${baseQuery.sql}) p`;
      }

      fullSql += ` ${sortClause} ${paginationParams.sql}`;

      const finalBinds = { ...baseQuery.binds, ...paginationParams.binds };

      // TODO: 執行實際的 Oracle 查詢
      // const results = await oracleConnection.execute(fullSql, finalBinds)

      // Mock 結果（在實際實作中會被替換）
      const mockResults: Photo[] = [];
      const totalItems = baseQuery.estimatedRows || 0;

      const pagination = this.calculatePagination(
        totalItems,
        criteria.pagination?.page || 1,
        criteria.pagination?.pageSize || this.DEFAULT_PAGE_SIZE
      );

      const result: SearchResult = {
        items: mockResults,
        pagination,
        executionTime: Date.now() - startTime,
        queryOptimization: {
          indexesUsed: baseQuery.hints || [],
          cacheHit: false,
        },
      };

      // 快取結果
      if (options.useCache !== false) {
        this.setCachedResults(cacheKey, result);
      }

      // 記錄搜尋統計
      this.recordSearchStats(cacheKey, result.executionTime);

      return result;
    } catch (error) {
      console.error('進階搜尋執行失敗:', error);
      throw new Error(
        `搜尋執行失敗: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 執行全文搜尋
   * Requirements: 6.4 - Oracle 全文搜尋功能
   */
  static async executeFullTextSearch(
    query: string,
    options: FullTextSearchOptions = {}
  ): Promise<Photo[]> {
    if (!query || query.length < this.FULLTEXT_MIN_LENGTH) {
      return [];
    }

    const {
      highlight = false,
      fuzzy = false,
      maxResults = 50,
      relevanceThreshold = 0.1,
    } = options;

    try {
      // 清理搜尋詞
      const cleanedQuery = this.sanitizeSearchQuery(query);

      // 建立全文搜尋 SQL
      let sql = `
        SELECT p.*,
               SCORE(1) as relevance_score
        FROM active_photos p
        WHERE CONTAINS(p.search_text, :searchQuery, 1) > :threshold
      `;

      const binds: Record<string, any> = {
        threshold: relevanceThreshold,
      };

      if (fuzzy) {
        // 使用 Oracle 的模糊匹配
        binds.searchQuery = `FUZZY(${cleanedQuery})`;
      } else {
        binds.searchQuery = cleanedQuery;
      }

      sql += ` ORDER BY SCORE(1) DESC FETCH FIRST :maxResults ROWS ONLY`;
      binds.maxResults = maxResults;

      // TODO: 執行實際的 Oracle 全文搜尋
      // const results = await oracleConnection.execute(sql, binds)

      // Mock 結果
      const mockResults: Photo[] = [];

      // 如果需要高亮，處理結果
      if (highlight) {
        return this.highlightSearchResults(mockResults, cleanedQuery);
      }

      return mockResults;
    } catch (error) {
      console.error('全文搜尋失敗:', error);
      throw new Error(
        `全文搜尋失敗: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 取得搜尋建議
   */
  static async getSuggestions(
    partialTerm: string,
    maxSuggestions: number = 10
  ): Promise<SearchSuggestion[]> {
    if (!partialTerm || partialTerm.length < 1) {
      return [];
    }

    try {
      const suggestions: SearchSuggestion[] = [];

      // 從檔名中取得建議
      const fileNameSuggestions = await this.getSuggestionsFromField(
        'file_name',
        partialTerm,
        'fileName',
        Math.floor(maxSuggestions * 0.3)
      );
      suggestions.push(...fileNameSuggestions);

      // 從標籤中取得建議
      const tagSuggestions = await this.getSuggestionsFromTags(
        partialTerm,
        Math.floor(maxSuggestions * 0.4)
      );
      suggestions.push(...tagSuggestions);

      // 從描述中取得建議
      const descriptionSuggestions = await this.getSuggestionsFromField(
        "JSON_VALUE(metadata, '$.description')",
        partialTerm,
        'description',
        Math.floor(maxSuggestions * 0.3)
      );
      suggestions.push(...descriptionSuggestions);

      // 按照計數排序並限制結果數量
      return suggestions
        .sort((a, b) => b.count - a.count)
        .slice(0, maxSuggestions);
    } catch (error) {
      console.error('取得搜尋建議失敗:', error);
      return [];
    }
  }

  /**
   * 取得搜尋分析
   */
  static async getSearchAnalytics(): Promise<SearchAnalytics> {
    const now = Date.now();
    const analytics: SearchAnalytics = {
      totalSearches: this.searchStats.size,
      averageResponseTime: 0,
      popularSearchTerms: [],
      slowQueries: [],
      indexUsage: {},
    };

    // 計算平均回應時間
    if (this.searchStats.size > 0) {
      const totalTime = Array.from(this.searchStats.values()).reduce(
        (sum, time) => sum + time,
        0
      );
      analytics.averageResponseTime = Math.round(
        totalTime / this.searchStats.size
      );
    }

    // 取得熱門搜尋詞（從快取鍵中提取）
    const termFrequency = new Map<string, number>();
    for (const cacheKey of this.queryCache.keys()) {
      try {
        const decoded = Buffer.from(
          cacheKey.split('_')[0],
          'base64'
        ).toString();
        const criteria = JSON.parse(decoded);

        // 提取可能的搜尋詞
        if (criteria.fullTextQuery) {
          termFrequency.set(
            criteria.fullTextQuery,
            (termFrequency.get(criteria.fullTextQuery) || 0) + 1
          );
        }
        if (criteria.tags) {
          criteria.tags.forEach((tag: string) => {
            termFrequency.set(tag, (termFrequency.get(tag) || 0) + 1);
          });
        }
      } catch (error) {
        // 忽略解析錯誤
      }
    }

    analytics.popularSearchTerms = Array.from(termFrequency.entries())
      .map(([term, frequency]) => ({ term, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return analytics;
  }

  /**
   * API 包裝方法 - 為 API 端點提供簡化的介面
   */
  static async search(options: SearchOptions): Promise<{
    photos: Photo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    searchInfo: {
      query: string;
      executionTime: number;
      cacheHit: boolean;
    };
  }> {
    const { query, page, limit, userId, projectId, sortBy, sortOrder } =
      options;

    // 轉換為 ExtendedSearchCriteria
    const criteria: ExtendedSearchCriteria = {
      fullTextQuery: query,
      pagination: {
        page,
        pageSize: limit,
      },
    };

    // 添加使用者和專案篩選
    if (userId) criteria.uploadedBy = userId;
    if (projectId) {
      // 注意：這裡需要將 projectId 轉換為對應的 albumId
      // 在實際實作中可能需要查詢 project -> albums 的關係
    }

    // 添加排序
    if (sortBy) {
      criteria.sortBy = [
        {
          field: sortBy,
          direction: sortOrder || 'desc',
        },
      ];
    }

    const startTime = Date.now();
    const result = await this.executeAdvancedSearch(criteria, {
      useCache: true,
    });
    const executionTime = Date.now() - startTime;

    return {
      photos: result.results,
      pagination: {
        page: result.pagination.currentPage,
        limit: result.pagination.pageSize,
        total: result.pagination.totalItems,
        totalPages: Math.ceil(
          result.pagination.totalItems / result.pagination.pageSize
        ),
      },
      searchInfo: {
        query,
        executionTime,
        cacheHit: result.queryOptimization?.cacheHit || false,
      },
    };
  }

  static async advancedSearch(options: AdvancedSearchOptions): Promise<{
    photos: Photo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    searchInfo: {
      query: string;
      executionTime: number;
      cacheHit: boolean;
    };
  }> {
    const { filters, page, limit, userId, projectId, sortBy, sortOrder } =
      options;

    // 轉換為 ExtendedSearchCriteria
    const criteria: ExtendedSearchCriteria = {
      pagination: {
        page,
        pageSize: limit,
      },
    };

    // 轉換日期篩選
    if (filters.dateFrom || filters.dateTo) {
      criteria.dateRange = {
        start: filters.dateFrom || '1900-01-01T00:00:00.000Z',
        end: filters.dateTo || '2099-12-31T23:59:59.999Z',
      };
    }

    // 轉換檔案類型篩選
    if (filters.fileType) {
      criteria.mimeTypes = [
        filters.fileType.startsWith('image/')
          ? filters.fileType
          : `image/${filters.fileType}`,
      ];
    }

    // 轉換檔案大小篩選
    if (filters.minSize || filters.maxSize) {
      criteria.fileSizeRange = {
        min: filters.minSize || 0,
        max: filters.maxSize || Number.MAX_SAFE_INTEGER,
      };
    }

    // 轉換標籤篩選
    if (filters.tags && filters.tags.length > 0) {
      criteria.tags = filters.tags;
    }

    // 轉換相機篩選
    if (filters.camera) {
      criteria.cameraModel = filters.camera;
    }

    // 轉換 GPS 篩選
    if (filters.gpsLocation) {
      criteria.gpsRadius = {
        center: {
          lat: filters.gpsLocation.lat,
          lng: filters.gpsLocation.lng,
        },
        radiusKm: filters.gpsLocation.radius / 1000, // 轉換米為公里
      };
    }

    // 添加使用者和專案篩選
    if (userId) criteria.uploadedBy = userId;
    if (projectId) {
      // 注意：這裡需要將 projectId 轉換為對應的 albumId
      // 在實際實作中可能需要查詢 project -> albums 的關係
    }

    // 添加排序
    if (sortBy) {
      criteria.sortBy = [
        {
          field: sortBy,
          direction: sortOrder || 'desc',
        },
      ];
    }

    const startTime = Date.now();
    const result = await this.executeAdvancedSearch(criteria, {
      useCache: true,
    });
    const executionTime = Date.now() - startTime;

    return {
      photos: result.results,
      pagination: {
        page: result.pagination.currentPage,
        limit: result.pagination.pageSize,
        total: result.pagination.totalItems,
        totalPages: Math.ceil(
          result.pagination.totalItems / result.pagination.pageSize
        ),
      },
      searchInfo: {
        query: '',
        executionTime,
        cacheHit: result.queryOptimization?.cacheHit || false,
      },
    };
  }

  /**
   * 私有輔助方法
   */
  private static mapFieldToColumn(field: string): string {
    const fieldMap: Record<string, string> = {
      uploadedAt: 'uploaded_at',
      fileName: 'file_name',
      fileSize: 'file_size',
      mimeType: 'mime_type',
    };
    return fieldMap[field] || field;
  }

  private static estimateResultCount(criteria: ExtendedSearchCriteria): number {
    // 簡單的結果數量估算邏輯
    let estimate = 1000; // 基準值

    if (criteria.albumId) estimate *= 0.1;
    if (criteria.uploadedBy) estimate *= 0.2;
    if (criteria.mimeTypes) estimate *= 0.5;
    if (criteria.tags) estimate *= 0.3;
    if (criteria.dateRange) estimate *= 0.4;

    return Math.max(Math.floor(estimate), 1);
  }

  private static generateCacheKey(criteria: ExtendedSearchCriteria): string {
    const key = JSON.stringify(criteria, Object.keys(criteria).sort());
    return crypto.createHash('md5').update(key).digest('hex');
  }

  private static getCachedResults(cacheKey: string): SearchResult | null {
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      this.queryCache.delete(cacheKey); // 清除過期快取
    }
    return null;
  }

  private static setCachedResults(
    cacheKey: string,
    result: SearchResult
  ): void {
    // 限制快取大小
    if (this.queryCache.size >= 100) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });
  }

  private static calculatePagination(
    totalItems: number,
    currentPage: number,
    pageSize: number
  ): SearchResult['pagination'] {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalItems);

    return {
      totalItems,
      totalPages,
      currentPage,
      pageSize,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      startIndex,
      endIndex,
    };
  }

  private static recordSearchStats(
    queryKey: string,
    executionTime: number
  ): void {
    this.searchStats.set(queryKey, executionTime);

    // 限制統計資料大小
    if (this.searchStats.size > 1000) {
      const oldestKey = this.searchStats.keys().next().value;
      this.searchStats.delete(oldestKey);
    }
  }

  private static sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      .replace(/[<>]/g, '') // 移除可能的 HTML 標籤
      .replace(/[;'"]/g, '') // 移除可能的 SQL 注入字符
      .substring(0, 255); // 限制長度
  }

  private static highlightSearchResults(
    results: Photo[],
    searchTerm: string
  ): Photo[] {
    const regex = new RegExp(`(${searchTerm})`, 'gi');

    return results.map(photo => ({
      ...photo,
      highlights: {
        fileName: photo.fileName.replace(regex, '<mark>$1</mark>'),
        description:
          photo.metadata?.description?.replace(regex, '<mark>$1</mark>') || '',
      },
    }));
  }

  private static async getSuggestionsFromField(
    fieldName: string,
    partialTerm: string,
    type: SearchSuggestion['type'],
    limit: number
  ): Promise<SearchSuggestion[]> {
    // TODO: 實作實際的資料庫查詢
    // 這裡是 Mock 實作
    return [];
  }

  private static async getSuggestionsFromTags(
    partialTerm: string,
    limit: number
  ): Promise<SearchSuggestion[]> {
    // TODO: 實作從標籤中取得建議的邏輯
    return [];
  }
}
