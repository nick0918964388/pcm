/**
 * @fileoverview WBS 管理頁面 (簡化版)
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import WBSTreeSimple from '@/modules/wbs-management/components/WBSTree/WBSTreeSimple'

export default function ProjectWBSPage() {
  const params = useParams()
  const projectId = params.projectId as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 簡化載入邏輯
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [projectId])

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center">載入 WBS 資料中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-red-600">
          載入 WBS 資料時發生錯誤: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <WBSTreeSimple 
        projectId={projectId}
        loading={loading}
        error={error}
      />
    </div>
  )
}