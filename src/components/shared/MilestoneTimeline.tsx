import * as React from 'react'
import { cn } from '@/lib/utils'

interface Milestone {
  date: string
  label: string
  status: 'completed' | 'current' | 'upcoming'
}

interface MilestoneTimelineProps {
  milestones: Milestone[]
  currentDate?: string
  className?: string
}

export function MilestoneTimeline({
  milestones,
  currentDate = new Date().toISOString().split('T')[0],
  className
}: MilestoneTimelineProps) {
  // 計算進度百分比
  const completedCount = milestones.filter(m => m.status === 'completed').length
  const progressPercentage = (completedCount / milestones.length) * 100

  return (
    <div className={cn('bg-white p-4 sm:p-6 rounded shadow-[0_2px_8px_rgba(0,0,0,0.06)]', className)}>
      <h3 className="text-base sm:text-lg font-bold text-[#1A1A1A] mb-6 sm:mb-8">Milestone</h3>
      
      <div className="relative pt-2 pb-12">
        {/* Timeline bar background */}
        <div className="absolute left-0 right-0 top-3 h-1 bg-gray-200">
          {/* Progress bar */}
          <div 
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Milestones */}
        <div className="relative flex justify-between">
          {milestones.map((milestone, index) => (
            <div key={index} className="flex flex-col items-center">
              {/* Milestone dot */}
              <div
                className={cn(
                  'w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 relative z-20',
                  milestone.status === 'completed' 
                    ? 'bg-green-500 border-green-500'
                    : milestone.status === 'current'
                    ? 'bg-yellow-500 border-yellow-500'
                    : 'bg-white border-gray-300'
                )}
              />
              
              {/* Milestone text - positioned below */}
              <div className="mt-3 sm:mt-4 text-center max-w-16 sm:max-w-none">
                <p className="text-xs sm:text-xs text-[#8C8C8C] leading-tight">{milestone.date}</p>
                <p className="text-xs font-medium text-[#595959] mt-1 leading-tight">
                  {milestone.label}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Current date indicator */}
        <div className="absolute left-0 right-0 -bottom-4 text-center">
          <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-[#00645A] bg-opacity-10 text-[#00645A]">
            {currentDate} Move-In
          </span>
        </div>
      </div>
    </div>
  )
}