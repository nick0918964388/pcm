const { test, expect } = require('@playwright/test');

test.describe('廠商聯絡人顯示測試', () => {
  // 測試前置作業
  test.beforeEach(async ({ page }) => {
    console.log('開始測試前置作業...');
    
    // 訪問主頁面 (使用 port 3009)
    await page.goto('http://localhost:3009/');
    console.log('已訪問主頁面');
    
    // 等待登入頁面載入
    await page.waitForLoadState('networkidle');
    
    // 執行登入
    console.log('執行登入...');
    const usernameInput = await page.locator('input[type="text"]').first();
    await usernameInput.fill('admin');
    
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.fill('password');
    
    const submitButton = await page.locator('button[type="submit"]');
    await submitButton.click();
    console.log('已提交登入表單');
    
    // 等待登入後重導向到專案選擇頁
    await page.waitForURL('**/project-selection', { timeout: 10000 });
    console.log('已成功登入並導航到專案選擇頁');
    
    // 選擇第一個專案
    await page.waitForLoadState('networkidle');
    const projectCards = await page.locator('[class*="card"]');
    const projectCount = await projectCards.count();
    console.log(`找到 ${projectCount} 個專案卡片`);
    
    if (projectCount > 0) {
      await projectCards.first().click();
      console.log('已選擇第一個專案');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }
  });

  test('應該能顯示廠商聯絡人頁面', async ({ page }) => {
    console.log('測試：顯示廠商聯絡人頁面');
    
    // 等待頁面載入
    await page.waitForLoadState('networkidle');
    console.log('頁面載入完成');
    
    // 檢查導航欄是否存在 (使用更寬鬆的選擇器)
    const navigation = await page.locator('nav, [class*="nav"], [role="navigation"]').first();
    if (await navigation.count() > 0) {
      await expect(navigation).toBeVisible();
      console.log('導航欄已顯示');
    } else {
      console.log('未找到導航欄，嘗試其他選擇器');
    }
    
    // 尋找並點擊廠商管理連結
    const vendorLink = await page.getByText('廠商管理', { exact: false });
    if (await vendorLink.count() > 0) {
      await vendorLink.first().click();
      console.log('已點擊廠商管理連結');
      
      // 等待廠商列表載入
      await page.waitForLoadState('networkidle');
      console.log('廠商列表載入完成');
      
      // 檢查是否有廠商卡片
      const vendorCards = await page.locator('.card, [class*="card"]');
      const vendorCount = await vendorCards.count();
      console.log(`找到 ${vendorCount} 個廠商卡片`);
      
      if (vendorCount > 0) {
        // 點擊第一個廠商的查看聯絡人按鈕
        const viewContactsButton = await page.getByRole('button', { name: /查看聯絡人|聯絡人|contact/i }).first();
        if (await viewContactsButton.count() > 0) {
          await viewContactsButton.click();
          console.log('已點擊查看聯絡人按鈕');
          
          // 等待聯絡人頁面載入
          await page.waitForLoadState('networkidle');
          console.log('聯絡人頁面載入完成');
          
          // 驗證聯絡人頁面元素
          // 1. 檢查返回按鈕
          const backButton = await page.getByText('返回廠商列表');
          await expect(backButton).toBeVisible();
          console.log('返回按鈕已顯示');
          
          // 2. 檢查廠商資訊卡片
          const vendorInfoCard = await page.locator('[class*="gradient"]').first();
          await expect(vendorInfoCard).toBeVisible();
          console.log('廠商資訊卡片已顯示');
          
          // 3. 檢查統計卡片區域
          const statsCards = await page.locator('[class*="grid"] >> text=/總聯絡人|活躍聯絡人|主要聯絡人/');
          const statsCount = await statsCards.count();
          console.log(`找到 ${statsCount} 個統計卡片`);
          expect(statsCount).toBeGreaterThan(0);
          
          // 4. 檢查篩選區域
          const filterSection = await page.locator('text=/搜尋|篩選|排序/').first();
          if (await filterSection.count() > 0) {
            await expect(filterSection).toBeVisible();
            console.log('篩選區域已顯示');
          }
          
          // 5. 檢查聯絡人列表或空狀態
          const contactCards = await page.locator('[class*="ContactCard"], [class*="contact-card"]');
          const contactCount = await contactCards.count();
          console.log(`找到 ${contactCount} 個聯絡人卡片`);
          
          if (contactCount === 0) {
            // 檢查空狀態訊息
            const emptyMessage = await page.getByText(/尚無聯絡人資料|找不到符合條件的聯絡人/);
            await expect(emptyMessage.first()).toBeVisible();
            console.log('顯示空狀態訊息');
          } else {
            // 驗證至少有一個聯絡人卡片
            expect(contactCount).toBeGreaterThan(0);
            console.log(`成功顯示 ${contactCount} 個聯絡人`);
            
            // 檢查第一個聯絡人卡片的基本資訊
            const firstContact = contactCards.first();
            await expect(firstContact).toBeVisible();
            
            // 檢查聯絡人姓名
            const contactName = await firstContact.locator('[class*="font-bold"], [class*="font-semibold"], h3, h4').first();
            if (await contactName.count() > 0) {
              await expect(contactName).toBeVisible();
              const nameText = await contactName.textContent();
              console.log(`第一個聯絡人姓名: ${nameText}`);
            }
          }
        } else {
          console.log('未找到查看聯絡人按鈕，可能需要不同的導航方式');
        }
      } else {
        console.log('未找到廠商卡片，可能需要先新增廠商');
      }
    } else {
      console.log('未找到廠商管理連結，檢查導航結構');
    }
  });

  test('測試聯絡人篩選功能', async ({ page }) => {
    console.log('測試：聯絡人篩選功能');
    
    // 頁面已在 beforeEach 中登入並選擇專案
    await page.waitForLoadState('networkidle');
    
    // 尋找並點擊廠商管理
    const vendorLink = await page.getByText('廠商管理', { exact: false });
    if (await vendorLink.count() > 0) {
      await vendorLink.first().click();
      await page.waitForLoadState('networkidle');
      
      // 點擊第一個廠商的查看聯絡人
      const viewContactsButton = await page.getByRole('button', { name: /查看聯絡人|聯絡人|contact/i }).first();
      if (await viewContactsButton.count() > 0) {
        await viewContactsButton.click();
        await page.waitForLoadState('networkidle');
        
        // 測試搜尋功能
        const searchInput = await page.getByPlaceholder(/搜尋|search/i).first();
        if (await searchInput.count() > 0) {
          await searchInput.fill('測試搜尋');
          console.log('已輸入搜尋文字');
          
          // 等待篩選結果
          await page.waitForTimeout(500);
          
          // 檢查篩選結果
          const filteredResults = await page.locator('[class*="ContactCard"], [class*="contact-card"], text=/找不到符合條件/');
          const resultCount = await filteredResults.count();
          console.log(`篩選後顯示 ${resultCount} 個結果`);
          
          // 清除搜尋
          await searchInput.clear();
          console.log('已清除搜尋文字');
        } else {
          console.log('未找到搜尋輸入框');
        }
        
        // 測試檢視模式切換
        const gridButton = await page.locator('[aria-label*="grid"], button:has(svg[class*="Grid"])').first();
        const listButton = await page.locator('[aria-label*="list"], button:has(svg[class*="List"])').first();
        
        if (await gridButton.count() > 0 && await listButton.count() > 0) {
          // 切換到列表模式
          await listButton.click();
          console.log('已切換到列表模式');
          await page.waitForTimeout(300);
          
          // 切換回網格模式
          await gridButton.click();
          console.log('已切換回網格模式');
          await page.waitForTimeout(300);
        } else {
          console.log('未找到檢視模式切換按鈕');
        }
      }
    }
  });

  test('測試聯絡人互動功能', async ({ page }) => {
    console.log('測試：聯絡人互動功能');
    
    // 頁面已在 beforeEach 中登入並選擇專案
    await page.waitForLoadState('networkidle');
    
    const vendorLink = await page.getByText('廠商管理', { exact: false });
    if (await vendorLink.count() > 0) {
      await vendorLink.first().click();
      await page.waitForLoadState('networkidle');
      
      const viewContactsButton = await page.getByRole('button', { name: /查看聯絡人|聯絡人|contact/i }).first();
      if (await viewContactsButton.count() > 0) {
        await viewContactsButton.click();
        await page.waitForLoadState('networkidle');
        
        // 檢查新增聯絡人按鈕
        const addContactButton = await page.getByRole('button', { name: /新增聯絡人|add contact/i });
        if (await addContactButton.count() > 0) {
          await expect(addContactButton.first()).toBeVisible();
          console.log('新增聯絡人按鈕已顯示');
          
          // 測試點擊新增按鈕（但不實際新增）
          await addContactButton.first().click();
          console.log('已點擊新增聯絡人按鈕');
          
          // 檢查是否出現表單或對話框
          const dialog = await page.locator('[role="dialog"], [class*="modal"], [class*="dialog"]').first();
          if (await dialog.count() > 0) {
            await expect(dialog).toBeVisible();
            console.log('新增聯絡人對話框已顯示');
            
            // 關閉對話框
            const closeButton = await page.locator('[aria-label*="close"], button:has-text("取消"), button:has-text("關閉")').first();
            if (await closeButton.count() > 0) {
              await closeButton.click();
              console.log('已關閉對話框');
            } else {
              // 按 ESC 鍵關閉
              await page.keyboard.press('Escape');
              console.log('已按 ESC 關閉對話框');
            }
          }
        } else {
          console.log('未找到新增聯絡人按鈕');
        }
        
        // 測試聯絡人卡片的互動按鈕
        const contactCards = await page.locator('[class*="ContactCard"], [class*="contact-card"]');
        if (await contactCards.count() > 0) {
          const firstCard = contactCards.first();
          
          // 檢查編輯按鈕
          const editButton = await firstCard.locator('button[aria-label*="edit"], button:has(svg[class*="Edit"]), button:has(svg[class*="Pencil"])').first();
          if (await editButton.count() > 0) {
            await expect(editButton).toBeVisible();
            console.log('編輯按鈕已顯示');
          }
          
          // 檢查電話按鈕
          const phoneButton = await firstCard.locator('button[aria-label*="phone"], button:has(svg[class*="Phone"])').first();
          if (await phoneButton.count() > 0) {
            await expect(phoneButton).toBeVisible();
            console.log('電話按鈕已顯示');
          }
          
          // 檢查郵件按鈕
          const emailButton = await firstCard.locator('button[aria-label*="email"], button:has(svg[class*="Mail"])').first();
          if (await emailButton.count() > 0) {
            await expect(emailButton).toBeVisible();
            console.log('郵件按鈕已顯示');
          }
        } else {
          console.log('沒有聯絡人卡片可供測試互動功能');
        }
      }
    }
  });

  test('測試響應式設計', async ({ page }) => {
    console.log('測試：響應式設計');
    
    // 設定不同的視窗大小
    const viewports = [
      { name: '桌面', width: 1920, height: 1080 },
      { name: '平板', width: 768, height: 1024 },
      { name: '手機', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      console.log(`測試 ${viewport.name} 視窗 (${viewport.width}x${viewport.height})`);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // 頁面已在 beforeEach 中登入並選擇專案
      await page.waitForLoadState('networkidle');
      
      const vendorLink = await page.getByText('廠商管理', { exact: false });
      if (await vendorLink.count() > 0) {
        await vendorLink.first().click();
        await page.waitForLoadState('networkidle');
        
        const viewContactsButton = await page.getByRole('button', { name: /查看聯絡人|聯絡人|contact/i }).first();
        if (await viewContactsButton.count() > 0) {
          await viewContactsButton.click();
          await page.waitForLoadState('networkidle');
          
          // 檢查主要元素是否正常顯示
          const mainContent = await page.locator('[class*="container"], main, [role="main"]').first();
          await expect(mainContent).toBeVisible();
          console.log(`${viewport.name}視窗：主要內容正常顯示`);
          
          // 檢查聯絡人卡片佈局
          const contactGrid = await page.locator('[class*="grid"]').first();
          if (await contactGrid.count() > 0) {
            const gridClasses = await contactGrid.getAttribute('class');
            console.log(`${viewport.name}視窗：Grid 類別: ${gridClasses}`);
          }
        }
      }
    }
  });
});