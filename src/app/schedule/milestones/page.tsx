'use client';

export default function MilestonesPage() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold text-gray-900'>專案里程碑</h1>
        <button className='bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors'>
          新增里程碑
        </button>
      </div>

      <div className='bg-white rounded-lg shadow p-6'>
        <div className='text-center py-12 text-gray-500'>
          <div className='text-6xl mb-4'>📊</div>
          <p className='text-lg mb-2'>里程碑功能開發中</p>
          <p className='text-sm'>甘特圖與時程管理功能即將推出</p>
        </div>
      </div>
    </div>
  );
}
