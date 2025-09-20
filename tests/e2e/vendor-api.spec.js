import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('廠商管理 API 測試', () => {
  let createdVendorId;

  test.beforeEach(async ({ page }) => {
    // 確保服務正在運行
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/PCM/i);
  });

  test('建立新廠商', async ({ request }) => {
    const vendorData = {
      name: '測試廠商公司',
      type: 'contractor',
      status: 'active',
      contact_person: '張三',
      phone: '02-1234-5678',
      email: 'test@vendor.com',
      address: '台北市信義區測試路123號',
      contract_start: new Date().toISOString(),
      contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      rating: 4,
      notes: '測試廠商資料'
    };

    const response = await request.post(`${BASE_URL}/api/vendors`, {
      data: vendorData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    expect(responseData).toHaveProperty('id');
    expect(responseData.name).toBe(vendorData.name);
    expect(responseData.email).toBe(vendorData.email);
    
    // 保存建立的廠商 ID 供後續測試使用
    createdVendorId = responseData.id;
  });

  test('取得廠商列表', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/vendors?page=1&limit=10`);
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    expect(responseData).toHaveProperty('data');
    expect(responseData).toHaveProperty('pagination');
    expect(responseData.pagination).toHaveProperty('page');
    expect(responseData.pagination).toHaveProperty('limit');
    expect(responseData.pagination).toHaveProperty('total');
    expect(Array.isArray(responseData.data)).toBeTruthy();
  });

  test('根據類型篩選廠商', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/vendors?types=contractor`);
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    expect(Array.isArray(responseData.data)).toBeTruthy();
    // 檢查所有返回的廠商都是 contractor 類型
    responseData.data.forEach(vendor => {
      expect(vendor.type).toBe('contractor');
    });
  });

  test('搜尋廠商', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/vendors?search=測試`);
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    expect(Array.isArray(responseData.data)).toBeTruthy();
  });

  test('取得廠商詳情', async ({ request }) => {
    // 先建立一個廠商
    const vendorData = {
      name: '詳情測試廠商',
      type: 'supplier',
      contact_person: '李四',
      phone: '02-9876-5432',
      email: 'detail@test.com',
      contract_start: new Date().toISOString(),
      contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    const createResponse = await request.post(`${BASE_URL}/api/vendors`, {
      data: vendorData
    });
    
    const createdVendor = await createResponse.json();
    
    // 取得廠商詳情
    const response = await request.get(`${BASE_URL}/api/vendors/${createdVendor.id}`);
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    expect(responseData.id).toBe(createdVendor.id);
    expect(responseData.name).toBe(vendorData.name);
    expect(responseData.email).toBe(vendorData.email);
  });

  test('更新廠商資料', async ({ request }) => {
    // 先建立一個廠商
    const vendorData = {
      name: '待更新廠商',
      type: 'service_provider',
      contact_person: '王五',
      phone: '02-5555-5555',
      email: 'update@test.com',
      contract_start: new Date().toISOString(),
      contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    const createResponse = await request.post(`${BASE_URL}/api/vendors`, {
      data: vendorData
    });
    
    const createdVendor = await createResponse.json();
    
    // 更新廠商資料
    const updateData = {
      name: '已更新廠商',
      contact_person: '王五更新',
      phone: '02-6666-6666'
    };

    const response = await request.put(`${BASE_URL}/api/vendors/${createdVendor.id}`, {
      data: updateData
    });
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    expect(responseData.name).toBe(updateData.name);
    expect(responseData.contact_person).toBe(updateData.contact_person);
    expect(responseData.phone).toBe(updateData.phone);
  });

  test('更新廠商評分', async ({ request }) => {
    // 先建立一個廠商
    const vendorData = {
      name: '評分測試廠商',
      type: 'consultant',
      contact_person: '趙六',
      phone: '02-7777-7777',
      email: 'rating@test.com',
      contract_start: new Date().toISOString(),
      contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    const createResponse = await request.post(`${BASE_URL}/api/vendors`, {
      data: vendorData
    });
    
    const createdVendor = await createResponse.json();
    
    // 更新評分
    const ratingData = { rating: 5 };

    const response = await request.put(`${BASE_URL}/api/vendors/${createdVendor.id}/rating`, {
      data: ratingData
    });
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    expect(responseData.message).toContain('評分已成功更新');
  });

  test('更新廠商狀態', async ({ request }) => {
    // 先建立一個廠商
    const vendorData = {
      name: '狀態測試廠商',
      type: 'other',
      contact_person: '錢七',
      phone: '02-8888-8888',
      email: 'status@test.com',
      contract_start: new Date().toISOString(),
      contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    const createResponse = await request.post(`${BASE_URL}/api/vendors`, {
      data: vendorData
    });
    
    const createdVendor = await createResponse.json();
    
    // 更新狀態
    const statusData = { status: 'inactive' };

    const response = await request.put(`${BASE_URL}/api/vendors/${createdVendor.id}/status`, {
      data: statusData
    });
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    expect(responseData.message).toContain('狀態已成功更新');
  });

  test('取得廠商統計資料', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/vendors/stats`);
    
    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();
    
    expect(responseData).toHaveProperty('totalVendors');
    expect(responseData).toHaveProperty('activeVendors');
    expect(responseData).toHaveProperty('suspendedVendors');
    expect(responseData).toHaveProperty('vendorsByType');
    expect(responseData).toHaveProperty('vendorsByStatus');
    expect(typeof responseData.totalVendors).toBe('number');
  });

  test('驗證錯誤處理 - 重複廠商名稱', async ({ request }) => {
    const vendorData = {
      name: '重複測試廠商',
      type: 'contractor',
      contact_person: '測試員',
      phone: '02-1111-1111',
      email: 'duplicate1@test.com',
      contract_start: new Date().toISOString(),
      contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    // 建立第一個廠商
    await request.post(`${BASE_URL}/api/vendors`, { data: vendorData });
    
    // 嘗試建立同名廠商
    const duplicateData = {
      ...vendorData,
      email: 'duplicate2@test.com'
    };
    
    const response = await request.post(`${BASE_URL}/api/vendors`, { data: duplicateData });
    
    expect(response.status()).toBe(409);
    const responseData = await response.json();
    expect(responseData.error).toContain('已存在');
  });

  test('驗證錯誤處理 - 無效的輸入資料', async ({ request }) => {
    const invalidData = {
      name: '', // 空名稱
      type: 'invalid_type', // 無效類型
      email: 'invalid-email' // 無效的電子郵件格式
    };

    const response = await request.post(`${BASE_URL}/api/vendors`, { data: invalidData });
    
    expect(response.status()).toBe(400);
    const responseData = await response.json();
    expect(responseData.error).toContain('驗證失敗');
  });

  test('驗證錯誤處理 - 不存在的廠商', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/vendors/non-existent-id`);
    
    expect(response.status()).toBe(404);
    const responseData = await response.json();
    expect(responseData.error).toContain('找不到');
  });
});