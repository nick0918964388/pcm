'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Construction, ArrowLeft, Calendar, Code, Wrench, Coffee } from 'lucide-react'

export default function UnderDevelopmentPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto text-center shadow-lg">
        <CardHeader className="pb-6">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Construction className="h-20 w-20 text-amber-500 animate-bounce" />
              <div className="absolute -top-2 -right-2 animate-spin">
                <Wrench className="h-8 w-8 text-gray-600" />
              </div>
            </div>
          </div>
          
          <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
            功能開發中
          </CardTitle>
          
          <p className="text-lg text-gray-600">
            此功能正在積極開發中，敬請期待！
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Code className="h-5 w-5" />
              <span className="text-sm">正在編碼</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Calendar className="h-5 w-5" />
              <span className="text-sm">測試階段</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Coffee className="h-5 w-5" />
              <span className="text-sm">即將完成</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              開發進度
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: '75%' }}
              />
            </div>
            <p className="text-sm text-gray-600">
              預計完成度：75% | 預計上線：近期內
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              💡 <strong>提示：</strong>我們正在為您打造最佳的使用體驗，
              請稍後再回來查看此功能的最新進展。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回上一頁</span>
            </Button>
            
            <Button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2"
            >
              <span>回到首頁</span>
            </Button>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              如有任何問題或建議，請聯繫開發團隊
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}