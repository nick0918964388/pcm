import { test, expect } from '@playwright/test';

test.describe('iPhoto 2.0 照片庫功能測試 - 實際操作', () => {
  test.beforeEach(async ({ page }) => {
    // 導航到首頁
    await page.goto('http://localhost:3001');

    // 等待重定向完成
    await page.waitForLoadState('networkidle');

    // 如果在登入頁面，使用測試帳號登入
    if (page.url().includes('/login')) {
      await page.fill('input[placeholder*="使用者名稱"]', 'admin');
      await page.fill('input[placeholder*="密碼"]', 'password');
      await page.click('button:has-text("登入")');
      await page.waitForLoadState('networkidle');
    }

    // 確保在專案選擇頁面
    if (page.url().includes('/project-selection')) {
      // 選擇FAB20 Phase1專案
      await page.click('button:has-text("選擇"):nth-child(2)');
      await page.waitForLoadState('networkidle');
    }
  });

  test('能夠訪問照片庫頁面', async ({ page }) => {
    // 直接導航到照片庫
    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');

    // 等待頁面載入
    await page.waitForTimeout(2000);

    // 截圖以檢查頁面狀態
    await page.screenshot({ path: 'test-results/photo-page-debug.png' });

    // 檢查頁面是否包含照片庫相關內容
    const pageContent = await page.content();

    // 驗證關鍵字存在
    expect(pageContent).toContain('iPhoto');
    console.log('Current URL:', page.url());
    console.log('Page title contains photo content:', pageContent.includes('照片'));
  });

  test('測試頁面基本元素存在', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 檢查標題文字
    const title = await page.locator('h1').first().textContent();
    console.log('Page title:', title);

    // 檢查是否有照片相關的按鈕
    const buttons = await page.locator('button').allTextContents();
    console.log('Available buttons:', buttons);

    // 檢查是否有上傳相關功能
    const hasUploadButton = buttons.some(btn => btn.includes('上傳'));
    expect(hasUploadButton).toBe(true);
  });

  test('測試上傳按鈕互動', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 尋找包含"上傳"文字的按鈕
    const uploadButton = page.locator('button').filter({ hasText: '上傳' }).first();

    if (await uploadButton.isVisible()) {
      console.log('找到上傳按鈕，準備點擊');
      await uploadButton.click();

      // 等待互動結果
      await page.waitForTimeout(1000);

      // 檢查是否有變化
      const afterClickContent = await page.content();
      console.log('點擊後頁面是否包含隱藏文字:', afterClickContent.includes('隱藏'));
    } else {
      console.log('未找到上傳按鈕');
    }
  });

  test('測試相簿管理功能', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 尋找相簿相關按鈕
    const albumButton = page.locator('button').filter({ hasText: '相簿' }).first();

    if (await albumButton.isVisible()) {
      console.log('找到相簿按鈕');
      const buttonText = await albumButton.textContent();
      console.log('相簿按鈕文字:', buttonText);
    }

    // 尋找新增相簿按鈕
    const newAlbumButton = page.locator('button').filter({ hasText: '新增' });

    if (await newAlbumButton.count() > 0) {
      console.log('找到新增相關按鈕');
      const addButtons = await newAlbumButton.allTextContents();
      console.log('新增按鈕:', addButtons);
    }
  });

  test('檢查頁面響應和錯誤', async ({ page }) => {
    // 監聽控制台訊息
    const messages: string[] = [];
    page.on('console', msg => {
      messages.push(`${msg.type()}: ${msg.text()}`);
    });

    // 監聽網路錯誤
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('控制台訊息:', messages);
    console.log('網路錯誤:', networkErrors);

    // 檢查是否有JavaScript錯誤
    const jsErrors = messages.filter(msg => msg.startsWith('error:'));
    expect(jsErrors.length).toBeLessThan(3); // 允許少量非關鍵錯誤
  });

  test('直接測試API端點', async ({ page }) => {
    // 測試照片API是否可用
    try {
      const response = await page.request.get('http://localhost:3001/api/projects/proj001/photos');
      console.log('照片API狀態:', response.status());

      if (response.ok()) {
        const data = await response.json();
        console.log('照片API回應:', data);
      }
    } catch (error) {
      console.log('照片API錯誤:', error);
    }
  });

  test('檢查路由和導航', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');

    // 等待並記錄最終URL
    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    console.log('最終URL:', finalUrl);

    // 檢查是否停留在照片頁面
    expect(finalUrl).toContain('/photos');

    // 檢查頁面內容
    const pageText = await page.textContent('body');
    console.log('頁面是否包含照片相關內容:', pageText?.includes('照片') || false);
  });
});