import React, { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, Edit, Save, X, Undo } from 'lucide-react'
import { format } from 'date-fns'
import { ClinicalDate } from '@/types/entity'

interface EditableClinicalDateProps {
  clinicalDate: ClinicalDate
  onUpdate: (dateId: string, updates: Partial<ClinicalDate>) => Promise<void>
  onDelete: (dateId: string) => Promise<void>
  isReadOnly?: boolean
}

export const EditableClinicalDate: React.FC<EditableClinicalDateProps> = ({
  clinicalDate,
  onUpdate,
  onDelete,
  isReadOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedDate, setEditedDate] = useState<Partial<ClinicalDate>>({})
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    clinicalDate.date ? new Date(clinicalDate.date) : undefined
  )

  const handleSave = async () => {
    try {
      await onUpdate(clinicalDate.id, {
        ...editedDate,
        date: selectedDate?.toISOString().split('T')[0] || clinicalDate.date,
        edited_at: new Date().toISOString(),
        edited_by: 'current-user-id',
        original_date: clinicalDate.date,
        review_status: 'approved'
      })
      setIsEditing(false)
      setEditedDate({})
    } catch (error) {
      console.error('Failed to update clinical date:', error)
    }
  }

  const handleRevert = async () => {
    if (clinicalDate.original_date) {
      await onUpdate(clinicalDate.id, {
        date: clinicalDate.original_date,
        review_status: 'pending'
      })
      setSelectedDate(new Date(clinicalDate.original_date))
    }
  }

  const eventTypeLabels = {
    injury_date: 'Injury Date',
    first_treatment: 'First Treatment',
    surgery: 'Surgery',
    mri: 'MRI/Imaging',
    followup: 'Follow-up'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800'
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 bg-white gap-4">
      <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 flex-1 w-full">
        {/* Date Display/Editor */}
        <div className="min-w-[150px]">
          {isEditing ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          ) : (
            <div className="text-left">
              <div className="font-medium">
                {format(new Date(clinicalDate.date), 'MMM dd, yyyy')}
              </div>
              {clinicalDate.original_date && clinicalDate.original_date !== clinicalDate.date && (
                <div className="text-[10px] text-gray-500">
                  Original: {format(new Date(clinicalDate.original_date), 'MMM dd, yyyy')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Event Type */}
        <div className="min-w-[140px]">
          {isEditing ? (
            <Select
              value={editedDate.event_type ?? clinicalDate.event_type}
              onValueChange={(value) => setEditedDate({ 
                ...editedDate, 
                event_type: value as ClinicalDate['event_type'] 
              })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(eventTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="bg-white">
              {eventTypeLabels[clinicalDate.event_type as keyof typeof eventTypeLabels] || clinicalDate.event_type}
            </Badge>
          )}
        </div>

        {/* Description */}
        <div className="flex-1 w-full">
          {isEditing ? (
            <Input
              value={editedDate.description ?? clinicalDate.description}
              onChange={(e) => setEditedDate({ 
                ...editedDate, 
                description: e.target.value 
              })}
              placeholder="Event description"
              className="h-9"
            />
          ) : (
            <div className="text-sm text-left">{clinicalDate.description}</div>
          )}
        </div>

        {/* Confidence */}
        <Badge className={getConfidenceColor(clinicalDate.confidence)}>
          {Math.round(clinicalDate.confidence * 100)}%
        </Badge>
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-1 shrink-0">
          {!isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
              </Button>
              {clinicalDate.original_date && (
                <Button variant="outline" size="sm" onClick={handleRevert}>
                  <Undo className="h-4 w-4" />
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => onDelete(clinicalDate.id)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="default" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
