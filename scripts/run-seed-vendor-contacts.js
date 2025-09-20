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
  ssl: { rejectUnauthorized: false }
};

async function seedVendorContacts() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 連接資料庫...');
    await client.connect();
    console.log('✅ 資料庫連接成功！');

    // 讀取 SQL 腳本
    const sqlPath = path.join(__dirname, 'seed-vendor-contacts-data.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 執行廠商聯絡人測試資料插入腳本...');
    
    // 執行 SQL 腳本
    await client.query(sqlScript);
    
    console.log('🎉 廠商聯絡人測試資料插入完成！');
    
    // 查詢結果統計
    const contactCount = await client.query("SELECT COUNT(*) as count FROM vendor_contacts");
    console.log(`📊 統計結果:`);
    console.log(`   - 聯絡人總數: ${contactCount.rows[0].count}`);
    
    // 顯示聯絡人職位分布
    const positionDistribution = await client.query(`
      SELECT position, COUNT(*) as count 
      FROM vendor_contacts 
      GROUP BY position 
      ORDER BY count DESC
    `);
    
    console.log(`\n📈 聯絡人職位分布:`);
    positionDistribution.rows.forEach(row => {
      console.log(`   - ${row.position}: ${row.count} 人`);
    });
    
    // 顯示聯絡人狀態分布
    const statusDistribution = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM vendor_contacts 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    console.log(`\n🚦 聯絡人狀態分布:`);
    statusDistribution.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.count} 人`);
    });

    // 顯示每個廠商的聯絡人數量
    const vendorContactCount = await client.query(`
      SELECT v.name, COUNT(vc.id) as contact_count
      FROM vendors v
      LEFT JOIN vendor_contacts vc ON v.id = vc.vendor_id
      WHERE vc.id IS NOT NULL
      GROUP BY v.id, v.name
      ORDER BY contact_count DESC
    `);
    
    console.log(`\n👥 各廠商聯絡人數量:`);
    vendorContactCount.rows.forEach(row => {
      console.log(`   - ${row.name}: ${row.contact_count} 人`);
    });

    // 顯示最近新增的聯絡人
    const recentContacts = await client.query(`
      SELECT vc.name, vc.title, vc.position, v.name as vendor_name
      FROM vendor_contacts vc
      JOIN vendors v ON vc.vendor_id = v.id
      ORDER BY vc.created_at DESC 
      LIMIT 8
    `);
    
    console.log(`\n🆕 最近新增的聯絡人（前8位）:`);
    recentContacts.rows.forEach((contact, index) => {
      console.log(`   ${index + 1}. ${contact.name} (${contact.title}) - ${contact.vendor_name} [${contact.position}]`);
    });

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    if (error.message.includes('duplicate key value')) {
      console.log('💡 提示: 部分聯絡人可能已存在，這是正常的。');
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 資料庫連接已關閉');
  }
}

seedVendorContacts().catch(console.error);