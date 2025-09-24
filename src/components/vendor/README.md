# 廠商通訊錄組件系統

基於 UX 研究的全新廠商通訊錄系統，提供直觀的兩階段導航體驗。

## 組件概覽

### 主要頁面組件

#### 1. VendorSelectionPage - 廠商選擇頁面

廠商列表的主頁面，提供卡片式廠商展示和篩選功能。

**功能特性：**

- 📊 廠商統計儀錶板
- 🔍 強大的搜尋和篩選功能
- 📱 響應式網格/列表檢視切換
- ✨ 直觀的卡片式廠商展示

**使用方式：**

```tsx
import { VendorSelectionPage } from '@/components/vendor';

<VendorSelectionPage
  vendors={vendors}
  onVendorSelect={handleVendorSelect}
  onAddVendor={handleAddVendor}
  loading={false}
/>;
```

#### 2. VendorContactsPage - 人員清單頁面

顯示特定廠商的所有聯絡人，包含廠商資訊概覽。

**功能特性：**

- 🏢 廠商資訊概覽卡片
- 👥 聯絡人統計儀錶板
- 🔍 聯絡人搜尋和篩選
- 📞 直接撥號和發郵件功能

**使用方式：**

```tsx
import { VendorContactsPage } from '@/components/vendor';

<VendorContactsPage
  vendor={selectedVendor}
  contacts={vendorContacts}
  onBack={handleBack}
  onVendorSwitch={handleVendorSwitch}
  onAddContact={handleAddContact}
  onEditContact={handleEditContact}
  onCallContact={handleCallContact}
  onEmailContact={handleEmailContact}
/>;
```

### 卡片組件

#### 3. VendorCard - 廠商卡片

顯示廠商基本資訊的卡片組件。

**功能特性：**

- 📋 廠商基本資訊展示
- 🏷️ 類型和狀態標籤
- 📊 聯絡人數量和最後聯絡時間
- 🎨 懸停效果和點擊互動

#### 4. ContactCard - 聯絡人卡片

顯示聯絡人詳細資訊的卡片組件。

**功能特性：**

- 👤 聯絡人基本資訊
- 📞 電話和手機號碼
- 📧 電子郵件地址
- ⭐ 主要聯絡人標識
- 🎯 快速操作按鈕

### 篩選組件

#### 5. VendorFilter - 廠商篩選器

提供廠商列表的搜尋和篩選功能。

**篩選選項：**

- 🔍 文字搜尋
- 🏷️ 廠商類型
- 📊 廠商狀態
- 📈 排序選項

#### 6. ContactFilter - 聯絡人篩選器

提供聯絡人列表的搜尋和篩選功能。

**篩選選項：**

- 🔍 文字搜尋
- 🏢 部門篩選
- ⭐ 主要聯絡人篩選
- ✅ 活躍狀態篩選

## 數據類型

### Vendor - 廠商資料結構

```typescript
interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  status: VendorStatus;
  contactCount: number;
  lastContactDate?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Contact - 聯絡人資料結構

```typescript
interface Contact {
  id: string;
  vendorId: string;
  name: string;
  title: string;
  department?: string;
  phone: string;
  email: string;
  mobile?: string;
  extension?: string;
  isActive: boolean;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 使用範例

### 完整的廠商通訊錄頁面

```tsx
'use client';

import { useState } from 'react';
import { VendorSelectionPage, VendorContactsPage } from '@/components/vendor';
import { mockVendors, mockContacts } from '@/lib/mock-vendor-data';

export default function VendorsPage() {
  const [viewState, setViewState] = useState<ViewState>({ type: 'selection' });

  if (viewState.type === 'selection') {
    return (
      <VendorSelectionPage
        vendors={vendors}
        onVendorSelect={vendor => setViewState({ type: 'contacts', vendor })}
        onAddVendor={handleAddVendor}
      />
    );
  }

  return (
    <VendorContactsPage
      vendor={viewState.vendor}
      contacts={vendorContacts}
      onBack={() => setViewState({ type: 'selection' })}
      onAddContact={handleAddContact}
      onEditContact={handleEditContact}
      onCallContact={handleCallContact}
      onEmailContact={handleEmailContact}
    />
  );
}
```

## 設計系統整合

所有組件都遵循項目的設計系統：

- 🎨 使用 shadcn/ui 組件庫
- 🎯 一致的顏色方案 (`#00645A` 主色調)
- 📱 響應式設計
- ♿ 無障礙設計標準
- 🚀 優化的效能表現

## 特色功能

### 🔍 智能搜尋

- 支援廠商名稱、描述、聯絡資訊的全文搜尋
- 即時搜尋結果更新

### 🏷️ 多層篩選

- 廠商類型篩選（主要承攬商、設備供應商等）
- 狀態篩選（活躍、非活躍、待審核、暫停）
- 聯絡人特性篩選（主要聯絡人、活躍狀態）

### 📊 統計儀錶板

- 廠商數量統計
- 聯絡人數量統計
- 狀態分佈統計

### 🎛️ 檢視模式

- 網格檢視：適合瀏覽和比較
- 列表檢視：適合詳細資訊查看

### 📞 快速操作

- 一鍵撥號功能
- 直接發送郵件
- 複製聯絡資訊到剪貼板

## 測試和示例

使用 `VendorDemo` 組件來測試所有功能：

```tsx
import { VendorDemo } from '@/components/vendor/VendorDemo';

export default function TestPage() {
  return <VendorDemo />;
}
```

## 自訂化

所有組件都支援 props 自訂化，可以根據需求調整：

- 自訂顏色主題
- 自訂欄位顯示
- 自訂操作按鈕
- 自訂篩選選項
