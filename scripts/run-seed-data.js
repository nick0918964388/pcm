#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 資料庫連線設定
const dbConfig = {
  host: '192.168.1.183',
  port: 30432,
  database: 'app_db',
  user: 'admin',
  password: 'XcW04ByX6GbVdt1gw4EJ5XRY',
  ssl: { rejectUnauthorized: false },
};

async function runSeedData() {
  const client = new Client(dbConfig);

  try {
    console.log('🔌 連接資料庫...');
    await client.connect();
    console.log('✅ 資料庫連接成功！');

    // 讀取 SQL 腳本
    const sqlPath = path.join(__dirname, 'seed-vendor-test-data.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 執行測試資料插入腳本...');

    // 執行 SQL 腳本
    await client.query(sqlScript);

    console.log('🎉 測試資料插入完成！');

    // 查詢結果統計
    const vendorCount = await client.query(
      "SELECT COUNT(*) as count FROM vendors WHERE code LIKE 'TEST%'"
    );
    const contactCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM vendor_contacts 
      WHERE vendor_id IN (SELECT id FROM vendors WHERE code LIKE 'TEST%')
    `);

    console.log(`📊 統計結果:`);
    console.log(`   - 廠商數量: ${vendorCount.rows[0].count}`);
    console.log(`   - 聯絡人數量: ${contactCount.rows[0].count}`);

    // 顯示廠商類型分布
    const typeDistribution = await client.query(`
      SELECT type, COUNT(*) as count 
      FROM vendors 
      WHERE code LIKE 'TEST%' 
      GROUP BY type 
      ORDER BY count DESC
    `);

    console.log(`\n📈 廠商類型分布:`);
    typeDistribution.rows.forEach(row => {
      console.log(`   - ${row.type}: ${row.count} 家`);
    });

    // 顯示聯絡人狀態分布
    const statusDistribution = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM vendor_contacts 
      WHERE vendor_id IN (SELECT id FROM vendors WHERE code LIKE 'TEST%')
      GROUP BY status 
      ORDER BY count DESC
    `);

    console.log(`\n👥 聯絡人狀態分布:`);
    statusDistribution.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} 位`);
    });
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 資料庫連接已關閉');
  }
}

// 檢查是否直接執行此腳本
if (require.main === module) {
  runSeedData().catch(console.error);
}

module.exports = { runSeedData };
