import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const TEST_PROJECT_ID = 'test-project-001'; // 假設的測試專案 ID

test.describe('值班排程 API 測試', () => {
  let createdScheduleId;

  test.beforeEach(async ({ page }) => {
    // 確保服務正在運行
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/PCM/i);
  });

  test('建立新排程', async ({ request }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const scheduleData = {
      personId: 'test-person-001',
      dutyDate: tomorrow.toISOString(),
      shiftType: 'day',
      workArea: '測試區域',
      urgencyLevel: 'medium',
      notes: '測試排程備註',
    };

    const response = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules`,
      {
        data: scheduleData,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(responseData).toHaveProperty('id');
    expect(responseData.project_id).toBe(TEST_PROJECT_ID);
    expect(responseData.person_id).toBe(scheduleData.personId);

    // 保存建立的排程 ID 供後續測試使用
    createdScheduleId = responseData.id;
  });

  test('取得排程列表', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules?page=1&limit=10`
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(responseData).toHaveProperty('data');
    expect(responseData).toHaveProperty('pagination');
    expect(Array.isArray(responseData.data)).toBeTruthy();
  });

  test('根據日期範圍篩選排程', async ({ request }) => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const response = await request.get(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules?dateFrom=${today.toISOString()}&dateTo=${nextWeek.toISOString()}`
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(Array.isArray(responseData.data)).toBeTruthy();
  });

  test('根據班別篩選排程', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules?shiftType=day`
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(Array.isArray(responseData.data)).toBeTruthy();
  });

  test('根據狀態篩選排程', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules?status=已排班`
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(Array.isArray(responseData.data)).toBeTruthy();
  });

  test('取得當前值班人員', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/current`
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(responseData).toHaveProperty('projectId');
    expect(responseData).toHaveProperty('currentDuty');
    expect(responseData).toHaveProperty('timestamp');
    expect(Array.isArray(responseData.currentDuty)).toBeTruthy();
  });

  test('取得排程統計資料', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/stats`
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(responseData).toHaveProperty('projectId');
    expect(responseData).toHaveProperty('statistics');
    expect(responseData).toHaveProperty('currentDuty');
    expect(responseData).toHaveProperty('replacementNeeded');
    expect(responseData).toHaveProperty('urgentSchedules');
    expect(responseData).toHaveProperty('generatedAt');
  });

  test('更新排程', async ({ request }) => {
    // 先建立一個排程
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const scheduleData = {
      personId: 'test-person-002',
      dutyDate: tomorrow.toISOString(),
      shiftType: 'night',
      workArea: '更新測試區域',
      urgencyLevel: 'high',
    };

    const createResponse = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules`,
      {
        data: scheduleData,
      }
    );

    const createdSchedule = await createResponse.json();

    // 更新排程資料
    const updateData = {
      workArea: '已更新區域',
      urgencyLevel: 'low',
      notes: '更新後的備註',
    };

    const response = await request.put(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/${createdSchedule.id}`,
      {
        data: updateData,
      }
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(responseData.work_area).toBe(updateData.workArea);
    expect(responseData.urgency_level).toBe(updateData.urgencyLevel);
  });

  test('值班簽到', async ({ request }) => {
    // 先建立一個今天的排程
    const today = new Date();

    const scheduleData = {
      personId: 'test-person-003',
      dutyDate: today.toISOString(),
      shiftType: 'day',
      workArea: '簽到測試區域',
      urgencyLevel: 'medium',
    };

    const createResponse = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules`,
      {
        data: scheduleData,
      }
    );

    const createdSchedule = await createResponse.json();

    // 執行簽到
    const checkInTime = new Date();
    const response = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/${createdSchedule.id}/checkin`,
      {
        data: {
          checkInTime: checkInTime.toISOString(),
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(responseData.message).toContain('簽到成功');
    expect(responseData.scheduleId).toBe(createdSchedule.id);
  });

  test('值班簽退', async ({ request }) => {
    // 先建立一個今天的排程並簽到
    const today = new Date();

    const scheduleData = {
      personId: 'test-person-004',
      dutyDate: today.toISOString(),
      shiftType: 'day',
      workArea: '簽退測試區域',
      urgencyLevel: 'medium',
    };

    const createResponse = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules`,
      {
        data: scheduleData,
      }
    );

    const createdSchedule = await createResponse.json();

    // 先簽到
    await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/${createdSchedule.id}/checkin`
    );

    // 執行簽退
    const checkOutTime = new Date();
    const response = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/${createdSchedule.id}/checkout`,
      {
        data: {
          checkOutTime: checkOutTime.toISOString(),
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(responseData.message).toContain('簽退成功');
    expect(responseData.scheduleId).toBe(createdSchedule.id);
  });

  test('匯出排程資料 (JSON)', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/export?format=json`
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(responseData).toHaveProperty('projectId');
    expect(responseData).toHaveProperty('report');
    expect(responseData).toHaveProperty('exportedAt');
    expect(responseData.report).toHaveProperty('schedules');
    expect(responseData.report).toHaveProperty('summary');
    expect(responseData.report).toHaveProperty('analysis');
  });

  test('匯出排程資料 (CSV)', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/export?format=csv`
    );

    expect(response.ok()).toBeTruthy();

    // 檢查回應類型是 CSV
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/csv');

    const csvData = await response.text();
    expect(csvData).toContain('排程ID'); // 檢查 CSV 標頭
  });

  test('刪除排程', async ({ request }) => {
    // 先建立一個排程
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);

    const scheduleData = {
      personId: 'test-person-005',
      dutyDate: tomorrow.toISOString(),
      shiftType: 'night',
      workArea: '刪除測試區域',
      urgencyLevel: 'low',
    };

    const createResponse = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules`,
      {
        data: scheduleData,
      }
    );

    const createdSchedule = await createResponse.json();

    // 刪除排程
    const response = await request.delete(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/${createdSchedule.id}`
    );

    expect(response.ok()).toBeTruthy();
    const responseData = await response.json();

    expect(responseData.message).toContain('排程已成功刪除');
  });

  test('驗證錯誤處理 - 過去日期排班', async ({ request }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const scheduleData = {
      personId: 'test-person-006',
      dutyDate: yesterday.toISOString(),
      shiftType: 'day',
      urgencyLevel: 'medium',
    };

    const response = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules`,
      {
        data: scheduleData,
      }
    );

    expect(response.status()).toBe(409);
    const responseData = await response.json();
    expect(responseData.error).toContain('過去');
  });

  test('驗證錯誤處理 - 無效的班別類型', async ({ request }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const scheduleData = {
      personId: 'test-person-007',
      dutyDate: tomorrow.toISOString(),
      shiftType: 'invalid_shift', // 無效的班別類型
      urgencyLevel: 'medium',
    };

    const response = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules`,
      {
        data: scheduleData,
      }
    );

    expect(response.status()).toBe(400);
    const responseData = await response.json();
    expect(responseData.error).toContain('驗證失敗');
  });

  test('驗證錯誤處理 - 不存在的排程', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/non-existent-id`
    );

    expect(response.status()).toBe(404);
  });

  test('驗證錯誤處理 - 未簽到就簽退', async ({ request }) => {
    // 先建立一個今天的排程但不簽到
    const today = new Date();

    const scheduleData = {
      personId: 'test-person-008',
      dutyDate: today.toISOString(),
      shiftType: 'day',
      urgencyLevel: 'medium',
    };

    const createResponse = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules`,
      {
        data: scheduleData,
      }
    );

    const createdSchedule = await createResponse.json();

    // 嘗試直接簽退
    const response = await request.post(
      `${BASE_URL}/api/projects/${TEST_PROJECT_ID}/duty-schedules/${createdSchedule.id}/checkout`
    );

    expect(response.status()).toBe(409);
    const responseData = await response.json();
    expect(responseData.error).toContain('尚未簽到');
  });
});
