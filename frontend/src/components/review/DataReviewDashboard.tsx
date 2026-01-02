import React, { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, CheckCircle, XCircle, Filter, Download } from 'lucide-react'
import { MedicalEntity, ClinicalDate } from '@/types/entity'
import { EditableEntity } from '@/components/editing/EditableEntity'
import { EditableClinicalDate } from '@/components/editing/EditableClinicalDate'

interface DataReviewDashboardProps {
  caseId: string
  entities: MedicalEntity[]
  clinicalDates: ClinicalDate[]
  onBulkUpdate: (updates: BulkUpdateRequest) => Promise<void>
  onExportReview: () => Promise<void>
}

export interface BulkUpdateRequest {
  entityUpdates: Array<{ id: string; updates: Partial<MedicalEntity> }>
  dateUpdates: Array<{ id: string; updates: Partial<ClinicalDate> }>
}

export const DataReviewDashboard: React.FC<DataReviewDashboardProps> = ({
  caseId: _caseId,
  entities,
  clinicalDates,
  onBulkUpdate,
  onExportReview
}) => {
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set())
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    confidence: 'all',
    reviewStatus: 'all',
    entityType: 'all',
    searchText: ''
  })

  // Filter and categorize data
  const { pendingReview, lowConfidence, reviewedItems } = useMemo(() => {
    const filteredEntities = entities.filter(entity => {
      if (filters.confidence !== 'all') {
        const threshold = filters.confidence === 'low' ? 0.7 : 0.9
        if (filters.confidence === 'low' && entity.confidence >= threshold) return false
        if (filters.confidence === 'high' && entity.confidence < threshold) return false
      }
      
      if (filters.reviewStatus !== 'all' && entity.review_status !== filters.reviewStatus) return false
      if (filters.entityType !== 'all' && entity.type !== filters.entityType) return false
      if (filters.searchText && !entity.text.toLowerCase().includes(filters.searchText.toLowerCase())) return false
      
      return true
    })

    const filteredDates = clinicalDates.filter(date => {
      if (filters.reviewStatus !== 'all' && date.review_status !== filters.reviewStatus) return false
      if (filters.searchText && !date.description.toLowerCase().includes(filters.searchText.toLowerCase())) return false
      return true
    })

    const allData = [
      ...filteredEntities.map(e => ({ ...e, isEntity: true })),
      ...filteredDates.map(d => ({ ...d, isEntity: false }))
    ]

    return {
      pendingReview: allData.filter(item => item.review_status === 'pending'),
      lowConfidence: allData.filter(item => item.confidence < 0.7),
      reviewedItems: allData.filter(item => item.review_status !== 'pending')
    }
  }, [entities, clinicalDates, filters])

  const handleBulkApprove = async () => {
    const entityUpdates = entities
      .filter(e => selectedEntities.has(e.id))
      .map(e => ({
        id: e.id,
        updates: { review_status: 'approved' as const }
      }))
    
    const dateUpdates = clinicalDates
      .filter(d => selectedDates.has(d.id))
      .map(d => ({
        id: d.id,
        updates: { review_status: 'approved' as const }
      }))

    await onBulkUpdate({ entityUpdates, dateUpdates })
    setSelectedEntities(new Set())
    setSelectedDates(new Set())
  }

  const handleBulkReject = async () => {
    const entityUpdates = entities
      .filter(e => selectedEntities.has(e.id))
      .map(e => ({
        id: e.id,
        updates: { review_status: 'rejected' as const }
      }))
    
    const dateUpdates = clinicalDates
      .filter(d => selectedDates.has(d.id))
      .map(d => ({
        id: d.id,
        updates: { review_status: 'rejected' as const }
      }))

    await onBulkUpdate({ entityUpdates, dateUpdates })
    setSelectedEntities(new Set())
    setSelectedDates(new Set())
  }

  return (
    <div className="space-y-6 text-left">
      {/* Review Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-yellow-900">{pendingReview.length}</p>
              <p className="text-sm text-yellow-700">Items Pending Review</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-red-900">{lowConfidence.length}</p>
              <p className="text-sm text-red-700">Low Confidence Items</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-green-900">{reviewedItems.length}</p>
              <p className="text-sm text-green-700">Items Reviewed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Input
          placeholder="Search text..."
          value={filters.searchText}
          onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
          className="w-48 bg-white"
        />
        
        <Select
          value={filters.confidence}
          onValueChange={(value) => setFilters({ ...filters, confidence: value })}
        >
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Confidence</SelectItem>
            <SelectItem value="low">Low {'<'}70%</SelectItem>
            <SelectItem value="high">High (≥90%)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.reviewStatus}
          onValueChange={(value) => setFilters({ ...filters, reviewStatus: value })}
        >
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.entityType}
          onValueChange={(value) => setFilters({ ...filters, entityType: value })}
        >
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="diagnosis">Diagnosis</SelectItem>
            <SelectItem value="medication">Medication</SelectItem>
            <SelectItem value="procedure">Procedure</SelectItem>
            <SelectItem value="symptom">Symptom</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          {(selectedEntities.size > 0 || selectedDates.size > 0) && (
            <>
              <Button onClick={handleBulkApprove} size="sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve ({selectedEntities.size + selectedDates.size})
              </Button>
              <Button onClick={handleBulkReject} variant="destructive" size="sm">
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
          
          <Button onClick={onExportReview} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export Review
          </Button>
        </div>
      </div>

      {/* Review Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="pending">
            Pending Review ({pendingReview.length})
          </TabsTrigger>
          <TabsTrigger value="low-confidence">
            Low Confidence ({lowConfidence.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({reviewedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          {/* Medical Entities */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Medical Entities</h3>
            <div className="space-y-4">
              {entities.filter(e => e.review_status === 'pending').map(entity => (
                <div key={entity.id} className="flex items-start space-x-3">
                  <div className="pt-5">
                    <Checkbox
                      checked={selectedEntities.has(entity.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedEntities)
                        if (checked) {
                          newSelected.add(entity.id)
                        } else {
                          newSelected.delete(entity.id)
                        }
                        setSelectedEntities(newSelected)
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <EditableEntity
                      entity={entity}
                      onUpdate={async (id, updates) => {
                        await onBulkUpdate({
                          entityUpdates: [{ id, updates }],
                          dateUpdates: []
                        })
                      }}
                      onDelete={async (id) => {
                        await onBulkUpdate({
                          entityUpdates: [{ id, updates: { review_status: 'rejected' } }],
                          dateUpdates: []
                        })
                      }}
                    />
                  </div>
                </div>
              ))}
              {entities.filter(e => e.review_status === 'pending').length === 0 && (
                <p className="text-sm text-muted-foreground italic py-4">No entities pending review.</p>
              )}
            </div>
          </div>

          {/* Clinical Dates */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-3">Clinical Dates</h3>
            <div className="space-y-4">
              {clinicalDates.filter(d => d.review_status === 'pending').map(date => (
                <div key={date.id} className="flex items-start space-x-3">
                  <div className="pt-4">
                    <Checkbox
                      checked={selectedDates.has(date.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedDates)
                        if (checked) {
                          newSelected.add(date.id)
                        } else {
                          newSelected.delete(date.id)
                        }
                        setSelectedDates(newSelected)
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <EditableClinicalDate
                      clinicalDate={date}
                      onUpdate={async (id, updates) => {
                        await onBulkUpdate({
                          entityUpdates: [],
                          dateUpdates: [{ id, updates }]
                        })
                      }}
                      onDelete={async (id) => {
                        await onBulkUpdate({
                          entityUpdates: [],
                          dateUpdates: [{ id, updates: { review_status: 'rejected' } }]
                        })
                      }}
                    />
                  </div>
                </div>
              ))}
              {clinicalDates.filter(d => d.review_status === 'pending').length === 0 && (
                <p className="text-sm text-muted-foreground italic py-4">No dates pending review.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="low-confidence">
            {/* Same structure but for low confidence items */}
             <div className="p-8 text-center italic text-muted-foreground border-2 border-dashed rounded-lg">
                View of items with confidence score below 70%.
             </div>
        </TabsContent>

        <TabsContent value="reviewed">
            {/* Same structure but for reviewed items */}
            <div className="p-8 text-center italic text-muted-foreground border-2 border-dashed rounded-lg">
                View of already reviewed and approved/rejected items.
             </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
