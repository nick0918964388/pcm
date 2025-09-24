// 簡化版聯絡人服務
// 後續可以擴展為完整的 repository 模式

export interface ContactQueryInput {
  vendor_id?: string;
  name?: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  mvpn?: string;
  supervisor?: string;
  status?: string;
  is_primary?: boolean;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateContactInput {
  vendor_id: string;
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  extension?: string;
  mvpn?: string;
  email?: string;
  supervisor?: string;
  work_supervisor?: string;
  photo_url?: string;
  status?: string;
  is_primary?: boolean;
  notes?: string;
  display_order?: number;
}

export class ContactService {
  /**
   * 取得聯絡人列表
   */
  async getContacts(params: ContactQueryInput) {
    // TODO: 實現資料庫查詢邏輯
    // 目前返回模擬資料
    return {
      data: [],
      total: 0,
      pagination: {
        page: params.page || 1,
        pageSize: params.limit || 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
      stats: {
        totalContacts: 0,
        activeContacts: 0,
        primaryContacts: 0,
        totalByDepartment: {},
        totalByStatus: {},
      },
    };
  }

  /**
   * 建立聯絡人
   */
  async createContact(data: CreateContactInput) {
    // TODO: 實現資料庫新增邏輯
    // 目前返回模擬資料
    return {
      id: 'temp-id',
      vendor_id: data.vendor_id,
      name: data.name,
      position: data.position,
      department: data.department,
      phone: data.phone,
      extension: data.extension,
      mvpn: data.mvpn,
      email: data.email,
      supervisor: data.supervisor,
      work_supervisor: data.work_supervisor,
      photo_url: data.photo_url,
      status: data.status || '啟用',
      is_primary: data.is_primary || false,
      notes: data.notes,
      display_order: data.display_order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 更新聯絡人
   */
  async updateContact(id: string, data: Partial<CreateContactInput>) {
    // TODO: 實現資料庫更新邏輯
    return { ...data, id, updated_at: new Date().toISOString() };
  }

  /**
   * 刪除聯絡人
   */
  async deleteContact(id: string) {
    // TODO: 實現資料庫刪除邏輯
    return true;
  }
}

// 單例實例
export const contactService = new ContactService();
