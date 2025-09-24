/**
 * 聯絡人 API 服務
 * 處理前端與聯絡人相關的 HTTP 請求
 */

import type { VendorContact, ContactFilters } from '@/types/vendor';

export interface ContactQueryOptions {
  vendorId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  name?: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  mvpn?: string;
  supervisor?: string;
  status?: string[];
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface ContactApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats?: {
    totalContacts: number;
    activeContacts: number;
    primaryContacts: number;
    totalByDepartment: Record<string, number>;
    totalByStatus: Record<string, number>;
  };
}

export class ContactAPI {
  private static baseUrl = '/api/vendors/contacts';

  /**
   * 取得聯絡人列表
   */
  static async getContacts(
    options: ContactQueryOptions = {}
  ): Promise<ContactApiResponse<VendorContact[]>> {
    const searchParams = new URLSearchParams();

    if (options.vendorId) searchParams.set('vendor_id', options.vendorId);
    if (options.page) searchParams.set('page', options.page.toString());
    if (options.pageSize)
      searchParams.set('limit', options.pageSize.toString());
    if (options.sortBy) searchParams.set('sortBy', options.sortBy);
    if (options.sortOrder) searchParams.set('sortOrder', options.sortOrder);
    if (options.search) searchParams.set('search', options.search);
    if (options.name) searchParams.set('name', options.name);
    if (options.position) searchParams.set('position', options.position);
    if (options.department) searchParams.set('department', options.department);
    if (options.phone) searchParams.set('phone', options.phone);
    if (options.email) searchParams.set('email', options.email);
    if (options.mvpn) searchParams.set('mvpn', options.mvpn);
    if (options.supervisor) searchParams.set('supervisor', options.supervisor);
    if (options.status?.length)
      searchParams.set('status', options.status.join(','));
    if (typeof options.isPrimary === 'boolean')
      searchParams.set('is_primary', options.isPrimary.toString());
    if (typeof options.isActive === 'boolean')
      searchParams.set('is_active', options.isActive.toString());

    const url = `${this.baseUrl}?${searchParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: '請求失敗' }));
        console.error('API 錯誤響應:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // 確保回傳格式正確
      if (!result || typeof result !== 'object') {
        console.error('無效的 API 響應格式:', result);
        throw new Error('API 回傳格式錯誤');
      }

      // 適配 API 回傳格式
      if (result.success && Array.isArray(result.data)) {
        // 轉換 API 資料格式為前端格式
        const contacts = result.data.map((item: any) => ({
          id: item.id,
          vendorId: item.vendor_id,
          name: item.contact_name || item.name,
          position: item.position,
          department: item.department,
          phone: item.phone,
          extension: item.extension,
          mvpn: item.mvpn,
          email: item.email,
          supervisor: item.supervisor,
          workSupervisor: item.work_supervisor,
          photoUrl: item.photo_url,
          status: item.contact_status || item.status,
          isPrimary: item.is_primary || false,
          isActive: item.is_active !== false,
          notes: item.notes,
          displayOrder: item.display_order,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));

        return {
          data: contacts,
          pagination: {
            page: options.page || 1,
            pageSize: options.pageSize || 20,
            total: result.total || contacts.length,
            totalPages: Math.ceil(
              (result.total || contacts.length) / (options.pageSize || 20)
            ),
            hasNext: false,
            hasPrev: false,
          },
          stats: result.stats,
        };
      }

      // 如果 API 直接回傳陣列，包裝成預期格式
      if (Array.isArray(result)) {
        return {
          data: result,
          pagination: {
            page: options.page || 1,
            pageSize: options.pageSize || 20,
            total: result.length,
            totalPages: Math.ceil(result.length / (options.pageSize || 20)),
            hasNext: false,
            hasPrev: false,
          },
        };
      }

      return result;
    } catch (error) {
      console.error('取得聯絡人列表失敗:', error);
      throw error;
    }
  }

  /**
   * 取得單一聯絡人詳情
   */
  static async getContactById(contactId: string): Promise<VendorContact> {
    try {
      const response = await fetch(`${this.baseUrl}/${contactId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: '請求失敗' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // 轉換 API 資料格式
      if (result.success && result.data) {
        const item = result.data;
        return {
          id: item.id,
          vendorId: item.vendor_id,
          name: item.contact_name || item.name,
          position: item.position,
          department: item.department,
          phone: item.phone,
          extension: item.extension,
          mvpn: item.mvpn,
          email: item.email,
          supervisor: item.supervisor,
          workSupervisor: item.work_supervisor,
          photoUrl: item.photo_url,
          status: item.contact_status || item.status,
          isPrimary: item.is_primary || false,
          isActive: item.is_active !== false,
          notes: item.notes,
          displayOrder: item.display_order,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      }

      return result;
    } catch (error) {
      console.error('取得聯絡人詳情失敗:', error);
      throw error;
    }
  }

  /**
   * 建立新聯絡人
   */
  static async createContact(
    contactData: Partial<VendorContact>
  ): Promise<VendorContact> {
    try {
      // 轉換前端格式為 API 格式
      const apiData = {
        vendor_id: contactData.vendorId,
        name: contactData.name,
        position: contactData.position,
        department: contactData.department,
        phone: contactData.phone,
        extension: contactData.extension,
        mvpn: contactData.mvpn,
        email: contactData.email,
        supervisor: contactData.supervisor,
        work_supervisor: contactData.workSupervisor,
        photo_url: contactData.photoUrl,
        status: contactData.status,
        is_primary: contactData.isPrimary,
        notes: contactData.notes,
        display_order: contactData.displayOrder,
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: '請求失敗' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const item = result.data;
        return {
          id: item.id,
          vendorId: item.vendor_id,
          name: item.contact_name || item.name,
          position: item.position,
          department: item.department,
          phone: item.phone,
          extension: item.extension,
          mvpn: item.mvpn,
          email: item.email,
          supervisor: item.supervisor,
          workSupervisor: item.work_supervisor,
          photoUrl: item.photo_url,
          status: item.contact_status || item.status,
          isPrimary: item.is_primary || false,
          isActive: item.is_active !== false,
          notes: item.notes,
          displayOrder: item.display_order,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        };
      }

      return result;
    } catch (error) {
      console.error('建立聯絡人失敗:', error);
      throw error;
    }
  }

  /**
   * 更新聯絡人資料
   */
  static async updateContact(
    contactId: string,
    contactData: Partial<VendorContact>
  ): Promise<VendorContact> {
    try {
      // 轉換前端格式為 API 格式
      const apiData = {
        name: contactData.name,
        position: contactData.position,
        department: contactData.department,
        phone: contactData.phone,
        extension: contactData.extension,
        mvpn: contactData.mvpn,
        email: contactData.email,
        supervisor: contactData.supervisor,
        work_supervisor: contactData.workSupervisor,
        photo_url: contactData.photoUrl,
        status: contactData.status,
        is_primary: contactData.isPrimary,
        notes: contactData.notes,
        display_order: contactData.displayOrder,
      };

      const response = await fetch(`${this.baseUrl}/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: '請求失敗' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('更新聯絡人失敗:', error);
      throw error;
    }
  }

  /**
   * 刪除聯絡人
   */
  static async deleteContact(contactId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: '請求失敗' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('刪除聯絡人失敗:', error);
      throw error;
    }
  }

  /**
   * 匯出聯絡人資料
   */
  static async exportContacts(
    vendorId: string,
    filters: ContactFilters = {},
    format: 'excel' | 'csv' | 'pdf' = 'excel'
  ): Promise<{
    downloadUrl: string;
    fileName: string;
  }> {
    const searchParams = new URLSearchParams();
    searchParams.set('format', format);
    searchParams.set('vendor_id', vendorId);

    if (filters.search) searchParams.set('search', filters.search);
    if (filters.name) searchParams.set('name', filters.name);
    if (filters.position) searchParams.set('position', filters.position);
    if (filters.department) searchParams.set('department', filters.department);
    if (filters.phone) searchParams.set('phone', filters.phone);
    if (filters.email) searchParams.set('email', filters.email);
    if (filters.status?.length)
      searchParams.set('status', filters.status.join(','));
    if (typeof filters.isPrimary === 'boolean')
      searchParams.set('is_primary', filters.isPrimary.toString());
    if (typeof filters.isActive === 'boolean')
      searchParams.set('is_active', filters.isActive.toString());

    try {
      const response = await fetch(
        `${this.baseUrl}/export?${searchParams.toString()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: '請求失敗' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      // 如果是文件下載，直接處理 blob
      if (format === 'csv') {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        return {
          downloadUrl,
          fileName: `contacts-${vendorId}-${new Date().toISOString().split('T')[0]}.csv`,
        };
      }

      return await response.json();
    } catch (error) {
      console.error('匯出聯絡人資料失敗:', error);
      throw error;
    }
  }
}
