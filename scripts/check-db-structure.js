#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: '192.168.1.183',
  port: 30432,
  database: 'app_db',
  user: 'admin',
  password: 'XcW04ByX6GbVdt1gw4EJ5XRY',
  ssl: { rejectUnauthorized: false }
};

async function checkDbStructure() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 連接資料庫...');
    await client.connect();
    console.log('✅ 資料庫連接成功！');

    // 檢查 vendors 表結構
    console.log('\n📋 檢查 vendors 表結構:');
    const vendorsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vendors' 
      ORDER BY ordinal_position
    `);
    
    if (vendorsColumns.rows.length === 0) {
      console.log('❌ vendors 表不存在');
    } else {
      vendorsColumns.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }

    // 檢查 vendor_contacts 表結構
    console.log('\n📋 檢查 vendor_contacts 表結構:');
    const contactsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'vendor_contacts' 
      ORDER BY ordinal_position
    `);
    
    if (contactsColumns.rows.length === 0) {
      console.log('❌ vendor_contacts 表不存在');
    } else {
      contactsColumns.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }

    // 列出所有表
    console.log('\n📊 資料庫中的所有表:');
    const allTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    allTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 資料庫連接已關閉');
  }
}

checkDbStructure().catch(console.error);