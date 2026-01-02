import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MedicalEntity, ClinicalDate } from '@/types/entity'
import { toast } from 'react-hot-toast'

interface BulkUpdateRequest {
  entityUpdates: Array<{ id: string; updates: Partial<MedicalEntity> }>
  dateUpdates: Array<{ id: string; updates: Partial<ClinicalDate> }>
}

export const useManualEditing = (caseId: string) => {
  const queryClient = useQueryClient()

  // For a real app, this would use a defined API client like casesApi
  // Here I'll use a mocked fetch implementation as per spec logic

  const updateEntityMutation = useMutation({
    mutationFn: async ({ 
      entityId, 
      updates, 
      editReason: _editReason 
    }: { 
      entityId: string
      updates: Partial<MedicalEntity>
      editReason?: string 
    }) => {
      // In a real implementation:
      // return await casesApi.updateEntity(caseId, entityId, { ...updates, edit_reason: editReason })
      
      console.log(`Updating entity ${entityId} for case ${caseId}`, updates)
      return { id: entityId, ...updates }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId, 'entities'] })
      toast.success('Entity Updated successfully')
    },
    onError: (error) => {
      toast.error(`Update Failed: ${error.message}`)
    }
  })

  const updateClinicalDateMutation = useMutation({
    mutationFn: async ({ 
      dateId, 
      updates, 
      editReason: _editReason 
    }: { 
      dateId: string
      updates: Partial<ClinicalDate>
      editReason?: string 
    }) => {
      console.log(`Updating date ${dateId} for case ${caseId}`, updates)
      return { id: dateId, ...updates }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId, 'clinicalDates'] })
      toast.success('Date Updated successfully')
    }
  })

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ 
      entityUpdates, 
      dateUpdates 
    }: BulkUpdateRequest) => {
      console.log('Bulk updating for case', caseId, { entityUpdates, dateUpdates })
      return { 
        updated_entities: entityUpdates.length, 
        updated_dates: dateUpdates.length 
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      toast.success(`Bulk Update Complete. Updated ${data.updated_entities + data.updated_dates} items.`)
    }
  })

  const revertToOriginalMutation = useMutation({
    mutationFn: async ({ 
      id, 
      type 
    }: { 
      id: string
      type: 'medical_entity' | 'clinical_date' 
    }) => {
      console.log(`Reverting ${type} ${id} to original state`)
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      toast.success('Reverted to original extraction')
    }
  })

  return {
    updateEntity: updateEntityMutation.mutate,
    updateClinicalDate: updateClinicalDateMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,
    revertToOriginal: revertToOriginalMutation.mutate,
    isUpdating: updateEntityMutation.isPending || 
                updateClinicalDateMutation.isPending || 
                bulkUpdateMutation.isPending,
    isReverting: revertToOriginalMutation.isPending
  }
}
