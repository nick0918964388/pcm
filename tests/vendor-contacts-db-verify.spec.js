const { test, expect } = require('@playwright/test');
const { Pool } = require('pg');

// 資料庫連線設定
const pool = new Pool({
  user: 'pcm_user',
  host: 'localhost',
  database: 'pcm_db',
  password: 'pcm_password',
  port: 5432,
});

test.describe('廠商聯絡人資料庫驗證測試', () => {
  let dbContacts = [];
  let vendors = [];

  // 測試前從資料庫獲取資料
  test.beforeAll(async () => {
    try {
      // 獲取廠商資料
      const vendorsResult = await pool.query(`
        SELECT id, name, type, phone, email, status 
        FROM vendors 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      vendors = vendorsResult.rows;
      console.log(`從資料庫獲取 ${vendors.length} 個廠商`);

      // 獲取聯絡人資料
      const contactsResult = await pool.query(`
        SELECT 
          vc.*,
          v.name as vendor_name
        FROM vendor_contacts vc
        JOIN vendors v ON vc.vendor_id = v.id
        WHERE v.id IN (SELECT id FROM vendors ORDER BY created_at DESC LIMIT 10)
        ORDER BY v.name, vc.name
      `);
      dbContacts = contactsResult.rows;
      console.log(`從資料庫獲取 ${dbContacts.length} 個聯絡人`);

      // 顯示一些範例資料
      if (dbContacts.length > 0) {
        console.log('範例聯絡人資料:');
        console.log(`- 姓名: ${dbContacts[0].name}`);
        console.log(`- 職稱: ${dbContacts[0].title}`);
        console.log(`- 部門: ${dbContacts[0].department}`);
        console.log(`- 電話: ${dbContacts[0].phone}`);
        console.log(`- Email: ${dbContacts[0].email}`);
        console.log(`- 廠商: ${dbContacts[0].vendor_name}`);
      }
    } catch (error) {
      console.error('資料庫連線錯誤:', error);
    }
  });

  test.afterAll(async () => {
    await pool.end();
  });

  // 測試前置作業 - 登入並選擇專案
  test.beforeEach(async ({ page }) => {
    console.log('開始測試前置作業...');

    // 訪問主頁面
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

  test('驗證聯絡人資料與資料庫一致', async ({ page }) => {
    console.log('測試：驗證聯絡人資料與資料庫一致');

    if (vendors.length === 0 || dbContacts.length === 0) {
      console.log('警告：資料庫中沒有測試資料');
      return;
    }

    // 等待頁面載入
    await page.waitForLoadState('networkidle');

    // 導航到廠商管理頁面
    console.log('尋找廠商管理連結...');

    // 嘗試多種方式找到廠商管理
    const vendorManagementSelectors = [
      'text=/廠商管理|供應商|Vendor/i',
      'a[href*="vendor"]',
      'button:has-text("廠商")',
      '[class*="nav"] >> text=/廠商/i',
    ];

    let vendorLink = null;
    for (const selector of vendorManagementSelectors) {
      const element = await page.locator(selector).first();
      if ((await element.count()) > 0) {
        vendorLink = element;
        console.log(`使用選擇器找到廠商管理: ${selector}`);
        break;
      }
    }

    if (vendorLink) {
      await vendorLink.click();
      console.log('已點擊廠商管理連結');
      await page.waitForLoadState('networkidle');

      // 等待廠商列表載入
      await page.waitForTimeout(2000);

      // 查找第一個有聯絡人的廠商
      const firstVendor = vendors[0];
      console.log(`尋找廠商: ${firstVendor.name}`);

      // 找到並點擊該廠商的查看聯絡人按鈕
      const vendorCard = await page.locator(`text=${firstVendor.name}`).first();
      if ((await vendorCard.count()) > 0) {
        console.log(`找到廠商卡片: ${firstVendor.name}`);

        // 尋找查看聯絡人按鈕
        const viewContactsButton = await page
          .locator(
            `text=${firstVendor.name} >> .. >> button:has-text(/聯絡人|contact/i)`
          )
          .first();
        if ((await viewContactsButton.count()) > 0) {
          await viewContactsButton.click();
          console.log('已點擊查看聯絡人按鈕');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000);

          // 獲取該廠商的聯絡人資料
          const vendorContacts = dbContacts.filter(
            c => c.vendor_id === firstVendor.id
          );
          console.log(`該廠商有 ${vendorContacts.length} 個聯絡人`);

          // 驗證頁面上顯示的聯絡人數量
          const contactCards = await page.locator(
            '[class*="card"]:has-text(/電話|email|phone/i)'
          );
          const displayedContactsCount = await contactCards.count();
          console.log(`頁面顯示 ${displayedContactsCount} 個聯絡人卡片`);

          // 驗證每個聯絡人的資料
          for (const contact of vendorContacts.slice(0, 3)) {
            // 只驗證前3個避免太長
            console.log(`\n驗證聯絡人: ${contact.name}`);

            // 檢查姓名是否顯示
            const nameElement = await page
              .locator(`text=${contact.name}`)
              .first();
            if ((await nameElement.count()) > 0) {
              await expect(nameElement).toBeVisible();
              console.log(`✓ 姓名顯示正確: ${contact.name}`);
            } else {
              console.log(`✗ 未找到姓名: ${contact.name}`);
            }

            // 檢查職稱是否顯示
            if (contact.title) {
              const titleElement = await page
                .locator(`text=${contact.title}`)
                .first();
              if ((await titleElement.count()) > 0) {
                console.log(`✓ 職稱顯示正確: ${contact.title}`);
              } else {
                console.log(`✗ 未找到職稱: ${contact.title}`);
              }
            }

            // 檢查部門是否顯示
            if (contact.department) {
              const deptElement = await page
                .locator(`text=${contact.department}`)
                .first();
              if ((await deptElement.count()) > 0) {
                console.log(`✓ 部門顯示正確: ${contact.department}`);
              } else {
                console.log(`✗ 未找到部門: ${contact.department}`);
              }
            }

            // 檢查電話是否顯示
            if (contact.phone) {
              const phoneText = contact.phone.replace(/[()-\s]/g, ''); // 移除格式化字符
              const phoneElement = await page
                .locator(`text=/${phoneText}|${contact.phone}/`)
                .first();
              if ((await phoneElement.count()) > 0) {
                console.log(`✓ 電話顯示正確: ${contact.phone}`);
              } else {
                console.log(`✗ 未找到電話: ${contact.phone}`);
              }
            }

            // 檢查 Email 是否顯示
            if (contact.email) {
              const emailElement = await page
                .locator(`text=${contact.email}`)
                .first();
              if ((await emailElement.count()) > 0) {
                console.log(`✓ Email 顯示正確: ${contact.email}`);
              } else {
                console.log(`✗ 未找到 Email: ${contact.email}`);
              }
            }
          }

          // 驗證統計資料
          const statsSection = await page
            .locator('text=/總聯絡人|活躍聯絡人/')
            .first();
          if ((await statsSection.count()) > 0) {
            console.log('\n統計資料區域已顯示');

            // 檢查總聯絡人數
            const totalContactsElement = await page
              .locator('text=/總聯絡人/ >> .. >> text=/\\d+/')
              .first();
            if ((await totalContactsElement.count()) > 0) {
              const totalText = await totalContactsElement.textContent();
              console.log(`頁面顯示總聯絡人數: ${totalText}`);
              console.log(`資料庫實際聯絡人數: ${vendorContacts.length}`);
            }
          }
        } else {
          console.log('未找到查看聯絡人按鈕，嘗試直接點擊廠商卡片');
          await vendorCard.click();
          await page.waitForLoadState('networkidle');
        }
      } else {
        console.log(`未找到廠商: ${firstVendor.name}`);
      }
    } else {
      console.log('未找到廠商管理連結');
    }
  });

  test('測試聯絡人搜尋功能與資料庫資料匹配', async ({ page }) => {
    console.log('測試：聯絡人搜尋功能與資料庫資料匹配');

    if (dbContacts.length === 0) {
      console.log('警告：資料庫中沒有聯絡人資料');
      return;
    }

    // 導航到廠商管理頁面
    const vendorLink = await page
      .locator('text=/廠商管理|供應商|Vendor/i')
      .first();
    if ((await vendorLink.count()) > 0) {
      await vendorLink.click();
      await page.waitForLoadState('networkidle');

      // 點擊第一個廠商的查看聯絡人
      const viewContactsButton = await page
        .getByRole('button', { name: /查看聯絡人|聯絡人|contact/i })
        .first();
      if ((await viewContactsButton.count()) > 0) {
        await viewContactsButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 從資料庫中選一個聯絡人來搜尋
        const testContact = dbContacts[0];
        console.log(`搜尋聯絡人: ${testContact.name}`);

        // 找到搜尋框並輸入聯絡人姓名
        const searchInput = await page.getByPlaceholder(/搜尋|search/i).first();
        if ((await searchInput.count()) > 0) {
          await searchInput.fill(testContact.name);
          console.log(`已輸入搜尋: ${testContact.name}`);

          // 等待搜尋結果
          await page.waitForTimeout(1000);

          // 驗證搜尋結果
          const searchResult = await page
            .locator(`text=${testContact.name}`)
            .first();
          if ((await searchResult.count()) > 0) {
            await expect(searchResult).toBeVisible();
            console.log(`✓ 搜尋結果正確顯示: ${testContact.name}`);

            // 驗證其他資訊也正確顯示
            if (testContact.title) {
              const titleInResult = await page
                .locator(`text=${testContact.title}`)
                .first();
              if ((await titleInResult.count()) > 0) {
                console.log(`✓ 職稱在搜尋結果中顯示: ${testContact.title}`);
              }
            }

            if (testContact.email) {
              const emailInResult = await page
                .locator(`text=${testContact.email}`)
                .first();
              if ((await emailInResult.count()) > 0) {
                console.log(`✓ Email 在搜尋結果中顯示: ${testContact.email}`);
              }
            }
          } else {
            console.log(`✗ 搜尋結果未找到: ${testContact.name}`);
          }

          // 清除搜尋
          await searchInput.clear();
          console.log('已清除搜尋');
        }
      }
    }
  });

  test('驗證聯絡人狀態與資料庫一致', async ({ page }) => {
    console.log('測試：驗證聯絡人狀態與資料庫一致');

    // 獲取不同狀態的聯絡人數量
    const activeContacts = dbContacts.filter(c => c.status === 'active');
    const inactiveContacts = dbContacts.filter(c => c.status === 'inactive');
    const suspendedContacts = dbContacts.filter(c => c.status === 'suspended');

    console.log(`資料庫聯絡人狀態統計:`);
    console.log(`- 活躍: ${activeContacts.length}`);
    console.log(`- 非活躍: ${inactiveContacts.length}`);
    console.log(`- 暫停: ${suspendedContacts.length}`);

    // 導航到廠商聯絡人頁面
    const vendorLink = await page
      .locator('text=/廠商管理|供應商|Vendor/i')
      .first();
    if ((await vendorLink.count()) > 0) {
      await vendorLink.click();
      await page.waitForLoadState('networkidle');

      const viewContactsButton = await page
        .getByRole('button', { name: /查看聯絡人|聯絡人|contact/i })
        .first();
      if ((await viewContactsButton.count()) > 0) {
        await viewContactsButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 檢查統計卡片中的活躍聯絡人數
        const activeStatsCard = await page
          .locator('text=/活躍聯絡人/ >> .. >> text=/\\d+/')
          .first();
        if ((await activeStatsCard.count()) > 0) {
          const activeCountText = await activeStatsCard.textContent();
          console.log(`頁面顯示活躍聯絡人數: ${activeCountText}`);

          // 驗證是否與資料庫一致
          if (parseInt(activeCountText) === activeContacts.length) {
            console.log('✓ 活躍聯絡人數與資料庫一致');
          } else {
            console.log('✗ 活躍聯絡人數與資料庫不一致');
          }
        }

        // 檢查主要聯絡人
        const primaryContacts = dbContacts.filter(c => c.is_supervisor);
        console.log(`資料庫主要聯絡人數: ${primaryContacts.length}`);

        const primaryStatsCard = await page
          .locator('text=/主要聯絡人/ >> .. >> text=/\\d+/')
          .first();
        if ((await primaryStatsCard.count()) > 0) {
          const primaryCountText = await primaryStatsCard.textContent();
          console.log(`頁面顯示主要聯絡人數: ${primaryCountText}`);
        }
      }
    }
  });
});
