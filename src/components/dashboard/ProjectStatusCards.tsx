'use client'

import { Calendar, Users, TrendingUp, DollarSign, Clock, Target, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function ProjectStatusCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* 專案期程 - 綠色 */}
      <Card className="@container/card border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white dark:from-green-900/10 dark:to-card">
        <CardHeader className="pb-2 p-3">
          <CardDescription className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Calendar className="h-4 w-4" />
            專案期程
          </CardDescription>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">時間起算</span>
              <span className="font-medium text-green-700 dark:text-green-400">2024/6/1</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">計畫完成</span>
              <span className="font-medium text-green-700 dark:text-green-400">2026/5/31</span>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-between pt-0 p-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-700 dark:text-green-400">456 d</div>
            <div className="text-xs text-muted-foreground">專案天數</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-700 dark:text-green-400">729 d</div>
            <div className="text-xs text-muted-foreground">經過天數</div>
          </div>
        </CardFooter>
      </Card>

      {/* 專案進度 - 藍色 */}
      <Card className="@container/card border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-card">
        <CardHeader className="pb-2 p-3">
          <CardDescription className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <TrendingUp className="h-4 w-4" />
            專案進度
          </CardDescription>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
              25%
            </CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
              <Target className="h-3 w-3 mr-1" />
              進行中
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-between pt-0 p-3 text-sm">
          <div className="text-center">
            <div className="font-medium text-blue-700 dark:text-blue-400">actual 25%</div>
            <div className="text-xs text-muted-foreground">實際進度</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-blue-700 dark:text-blue-400">plan 100%</div>
            <div className="text-xs text-muted-foreground">計畫進度</div>
          </div>
        </CardFooter>
      </Card>

      {/* 專案團隊 - 黃色 */}
      <Card className="@container/card border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/10 dark:to-card">
        <CardHeader className="pb-2 p-3">
          <CardDescription className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <Users className="h-4 w-4" />
            專案團隊
          </CardDescription>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-semibold text-yellow-700 dark:text-yellow-400">
              0
              <span className="text-base font-normal ml-1">人</span>
            </CardTitle>
            <Badge variant="outline" className="border-yellow-300 text-yellow-700 dark:border-yellow-600 dark:text-yellow-400">
              <UserCheck className="h-3 w-3 mr-1" />
              待配置
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-between pt-0 p-3 text-sm">
          <div className="text-center">
            <div className="font-medium text-yellow-700 dark:text-yellow-400">專案成員</div>
            <div className="text-xs text-muted-foreground">核心團隊</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-yellow-700 dark:text-yellow-400">0 人</div>
            <div className="text-xs text-muted-foreground">營業報告</div>
          </div>
        </CardFooter>
      </Card>

      {/* 預算狀況 - 紅色 */}
      <Card className="@container/card border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-card">
        <CardHeader className="pb-2 p-3">
          <CardDescription className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <DollarSign className="h-4 w-4" />
            預算狀況
          </CardDescription>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-semibold text-red-700 dark:text-red-400">
              18750/75000
              <span className="text-sm font-normal ml-1">萬元</span>
            </CardTitle>
            <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600">
              <Clock className="h-3 w-3 mr-1" />
              25% 使用
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex justify-between pt-0 p-3 text-sm">
          <div className="text-center">
            <div className="font-medium text-red-700 dark:text-red-400">已用 25%</div>
            <div className="text-xs text-muted-foreground">使用比例</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-red-700 dark:text-red-400">剩餘 75%</div>
            <div className="text-xs text-muted-foreground">可用餘額</div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}