import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, X, Edit, Save, Undo } from 'lucide-react'
import { MedicalEntity } from '@/types/entity'

interface EditableEntityProps {
  entity: MedicalEntity
  onUpdate: (entityId: string, updates: Partial<MedicalEntity>) => Promise<void>
  onDelete: (entityId: string) => Promise<void>
  isReadOnly?: boolean
}

export const EditableEntity: React.FC<EditableEntityProps> = ({
  entity,
  onUpdate,
  onDelete,
  isReadOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedEntity, setEditedEntity] = useState<Partial<MedicalEntity>>({})

  const handleSave = async () => {
    try {
      await onUpdate(entity.id, {
        ...editedEntity,
        edited_at: new Date().toISOString(),
        edited_by: 'current-user-id', 
        original_text: entity.text,
        review_status: 'approved'
      })
      setIsEditing(false)
      setEditedEntity({})
    } catch (error) {
      console.error('Failed to update entity:', error)
    }
  }

  const handleCancel = () => {
    setEditedEntity({})
    setIsEditing(false)
  }

  const handleRevert = async () => {
    if (entity.original_text) {
      await onUpdate(entity.id, {
        text: entity.original_text,
        review_status: 'pending'
      })
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800'
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getEntityTypeColor = (type: string) => {
    const colors = {
      diagnosis: 'bg-blue-100 text-blue-800',
      medication: 'bg-purple-100 text-purple-800',
      procedure: 'bg-green-100 text-green-800',
      symptom: 'bg-orange-100 text-orange-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getEntityTypeColor(entity.type)}>
            {entity.type}
          </Badge>
          <Badge className={getConfidenceColor(entity.confidence)}>
            {Math.round(entity.confidence * 100)}% confidence
          </Badge>
          {entity.manual_review_required && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Review Required
            </Badge>
          )}
          {entity.edited_by && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Edit className="h-3 w-3" />
              Edited
            </Badge>
          )}
        </div>
        
        {!isReadOnly && (
          <div className="flex items-center gap-1">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {entity.original_text && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevert}
                    title="Revert to AI original"
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(entity.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="default" size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Entity Text */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block text-left">
            Entity Text
          </label>
          {isEditing ? (
            <Textarea
              value={editedEntity.text ?? entity.text}
              onChange={(e) => setEditedEntity({ ...editedEntity, text: e.target.value })}
              placeholder="Enter entity text"
              className="w-full"
            />
          ) : (
            <div className="p-2 bg-gray-50 rounded text-sm text-left">
              {entity.text}
              {entity.original_text && entity.original_text !== entity.text && (
                <div className="mt-1 text-xs text-gray-500">
                  <span className="font-medium">Original extraction:</span> {entity.original_text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Entity Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block text-left">
              Entity Type
            </label>
            {isEditing ? (
              <Select
                value={editedEntity.type ?? entity.type}
                onValueChange={(value) => setEditedEntity({ 
                  ...editedEntity, 
                  type: value as MedicalEntity['type'] 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diagnosis">Diagnosis</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="symptom">Symptom</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm capitalize text-left">{entity.type}</div>
            )}
          </div>

          {/* ICD-10 Code */}
          {(entity.type === 'diagnosis' || isEditing) && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block text-left">
                ICD-10 Code
              </label>
              {isEditing ? (
                <Input
                  value={editedEntity.icd10_code ?? entity.icd10_code ?? ''}
                  onChange={(e) => setEditedEntity({ 
                    ...editedEntity, 
                    icd10_code: e.target.value 
                  })}
                  placeholder="e.g., M51.26"
                />
              ) : (
                <div className="text-sm font-mono text-left">{entity.icd10_code || 'Not specified'}</div>
              )}
            </div>
          )}
        </div>

        {/* Document Location */}
        <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t">
          <span>Page {entity.page}</span>
          {entity.edited_at && (
            <span>Last edited: {new Date(entity.edited_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}
