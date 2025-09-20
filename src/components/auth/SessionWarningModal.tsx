'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useSessionMonitor } from '@/hooks/useSessionMonitor'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Clock } from 'lucide-react'

export function SessionWarningModal() {
  const [showWarning, setShowWarning] = useState(false)
  const [warningTime, setWarningTime] = useState(0)
  const { refreshAuth, updateLastActivity } = useAuthStore()

  // 使用 session 監控 hook
  const { remainingTime } = useSessionMonitor({
    warningThreshold: 5,
    checkInterval: 60,
    onWarning: (remaining) => {
      setWarningTime(remaining)
      setShowWarning(true)
    },
    onTimeout: () => {
      setShowWarning(false)
    }
  })


  const handleContinue = async () => {
    // 延長 session
    updateLastActivity()
    await refreshAuth()
    setShowWarning(false)
  }

  const handleLogout = () => {
    const { logout } = useAuthStore.getState()
    logout()
    setShowWarning(false)
  }

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Session 即將過期</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            <div className="flex items-center space-x-2 text-base">
              <Clock className="h-4 w-4" />
              <span>
                您的 session 將在 <strong className="text-amber-600">{warningTime} 分鐘</strong>後過期
              </span>
            </div>
            <p className="mt-3 text-sm">
              請選擇是否要繼續工作，或是安全登出。
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex-1"
          >
            登出
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1 bg-[#00645A] hover:bg-[#00645A]/90"
          >
            繼續工作
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}