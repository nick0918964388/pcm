'use client';

import * as React from 'react';
import { Button, Input, Select } from '@/components/ui';
import {
  DataTable,
  DashboardWidget,
  FilterBar,
  ChartComponent,
  Modal,
  ConfirmModal,
  Column,
  FilterConfig,
} from '@/components/shared';

interface TestUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

const testUsers: TestUser[] = [
  {
    id: 1,
    name: '張三',
    email: 'zhang@example.com',
    role: '專案經理',
    status: 'active',
  },
  {
    id: 2,
    name: '李四',
    email: 'li@example.com',
    role: '工程師',
    status: 'active',
  },
  {
    id: 3,
    name: '王五',
    email: 'wang@example.com',
    role: '品管員',
    status: 'inactive',
  },
];

const chartData = [
  { name: '1月', value: 400 },
  { name: '2月', value: 300 },
  { name: '3月', value: 500 },
  { name: '4月', value: 280 },
  { name: '5月', value: 590 },
  { name: '6月', value: 320 },
];

const pieData = [
  { name: '已完成', value: 400 },
  { name: '進行中', value: 300 },
  { name: '待開始', value: 200 },
];

export default function ComponentsTestPage() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [filterValues, setFilterValues] = React.useState<Record<string, any>>(
    {}
  );

  const columns: Column<TestUser>[] = [
    {
      key: 'name',
      title: '姓名',
      sortable: true,
    },
    {
      key: 'email',
      title: '電子信箱',
      sortable: true,
    },
    {
      key: 'role',
      title: '職位',
    },
    {
      key: 'status',
      title: '狀態',
      render: value => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            value === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value === 'active' ? '啟用' : '停用'}
        </span>
      ),
    },
  ];

  const filterConfigs: FilterConfig[] = [
    {
      key: 'name',
      type: 'text',
      label: '姓名',
      placeholder: '請輸入姓名',
    },
    {
      key: 'role',
      type: 'select',
      label: '職位',
      placeholder: '請選擇職位',
      options: [
        { value: 'manager', label: '專案經理' },
        { value: 'engineer', label: '工程師' },
        { value: 'qa', label: '品管員' },
      ],
    },
    {
      key: 'dateRange',
      type: 'dateRange',
      label: '建立日期',
    },
  ];

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterReset = () => {
    setFilterValues({});
  };

  return (
    <div className='space-y-8'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold text-gray-900'>共用元件測試</h1>
        <div className='text-sm text-gray-500'>測試所有已建立的元件功能</div>
      </div>

      {/* 基礎UI元件測試 */}
      <section className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900'>基礎UI元件</h2>

        <div className='bg-white p-6 rounded-lg shadow space-y-4'>
          <h3 className='font-medium text-gray-900'>按鈕變體</h3>
          <div className='flex flex-wrap gap-3'>
            <Button variant='default'>主要按鈕</Button>
            <Button variant='secondary'>次要按鈕</Button>
            <Button variant='outline'>外框按鈕</Button>
            <Button variant='ghost'>透明按鈕</Button>
            <Button variant='destructive'>危險按鈕</Button>
            <Button variant='default'>載入中...</Button>
          </div>

          <h3 className='font-medium text-gray-900'>輸入框</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Input label='姓名' placeholder='請輸入姓名' />
            <Input label='電子信箱' type='email' placeholder='請輸入電子信箱' />
            <Input
              label='錯誤示例'
              error='此欄位為必填'
              placeholder='有錯誤的輸入框'
            />
            <Select
              label='職位'
              placeholder='請選擇職位'
              options={[
                { value: 'manager', label: '專案經理' },
                { value: 'engineer', label: '工程師' },
                { value: 'qa', label: '品管員' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* DashboardWidget測試 */}
      <section className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900'>儀表板小工具</h2>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <DashboardWidget
            title='總專案數'
            value={24}
            subtitle='個專案'
            trend={{ value: 12, label: '較上月', direction: 'up' }}
          />
          <DashboardWidget
            title='今日出工'
            value={156}
            subtitle='人員'
            trend={{ value: 5, label: '較昨日', direction: 'down' }}
          />
          <DashboardWidget
            title='品質分數'
            value='4.2/5'
            subtitle='平均分數'
            trend={{ value: 0, label: '無變化', direction: 'neutral' }}
          />
          <DashboardWidget title='載入示例' value={0} loading={true} />
        </div>
      </section>

      {/* FilterBar測試 */}
      <section className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900'>篩選器</h2>

        <FilterBar
          filters={filterConfigs}
          values={filterValues}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
          onSearch={() => console.log('搜尋:', filterValues)}
        />
      </section>

      {/* DataTable測試 */}
      <section className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900'>資料表格</h2>

        <DataTable
          columns={columns}
          data={testUsers}
          pagination={{
            current: 1,
            pageSize: 10,
            total: 100,
            onChange: (page, pageSize) =>
              console.log('分頁變更:', page, pageSize),
          }}
          onSort={(key, direction) => console.log('排序:', key, direction)}
        />
      </section>

      {/* Chart測試 */}
      <section className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900'>圖表元件</h2>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <ChartComponent
            type='bar'
            data={chartData}
            title='月度統計 - 長條圖'
          />
          <ChartComponent
            type='line'
            data={chartData}
            title='趨勢分析 - 線圖'
          />
          <ChartComponent type='pie' data={pieData} title='專案狀態 - 圓餅圖' />
          <ChartComponent type='bar' data={[]} title='空資料示例' />
        </div>
      </section>

      {/* Modal測試 */}
      <section className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900'>彈出視窗</h2>

        <div className='bg-white p-6 rounded-lg shadow'>
          <div className='flex space-x-4'>
            <Button onClick={() => setModalOpen(true)}>開啟Modal</Button>
            <Button
              variant='destructive'
              onClick={() => setConfirmModalOpen(true)}
            >
              開啟確認對話框
            </Button>
          </div>
        </div>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title='測試Modal'
          footer={
            <>
              <Button variant='outline' onClick={() => setModalOpen(false)}>
                取消
              </Button>
              <Button onClick={() => setModalOpen(false)}>確定</Button>
            </>
          }
        >
          <p>這是一個測試用的Modal內容。</p>
          <p className='mt-2'>你可以在這裡放置任何內容，包括表單、圖表等等。</p>
        </Modal>

        <ConfirmModal
          open={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={() => {
            console.log('確認操作');
            setConfirmModalOpen(false);
          }}
          title='刪除確認'
          message='您確定要刪除這個項目嗎？此操作無法復原。'
          type='danger'
          confirmText='刪除'
        />
      </section>
    </div>
  );
}
