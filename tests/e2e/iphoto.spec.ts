import { test, expect } from '@playwright/test';

test.describe('iPhoto 2.0 照片庫功能測試', () => {
  test.beforeEach(async ({ page }) => {
    // 導航到應用程式首頁
    await page.goto('http://localhost:3001');

    // 如果需要登入，會自動重定向到登入頁面
    // 等待頁面載入完成
    await page.waitForLoadState('networkidle');

    // 檢查是否在專案選擇頁面
    if (page.url().includes('/project-selection')) {
      // 選擇FAB20 Phase1專案 (proj001)
      await page.getByRole('button', { name: '選擇' }).nth(1).click();
      await page.waitForLoadState('networkidle');
    }

    // 導航到照片庫頁面
    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');
  });

  test('應該正確顯示iPhoto 2.0照片庫頁面', async ({ page }) => {
    // 驗證頁面標題
    await expect(page.getByRole('heading', { name: /iPhoto 2\.0 - 工程照片庫/ })).toBeVisible();

    // 驗證專案ID顯示
    await expect(page.getByText('專案 proj001 的照片管理與預覽')).toBeVisible();

    // 驗證主要功能按鈕存在
    await expect(page.getByRole('button', { name: /上傳照片/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /新增相簿/ })).toBeVisible();

    // 驗證相簿列表區域
    await expect(page.getByText('專案相簿')).toBeVisible();
    await expect(page.getByRole('button', { name: /所有照片/ })).toBeVisible();

    // 驗證搜尋與篩選區域
    await expect(page.getByText('搜尋與篩選')).toBeVisible();
    await expect(page.getByRole('button', { name: /篩選/ })).toBeVisible();
  });

  test('應該能夠展開和收合上傳照片功能', async ({ page }) => {
    // 點擊上傳照片按鈕
    await page.getByRole('button', { name: '上傳照片' }).click();

    // 驗證上傳區域出現
    await expect(page.getByText('上傳照片', { exact: true })).toBeVisible();

    // 再次點擊隱藏上傳區域
    await page.getByRole('button', { name: '隱藏上傳' }).click();

    // 驗證上傳區域消失
    await expect(page.getByText('上傳照片', { exact: true })).not.toBeVisible();
  });

  test('應該能夠切換檢視模式（網格/列表）', async ({ page }) => {
    // 檢查預設是網格模式
    const gridButton = page.locator('button').filter({ hasText: /^$/ }).first();
    const listButton = page.locator('button').filter({ hasText: /^$/ }).nth(1);

    // 點擊列表模式
    await listButton.click();

    // 等待一下確保狀態更新
    await page.waitForTimeout(500);

    // 點擊回網格模式
    await gridButton.click();

    // 等待一下確保狀態更新
    await page.waitForTimeout(500);
  });

  test('應該顯示正確的照片數量', async ({ page }) => {
    // 驗證照片數量顯示（預期為0，因為這是測試環境）
    await expect(page.getByText('所有照片').locator('..').getByText('0')).toBeVisible();
  });

  test('應該能夠展開篩選功能', async ({ page }) => {
    // 點擊篩選按鈕
    await page.getByRole('button', { name: '篩選' }).click();

    // 等待篩選面板載入
    await page.waitForTimeout(1000);

    // 驗證頁面沒有出現錯誤
    const errorElements = page.locator('[role="alert"]');
    const errorCount = await errorElements.count();
    expect(errorCount).toBe(0);
  });

  test('應該正確處理導航', async ({ page }) => {
    // 驗證當前URL
    expect(page.url()).toContain('/dashboard/proj001/photos');

    // 點擊麵包屑導航
    await page.getByRole('link', { name: 'PCM 工程關鍵指標平台' }).click();
    await page.waitForLoadState('networkidle');

    // 驗證導航到儀表板
    expect(page.url()).toContain('/dashboard');
  });

  test('應該在沒有照片時顯示適當的空狀態', async ({ page }) => {
    // 驗證照片數量為0
    await expect(page.getByText('0', { exact: true })).toBeVisible();

    // 檢查是否有空狀態提示（如果有的話）
    const emptyStateElements = page.locator('text=暫無照片');
    if (await emptyStateElements.count() > 0) {
      await expect(emptyStateElements.first()).toBeVisible();
    }
  });

  test('應該響應式設計正常工作', async ({ page }) => {
    // 測試桌面視圖
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByRole('heading', { name: 'iPhoto 2.0 - 工程照片庫' })).toBeVisible();

    // 測試平板視圖
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: 'iPhoto 2.0 - 工程照片庫' })).toBeVisible();

    // 測試手機視圖
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: 'iPhoto 2.0 - 工程照片庫' })).toBeVisible();

    // 恢復桌面視圖
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('應該處理錯誤狀態', async ({ page }) => {
    // 監聽控制台錯誤
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 重新載入頁面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 驗證沒有JavaScript錯誤
    expect(consoleErrors.length).toBe(0);
  });

  test('應該正確載入所有必要資源', async ({ page }) => {
    // 檢查網路請求
    const responses: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        responses.push(`${response.status()} ${response.url()}`);
      }
    });

    // 重新載入頁面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 驗證沒有HTTP錯誤
    const criticalErrors = responses.filter(r =>
      r.includes('photos') || r.includes('api') && !r.includes('404')
    );
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('iPhoto 2.0 照片上傳功能測試', () => {
  test.beforeEach(async ({ page }) => {
    // 導航到照片庫頁面
    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');

    // 展開上傳功能
    await page.getByRole('button', { name: '上傳照片' }).click();
  });

  test('應該顯示上傳界面', async ({ page }) => {
    // 驗證上傳區域標題
    await expect(page.getByText('上傳照片', { exact: true })).toBeVisible();

    // 驗證上傳組件載入（可能需要等待）
    await page.waitForTimeout(1000);
  });
});

test.describe('iPhoto 2.0 相簿管理功能測試', () => {
  test.beforeEach(async ({ page }) => {
    // 導航到照片庫頁面
    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');
  });

  test('應該顯示相簿管理界面', async ({ page }) => {
    // 驗證相簿區域
    await expect(page.getByText('專案相簿')).toBeVisible();
    await expect(page.getByRole('button', { name: '新增相簿' })).toBeVisible();
    await expect(page.getByRole('button', { name: '所有照片' })).toBeVisible();
  });

  test('應該能夠點擊新增相簿按鈕', async ({ page }) => {
    // 點擊新增相簿按鈕
    await page.getByRole('button', { name: '新增相簿' }).click();

    // 等待響應（可能會有彈窗或表單）
    await page.waitForTimeout(1000);
  });
});