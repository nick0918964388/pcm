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

async function createVendorContactsTable() {
  const client = new Client(dbConfig);

  try {
    console.log('🔌 連接資料庫...');
    await client.connect();
    console.log('✅ 資料庫連接成功！');

    // 讀取 SQL 腳本
    const sqlPath = path.join(__dirname, 'create-vendor-contacts-table.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 執行廠商聯絡人表創建腳本...');

    // 執行 SQL 腳本
    await client.query(sqlScript);

    console.log('🎉 廠商聯絡人表創建完成！');

    // 檢查表結構
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vendor_contacts' 
      ORDER BY ordinal_position
    `);

    console.log(`\n📋 vendor_contacts 表結構:`);
    tableInfo.rows.forEach(row => {
      console.log(
        `   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`
      );
    });

    // 檢查枚舉類型
    const enumTypes = await client.query(`
      SELECT 
        t.typname as enum_name,
        string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname IN ('contact_position', 'contact_status')
      GROUP BY t.typname
      ORDER BY t.typname
    `);

    console.log(`\n🏷️ 相關枚舉類型:`);
    enumTypes.rows.forEach(row => {
      console.log(`   - ${row.enum_name}: ${row.enum_values}`);
    });
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 資料庫連接已關閉');
  }
}

createVendorContactsTable().catch(console.error);
