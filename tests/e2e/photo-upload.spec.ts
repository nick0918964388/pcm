import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('照片上傳功能測試 - 檢查 API 執行', () => {
  test.beforeEach(async ({ page }) => {
    // 監聽網路請求以捕獲 API 呼叫
    page.on('request', request => {
      if (request.url().includes('photos') || request.url().includes('api')) {
        console.log('📤 API Request:', request.method(), request.url());
        console.log('📤 Request Headers:', request.headers());
      }
    });

    page.on('response', response => {
      if (response.url().includes('photos') || response.url().includes('api')) {
        console.log('📥 API Response:', response.status(), response.url());
      }
    });

    // 監聽控制台訊息以捕獲伺服器日誌
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`🖥️ Console ${msg.type()}:`, msg.text());
      }
    });

    // 先導航到登入頁面
    console.log('🔑 開始登入流程...');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');

    // 檢查是否在登入頁面
    if (page.url().includes('/login')) {
      console.log('📝 填寫登入資訊...');
      // 填寫登入資訊
      await page.getByRole('textbox', { name: '請輸入使用者名稱' }).fill('admin');
      await page.getByRole('textbox', { name: '請輸入密碼' }).fill('password');

      // 點擊登入按鈕
      await page.getByRole('button', { name: '登入' }).click();
      await page.waitForLoadState('networkidle');
      console.log('✅ 登入完成');
    }

    // 導航到照片庫頁面
    console.log('🏗️ 導航到照片庫頁面...');
    await page.goto('http://localhost:3001/dashboard/proj001/photos');
    await page.waitForLoadState('networkidle');
    console.log('📁 照片庫頁面已載入');
  });

  test('上傳照片並檢查 INSERT 查詢執行', async ({ page }) => {
    console.log('🚀 開始照片上傳測試...');

    // 1. 展開上傳功能
    console.log('📂 展開上傳功能...');
    await page.getByRole('button', { name: '上傳照片' }).click();
    await page.waitForTimeout(1000);

    // 驗證上傳區域出現
    await expect(page.getByText('上傳照片', { exact: true })).toBeVisible();
    console.log('✅ 上傳區域已顯示');

    // 2. 建立測試圖片檔案
    console.log('🖼️ 準備測試圖片檔案...');

    // 尋找檔案上傳輸入元素
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // 建立一個簡單的測試圖片檔案（小的 PNG）
    const testImagePath = path.join(process.cwd(), 'test-image.png');

    // 如果沒有測試圖片，我們先嘗試找到上傳區域並與之互動
    console.log('📁 尋找上傳區域...');

    // 尋找拖放區域或上傳按鈕
    const dropZone = page.locator('[data-testid="dropzone"]').or(
      page.locator('.dropzone')
    ).or(
      page.getByText('拖放檔案到此處').locator('..')
    ).or(
      page.getByText('選擇檔案').locator('..')
    ).or(
      page.locator('div').filter({ hasText: '上傳' }).first()
    );

    if (await dropZone.count() > 0) {
      console.log('📤 找到拖放區域，嘗試點擊...');
      await dropZone.first().click();
      await page.waitForTimeout(500);
    }

    // 3. 模擬檔案上傳
    console.log('📎 開始模擬檔案上傳...');

    try {
      // 建立模擬的檔案內容（1x1 透明 PNG）
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width = 1
        0x00, 0x00, 0x00, 0x01, // height = 1
        0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
        0x1F, 0x15, 0xC4, 0x89, // CRC
        0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
        0xE2, 0x21, 0xBC, 0x33, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
      ]);

      // 上傳檔案
      await fileInput.setInputFiles({
        name: 'test-photo.png',
        mimeType: 'image/png',
        buffer: pngBuffer
      });

      console.log('✅ 檔案已設定到輸入元素');

      // 4. 等待上傳處理和 API 呼叫
      console.log('⏳ 等待 API 回應...');

      // 等待網路活動完成
      await page.waitForTimeout(2000);

      // 尋找上傳按鈕並點擊（如果需要）
      const uploadButton = page.getByRole('button', { name: /上傳|開始上傳|確認上傳/ });
      if (await uploadButton.count() > 0) {
        console.log('🔘 點擊上傳按鈕...');
        await uploadButton.click();
        await page.waitForTimeout(2000);
      }

      // 等待更長時間以確保 API 呼叫完成
      await page.waitForTimeout(3000);

      console.log('✅ 上傳流程已完成');

    } catch (error) {
      console.error('❌ 上傳過程中發生錯誤:', error);
    }

    // 5. 檢查頁面狀態
    console.log('🔍 檢查頁面最終狀態...');

    // 檢查是否有成功訊息
    const successMessage = page.locator('text=上傳成功').or(
      page.locator('text=照片已上傳')
    ).or(
      page.locator('[role="alert"]').filter({ hasText: '成功' })
    );

    if (await successMessage.count() > 0) {
      console.log('✅ 發現成功訊息');
    }

    // 檢查是否有錯誤訊息
    const errorMessage = page.locator('text=錯誤').or(
      page.locator('text=失敗')
    ).or(
      page.locator('[role="alert"]').filter({ hasText: '錯誤' })
    );

    if (await errorMessage.count() > 0) {
      const errorText = await errorMessage.first().textContent();
      console.log('❌ 發現錯誤訊息:', errorText);
    }

    console.log('🏁 測試完成！請檢查伺服器日誌以查看 INSERT 查詢執行情況。');
  });

  test('檢查上傳表單元素', async ({ page }) => {
    console.log('🔍 檢查上傳表單元素...');

    // 等待頁面完全載入
    await page.waitForTimeout(2000);

    // 檢查頁面內容
    const pageContent = await page.content();
    console.log('📄 頁面 URL:', page.url());

    // 尋找上傳按鈕
    const uploadButton = page.getByRole('button', { name: /上傳/ });
    const uploadButtonCount = await uploadButton.count();
    console.log('🔍 找到上傳按鈕數量:', uploadButtonCount);

    if (uploadButtonCount > 0) {
      // 展開上傳功能
      await uploadButton.first().click();
      await page.waitForTimeout(1000);
    } else {
      console.log('❌ 未找到上傳按鈕，檢查頁面內容...');
      // 列出所有按鈕
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`📊 頁面上總共有 ${buttonCount} 個按鈕`);

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const buttonText = await allButtons.nth(i).textContent().catch(() => 'N/A');
        console.log(`  - 按鈕 ${i}: "${buttonText}"`);
      }
    }

    // 檢查所有可能的上傳相關元素
    const elements = [
      'input[type="file"]',
      '[data-testid="dropzone"]',
      '.dropzone',
      'button[type="submit"]',
      'form'
    ];

    for (const selector of elements) {
      const element = page.locator(selector);
      const count = await element.count();
      console.log(`🔍 ${selector}: 找到 ${count} 個元素`);

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const text = await element.nth(i).textContent().catch(() => 'N/A');
          const classes = await element.nth(i).getAttribute('class').catch(() => 'N/A');
          console.log(`  - 元素 ${i}: 文字="${text}", 類別="${classes}"`);
        }
      }
    }
  });

  test('直接觸發 API 端點', async ({ page, request }) => {
    console.log('🎯 直接測試照片上傳 API 端點...');

    // 建立測試圖片檔案
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width = 1
      0x00, 0x00, 0x00, 0x01, // height = 1
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x1F, 0x15, 0xC4, 0x89, // CRC
      0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
      0xE2, 0x21, 0xBC, 0x33, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);

    try {
      // 準備上傳資料

      console.log('📤 直接呼叫 API 端點...');

      const response = await request.post('http://localhost:3001/api/projects/proj001/photos', {
        multipart: {
          files: {
            name: 'test-photo.png',
            mimeType: 'image/png',
            buffer: pngBuffer
          },
          album: 'test-album',
          description: 'Playwright 測試上傳'
        }
      });

      console.log('📥 API 回應狀態:', response.status());

      const responseBody = await response.text();
      console.log('📥 API 回應內容:', responseBody);

      if (response.ok()) {
        console.log('✅ API 呼叫成功！');
      } else {
        console.log('❌ API 呼叫失敗');
      }

    } catch (error) {
      console.error('❌ API 呼叫發生錯誤:', error);
    }
  });
});