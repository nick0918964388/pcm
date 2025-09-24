#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: '192.168.1.183',
  port: 30432,
  database: 'app_db',
  user: 'admin',
  password: 'XcW04ByX6GbVdt1gw4EJ5XRY',
  ssl: { rejectUnauthorized: false },
};

async function runSimpleSeed() {
  const client = new Client(dbConfig);

  try {
    console.log('🔌 連接資料庫...');
    await client.connect();
    console.log('✅ 資料庫連接成功！');

    // 讀取正確版 SQL 腳本
    const sqlPath = path.join(__dirname, 'seed-correct-vendor-data.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 執行廠商測試資料插入腳本...');

    // 執行 SQL 腳本
    await client.query(sqlScript);

    console.log('🎉 廠商測試資料插入完成！');

    // 查詢結果統計
    const vendorCount = await client.query(
      'SELECT COUNT(*) as count FROM vendors'
    );

    console.log(`📊 統計結果:`);
    console.log(`   - 廠商總數: ${vendorCount.rows[0].count}`);

    // 顯示廠商類型分布
    const typeDistribution = await client.query(`
      SELECT type, COUNT(*) as count 
      FROM vendors 
      GROUP BY type 
      ORDER BY count DESC
    `);

    console.log(`\n📈 廠商類型分布:`);
    typeDistribution.rows.forEach(row => {
      console.log(`   - ${row.type}: ${row.count} 家`);
    });

    // 顯示廠商狀態分布
    const statusDistribution = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM vendors 
      GROUP BY status 
      ORDER BY count DESC
    `);

    console.log(`\n🚦 廠商狀態分布:`);
    statusDistribution.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} 家`);
    });

    // 顯示評分分布
    const ratingStats = await client.query(`
      SELECT 
        ROUND(AVG(rating), 2) as avg_rating,
        MIN(rating) as min_rating,
        MAX(rating) as max_rating
      FROM vendors 
      WHERE rating IS NOT NULL
    `);

    console.log(`\n⭐ 評分統計:`);
    if (ratingStats.rows[0].avg_rating) {
      console.log(`   - 平均評分: ${ratingStats.rows[0].avg_rating}`);
      console.log(`   - 最低評分: ${ratingStats.rows[0].min_rating}`);
      console.log(`   - 最高評分: ${ratingStats.rows[0].max_rating}`);
    }

    // 顯示最近新增的廠商
    const recentVendors = await client.query(`
      SELECT name, type, status, rating
      FROM vendors 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log(`\n🆕 最近新增的廠商（前5家）:`);
    recentVendors.rows.forEach((vendor, index) => {
      console.log(
        `   ${index + 1}. ${vendor.name} (${vendor.type}, ${vendor.status}) - 評分: ${vendor.rating || 'N/A'}`
      );
    });
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    if (error.message.includes('duplicate key value')) {
      console.log('💡 提示: 部分廠商可能已存在，這是正常的。');
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 資料庫連接已關閉');
  }
}

runSimpleSeed().catch(console.error);
