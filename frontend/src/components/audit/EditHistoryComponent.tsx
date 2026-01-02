import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History, User, Calendar as CalendarIcon, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EditAuditLog {
  id: string
  case_id: string
  entity_type: 'medical_entity' | 'clinical_date' | 'examination' | 'report'
  entity_id: string
  action_type: 'create' | 'update' | 'delete' | 'revert'
  field_name: string
  old_value: any
  new_value: any
  edit_reason?: string
  edited_by: string
  user_name: string
  edited_at: string
  confidence_before?: number
  confidence_after?: number
  ip_address: string
  user_agent: string
}

interface EditHistoryProps {
  caseId: string
  auditLog: EditAuditLog[]
  onRevertEdit: (logId: string) => Promise<void>
}

export const EditHistoryComponent: React.FC<EditHistoryProps> = ({
  caseId,
  auditLog,
  onRevertEdit
}) => {
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const getActionColor = (action: EditAuditLog['action_type']) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'revert':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const groupedLogs = auditLog.reduce((acc, log) => {
    const dateKey = new Date(log.edited_at).toDateString()
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(log)
    return acc
  }, {} as Record<string, EditAuditLog[]>)

  return (
    <div className="space-y-6 text-left">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <History className="h-5 w-5 mr-2 text-primary" />
            Edit History ({auditLog.length} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(groupedLogs)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, logs]) => (
                <div key={date}>
                  <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wider pl-2 border-l-4 border-primary/20">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  
                  <div className="space-y-4">
                    {logs
                      .sort((a, b) => new Date(b.edited_at).getTime() - new Date(a.edited_at).getTime())
                      .map(log => (
                        <div 
                          key={log.id}
                          className="border rounded-lg p-4 hover:shadow-sm transition-all bg-white"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <Badge className={cn("font-medium", getActionColor(log.action_type))}>
                                {log.action_type.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="bg-gray-50 uppercase text-[10px]">
                                {log.entity_type.replace('_', ' ')}
                              </Badge>
                              <div className="flex items-center text-sm text-gray-700">
                                <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                <span className="font-medium">{log.user_name}</span>
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                                {new Date(log.edited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            
                            {log.action_type === 'update' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRevertEdit(log.id)}
                                title="Revert this change"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="text-sm">
                              <span className="font-semibold text-gray-600 mr-2">Field:</span> 
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-primary">
                                {log.field_name}
                              </code>
                            </div>
                            
                            {log.edit_reason && (
                              <div className="text-sm">
                                <span className="font-semibold text-gray-600 mr-2">Reason:</span> 
                                <span className="italic text-gray-700">"{log.edit_reason}"</span>
                              </div>
                            )}

                            {log.action_type === 'update' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                <div>
                                  <div className="text-[10px] font-bold text-red-600 mb-1 uppercase">
                                    Before
                                  </div>
                                  <div className="text-sm bg-red-50/50 p-3 rounded border border-red-100 whitespace-pre-wrap font-mono min-h-[40px]">
                                    {formatValue(log.old_value)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-green-600 mb-1 uppercase">
                                    After
                                  </div>
                                  <div className="text-sm bg-green-50/50 p-3 rounded border border-green-100 whitespace-pre-wrap font-mono min-h-[40px]">
                                    {formatValue(log.new_value)}
                                  </div>
                                </div>
                              </div>
                            )}

                            <details className="text-[10px] text-muted-foreground pt-2">
                              <summary className="cursor-pointer hover:text-primary transition-colors inline-block font-medium">
                                Technical Audit Metadata
                              </summary>
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 pl-2 border-l-2 border-gray-100">
                                <div><span className="font-semibold">ID:</span> {log.id}</div>
                                <div><span className="font-semibold">IP:</span> {log.ip_address}</div>
                                <div className="md:col-span-2"><span className="font-semibold">Agent:</span> {log.user_agent}</div>
                              </div>
                            </details>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {auditLog.length === 0 && (
                <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-lg bg-gray-50/50">
                    No edit history recorded for this case.
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
