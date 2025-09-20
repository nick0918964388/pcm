'use client'

import { Fragment } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2,
  Hash,
  Calendar,
  FileText,
  Edit,
  X,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Repeat,
  Navigation
} from 'lucide-react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { 
  DutySchedule,
  ShiftType,
  DutyStatus,
  WorkArea,
  UrgencyLevel,
  DUTY_STATUS_COLORS,
  SHIFT_TYPE_ICONS,
  WORK_AREA_ICONS,
  formatShiftTime,
  isShiftActive
} from '@/types/dutySchedule'
import { cn } from '@/lib/utils'

interface DutyPersonDetailDialogProps {
  schedule: DutySchedule | null
  open: boolean
  onClose: () => void
  onCall?: (number: string) => void
  onEmail?: (email: string) => void
  onEdit?: (schedule: DutySchedule) => void
}

export function DutyPersonDetailDialog({
  schedule,
  open,
  onClose,
  onCall,
  onEmail,
  onEdit
}: DutyPersonDetailDialogProps) {
  
  if (!schedule) return null
  
  const formatDate = (date: Date) => {
    return format(new Date(date), 'yyyy年MM月dd日', { locale: zhTW })
  }
  
  const formatDateTime = (date: Date) => {
    return format(new Date(date), 'yyyy/MM/dd HH:mm', { locale: zhTW })
  }
  
  const isCurrentlyActive = isShiftActive(schedule)
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            <span className="text-2xl">{SHIFT_TYPE_ICONS[schedule.shiftType]}</span>
            <div>
              <div className="flex items-center gap-3">
                <span>{schedule.person.name}</span>
                <Badge 
                  style={{ backgroundColor: DUTY_STATUS_COLORS[schedule.status] }}
                  className="text-white text-sm"
                >
                  {schedule.status}
                </Badge>
                {isCurrentlyActive && (
                  <Badge variant="default" className="bg-green-600 text-white text-sm">
                    值班中
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-500 font-normal">
                {formatDate(schedule.dutyDate)} • {schedule.shiftType} • {formatShiftTime(schedule.shiftTime)}
              </div>
            </div>
          </DialogTitle>
          <div className="flex items-center gap-2">
            {onCall && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCall(schedule.person.mobile)}
              >
                <Phone className="h-4 w-4 mr-2" />
                撥號
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(schedule)}
              >
                <Edit className="h-4 w-4 mr-2" />
                編輯
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 值班資訊 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5" />
                值班資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">值班日期</div>
                    <div className="font-medium">{formatDate(schedule.dutyDate)}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(schedule.dutyDate), 'EEEE', { locale: zhTW })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">班別時間</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{SHIFT_TYPE_ICONS[schedule.shiftType]}</span>
                      <span className="font-medium">{schedule.shiftType}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatShiftTime(schedule.shiftTime)} ({schedule.shiftTime.totalHours} 小時)
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">工作區域</div>
                    <div className="flex items-center gap-2">
                      <span>{WORK_AREA_ICONS[schedule.workArea]}</span>
                      <span className="font-medium">{schedule.workArea}</span>
                    </div>
                    {schedule.workLocation && (
                      <div className="text-sm text-gray-600">具體位置: {schedule.workLocation}</div>
                    )}
                  </div>
                </div>
                
                {schedule.urgencyLevel && (
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">緊急程度</div>
                      <Badge 
                        variant={schedule.urgencyLevel === UrgencyLevel.CRITICAL ? 'destructive' : 'secondary'}
                        className="text-sm"
                      >
                        {schedule.urgencyLevel}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {schedule.replacement && (
                  <div className="flex items-start gap-3">
                    <Repeat className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">代班資訊</div>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">原班人員:</span> {schedule.replacement.originalPersonName}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">代班人員:</span> {schedule.replacement.replacementPersonName}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">代班原因:</span> {schedule.replacement.reason}
                        </div>
                        {schedule.replacement.approvedBy && (
                          <div className="text-sm text-gray-600">
                            核准人: {schedule.replacement.approvedBy}
                            {schedule.replacement.approvedAt && (
                              <span> • {formatDateTime(schedule.replacement.approvedAt)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 簽到退記錄 */}
                {schedule.checkIn && (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">簽到退記錄</div>
                      <div className="space-y-1">
                        {schedule.checkIn.checkInTime && (
                          <div className="text-sm">
                            <span className="font-medium">簽到時間:</span> {formatDateTime(schedule.checkIn.checkInTime)}
                          </div>
                        )}
                        {schedule.checkIn.checkOutTime && (
                          <div className="text-sm">
                            <span className="font-medium">簽退時間:</span> {formatDateTime(schedule.checkIn.checkOutTime)}
                          </div>
                        )}
                        {schedule.checkIn.actualHours && (
                          <div className="text-sm">
                            <span className="font-medium">實際工時:</span> {schedule.checkIn.actualHours} 小時
                          </div>
                        )}
                        {schedule.checkIn.gpsLocation && (
                          <div className="text-sm">
                            <Navigation className="h-3 w-3 inline mr-1" />
                            GPS位置: {schedule.checkIn.gpsLocation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {(schedule.notes || schedule.specialInstructions) && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <div className="text-sm text-gray-500">備註說明</div>
                      <div className="space-y-1 text-sm">
                        {schedule.notes && <div>{schedule.notes}</div>}
                        {schedule.specialInstructions && (
                          <div className="bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                            <strong>特殊指示:</strong> {schedule.specialInstructions}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* 人員與廠商資訊 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5" />
                人員與廠商資訊
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 人員基本資訊 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">值班人員</div>
                    <div className="font-medium">{schedule.person.name}</div>
                    <div className="text-sm text-gray-600">{schedule.person.position}</div>
                    {schedule.person.isPrimary && (
                      <Badge variant="secondary" className="text-xs mt-1">主要聯絡人</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">所屬廠商</div>
                    <div className="font-medium">{schedule.person.vendorName}</div>
                    <div className="text-sm text-gray-600">{schedule.person.vendorType}</div>
                  </div>
                </div>
                
                {schedule.person.supervisor && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">上線主管</div>
                      <div>{schedule.person.supervisor}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* 聯絡方式 */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">聯絡方式</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">手機號碼</div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{schedule.person.mobile}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCall?.(schedule.person.mobile)}
                          className="h-6 px-2 text-xs"
                        >
                          撥號
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {schedule.person.extension && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">分機號碼</div>
                        <div className="font-mono">{schedule.person.extension}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={`mailto:${schedule.person.email}`}
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                          onClick={() => onEmail?.(schedule.person.email)}
                        >
                          {schedule.person.email}
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEmail?.(schedule.person.email)}
                          className="h-6 px-2 text-xs"
                        >
                          郵件
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {schedule.person.mvpn && (
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">MVPN</div>
                        <div className="font-mono">{schedule.person.mvpn}</div>
                      </div>
                    </div>
                  )}
                  
                  {schedule.person.emergencyContact && (
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="text-sm text-gray-500">緊急聯絡電話</div>
                        <div className="font-mono text-orange-600">{schedule.person.emergencyContact}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 技能要求 */}
              {schedule.requirements && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">技能與要求</h4>
                    
                    {schedule.requirements.specialSkills && schedule.requirements.specialSkills.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">特殊技能</div>
                        <div className="flex flex-wrap gap-1">
                          {schedule.requirements.specialSkills.map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {schedule.requirements.safetyQualifications && schedule.requirements.safetyQualifications.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">安全資格</div>
                        <div className="flex flex-wrap gap-1">
                          {schedule.requirements.safetyQualifications.map((qual, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {qual}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {schedule.requirements.languageRequirements && schedule.requirements.languageRequirements.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">語言要求</div>
                        <div className="flex flex-wrap gap-1">
                          {schedule.requirements.languageRequirements.map((lang, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* 系統資訊 */}
        <Card className="mt-4">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div>建立時間: {formatDateTime(schedule.createdAt)}</div>
              <div>更新時間: {formatDateTime(schedule.updatedAt)}</div>
              <div>建立者: {schedule.createdBy}</div>
              {schedule.updatedBy && <div>更新者: {schedule.updatedBy}</div>}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}