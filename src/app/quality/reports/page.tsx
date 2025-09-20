'use client'

export default function QualityReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">品質日報/週報</h1>
        <div className="flex space-x-3">
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
            匯出報告
          </button>
          <button className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors">
            新增報告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium mb-2">本月報告數</h3>
          <p className="text-2xl font-bold text-gray-900">24</p>
          <p className="text-green-600 text-sm">↑ 12% 較上月</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium mb-2">待處理問題</h3>
          <p className="text-2xl font-bold text-gray-900">3</p>
          <p className="text-red-600 text-sm">需要關注</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-600 text-sm font-medium mb-2">平均品質分數</h3>
          <p className="text-2xl font-bold text-gray-900">4.2/5</p>
          <p className="text-gray-500 text-sm">良好水準</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-lg mb-2">報告列表功能開發中</p>
          <p className="text-sm">品質報告管理系統即將推出</p>
        </div>
      </div>
    </div>
  )
}