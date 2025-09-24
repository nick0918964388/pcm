'use client';

import * as React from 'react';
import { Button, Input, Select } from '@/components/ui';
import {
  DataTable,
  Column,
  FilterBar,
  FilterConfig,
  Modal,
} from '@/components/shared';

interface Contact {
  id: number;
  name: string;
  company: string;
  role: string;
  phone: string;
  email: string;
  type: string;
  mobile?: string;
  department?: string;
  workArea?: string;
  status?: 'active' | 'inactive' | 'onLeave';
}

export default function VendorContactsPage() {
  const [filterValues, setFilterValues] = React.useState<Record<string, any>>(
    {}
  );
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [allContacts] = React.useState<Contact[]>([
    {
      id: 1,
      name: '張建國',
      company: '大成營造',
      role: '專案經理',
      phone: '0912-345-678',
      mobile: '02-2345-6789',
      email: 'zhang@dacheng.com',
      type: '結構廠商',
      department: '工程部',
      workArea: 'F20P1',
      status: 'active',
    },
    {
      id: 2,
      name: '李明華',
      company: '台電工程',
      role: '工地主任',
      phone: '0923-456-789',
      mobile: '02-2456-7890',
      email: 'li@taipower.com',
      type: '機電廠商',
      department: '機電部',
      workArea: 'AP8P1',
      status: 'active',
    },
    {
      id: 3,
      name: '王美玲',
      company: '精工裝修',
      role: '設計師',
      phone: '0934-567-890',
      mobile: '02-2567-8901',
      email: 'wang@jinggong.com',
      type: '裝修廠商',
      department: '設計部',
      workArea: 'F22P1',
      status: 'active',
    },
    {
      id: 4,
      name: '陳志強',
      company: '中鼎工程',
      role: '資深技師',
      phone: '0945-678-901',
      mobile: '02-2678-9012',
      email: 'chen@ctci.com',
      type: '機電廠商',
      department: '技術部',
      workArea: 'AP6B',
      status: 'onLeave',
    },
    {
      id: 5,
      name: '林淑芬',
      company: '潤泰營造',
      role: '安衛管理員',
      phone: '0956-789-012',
      mobile: '02-2789-0123',
      email: 'lin@ruentex.com',
      type: '結構廠商',
      department: '安衛部',
      workArea: 'F20P1',
      status: 'inactive',
    },
  ]);

  // 實際篩選聯絡人
  const filteredContacts = React.useMemo(() => {
    let filtered = allContacts;

    // 關鍵字搜尋
    if (filterValues.keyword?.trim()) {
      const keyword = filterValues.keyword.toLowerCase();
      filtered = filtered.filter(
        contact =>
          contact.name.toLowerCase().includes(keyword) ||
          contact.company.toLowerCase().includes(keyword) ||
          contact.email.toLowerCase().includes(keyword) ||
          contact.phone.includes(keyword) ||
          (contact.mobile && contact.mobile.includes(keyword))
      );
    }

    // 廠商類型篩選
    if (filterValues.type && filterValues.type !== 'all') {
      const typeMap: Record<string, string> = {
        structure: '結構廠商',
        electric: '機電廠商',
        decoration: '裝修廠商',
      };
      filtered = filtered.filter(
        contact => contact.type === typeMap[filterValues.type]
      );
    }

    return filtered;
  }, [allContacts, filterValues]);

  // 狀態顯示組件
  const StatusBadge = ({ status }: { status: Contact['status'] }) => {
    if (!status) return null;

    const statusConfig = {
      active: { label: '在職', color: 'bg-green-100 text-green-800' },
      onLeave: { label: '休假', color: 'bg-yellow-100 text-yellow-800' },
      inactive: { label: '離職', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      title: '姓名',
      width: '120px',
      sortable: true,
      render: (value, record) => (
        <div className='font-medium text-[#1A1A1A]'>
          {value}
          <div className='text-xs text-[#8C8C8C] mt-1'>{record.role}</div>
        </div>
      ),
    },
    {
      key: 'company',
      title: '公司',
      width: '180px',
      sortable: true,
      render: (value, record) => (
        <div>
          <div className='font-medium text-[#1A1A1A]'>{value}</div>
          {record.department && (
            <div className='text-xs text-[#8C8C8C] mt-1'>
              {record.department}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'workArea',
      title: '工區',
      width: '80px',
      align: 'center' as const,
      render: value =>
        value ? (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#00645A] bg-opacity-10 text-[#00645A]'>
            {value}
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'phone',
      title: '聯絡方式',
      width: '150px',
      render: (value, record) => (
        <div className='space-y-1'>
          <div className='text-sm'>{value}</div>
          {record.mobile && (
            <div className='text-xs text-[#8C8C8C]'>{record.mobile}</div>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      width: '180px',
      render: value => (
        <a
          href={`mailto:${value}`}
          className='text-[#00645A] hover:underline text-sm break-all'
        >
          {value}
        </a>
      ),
    },
    {
      key: 'type',
      title: '廠商類型',
      width: '100px',
      render: value => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            value === '結構廠商'
              ? 'bg-blue-100 text-blue-800'
              : value === '機電廠商'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-orange-100 text-orange-800'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      title: '狀態',
      width: '80px',
      align: 'center' as const,
      render: value => <StatusBadge status={value} />,
    },
  ];

  const filterConfigs: FilterConfig[] = [
    {
      key: 'keyword',
      type: 'text',
      label: '關鍵字搜尋',
      placeholder: '搜尋姓名或公司...',
    },
    {
      key: 'type',
      type: 'select',
      label: '廠商類型',
      placeholder: '所有廠商',
      options: [
        { value: 'all', label: '所有廠商' },
        { value: 'structure', label: '結構廠商' },
        { value: 'electric', label: '機電廠商' },
        { value: 'decoration', label: '裝修廠商' },
      ],
    },
  ];

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterReset = () => {
    setFilterValues({});
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold text-gray-900'>廠商人員通訊錄</h1>
        <Button onClick={() => setAddModalOpen(true)}>新增聯絡人</Button>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filterValues}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        onSearch={() => console.log('搜尋:', filterValues)}
      />

      <DataTable
        columns={columns}
        data={filteredContacts}
        pagination={{
          current: 1,
          pageSize: 10,
          total: filteredContacts.length,
          onChange: (page, pageSize) =>
            console.log('分頁變更:', page, pageSize),
        }}
        onSort={(key, direction) => console.log('排序:', key, direction)}
        emptyText='找不到符合條件的聯絡人'
      />

      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title='新增聯絡人'
        size='md'
        footer={
          <>
            <Button variant='outline' onClick={() => setAddModalOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setAddModalOpen(false)}>儲存</Button>
          </>
        }
      >
        <div className='space-y-4'>
          <Input label='姓名' placeholder='請輸入姓名' />
          <Input label='公司' placeholder='請輸入公司名稱' />
          <Input label='職位' placeholder='請輸入職位' />
          <Input label='電話' placeholder='請輸入電話號碼' />
          <Input label='電子信箱' type='email' placeholder='請輸入電子信箱' />
          <Select
            label='廠商類型'
            placeholder='請選擇廠商類型'
            options={[
              { value: 'structure', label: '結構廠商' },
              { value: 'electric', label: '機電廠商' },
              { value: 'decoration', label: '裝修廠商' },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
