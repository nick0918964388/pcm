'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VendorCard } from './VendorCard'
import { ContactCard } from './ContactCard'
import { mockVendors, mockContacts } from '@/lib/mock-vendor-data'

/**
 * 廠商組件示例展示頁面
 * 用於測試和展示所有廠商相關組件的功能
 */
export function VendorDemo() {
  const [selectedVendor, setSelectedVendor] = useState(mockVendors[0])

  const vendorContacts = mockContacts.filter(
    contact => contact.vendorId === selectedVendor.id
  )

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">廠商組件展示</h1>
        <p className="text-[#595959]">展示廠商通訊錄系統中的各種組件</p>
      </div>

      {/* 廠商卡片展示 */}
      <Card>
        <CardHeader>
          <CardTitle>廠商卡片組件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockVendors.slice(0, 3).map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onClick={setSelectedVendor}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 選中廠商的詳細資訊 */}
      <Card>
        <CardHeader>
          <CardTitle>選中的廠商：{selectedVendor.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">廠商資訊</h3>
              <p><strong>類型：</strong>{selectedVendor.type}</p>
              <p><strong>狀態：</strong>{selectedVendor.status}</p>
              <p><strong>聯絡人數：</strong>{selectedVendor.contactCount}</p>
              <p><strong>電話：</strong>{selectedVendor.phone || '未提供'}</p>
              <p><strong>信箱：</strong>{selectedVendor.email || '未提供'}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">描述</h3>
              <p className="text-sm text-[#595959]">
                {selectedVendor.description || '無描述'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 聯絡人卡片展示 */}
      <Card>
        <CardHeader>
          <CardTitle>聯絡人卡片組件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendorContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={(contact) => console.log('Edit:', contact.name)}
                onCall={(phone) => console.log('Call:', phone)}
                onEmail={(email) => console.log('Email:', email)}
              />
            ))}
          </div>
          {vendorContacts.length === 0 && (
            <p className="text-center text-[#8C8C8C]">此廠商暫無聯絡人資料</p>
          )}
        </CardContent>
      </Card>

      {/* 廠商選擇器 */}
      <Card>
        <CardHeader>
          <CardTitle>切換廠商</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mockVendors.map((vendor) => (
              <Button
                key={vendor.id}
                variant={selectedVendor.id === vendor.id ? "default" : "outline"}
                onClick={() => setSelectedVendor(vendor)}
                className="text-sm"
              >
                {vendor.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}