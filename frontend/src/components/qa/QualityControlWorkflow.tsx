import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type QAStage = 
  | 'data_extraction_review'
  | 'manual_validation'
  | 'clinical_review'
  | 'compliance_check'
  | 'final_approval'

export interface QAIssue {
  id: string
  type: 'data_quality' | 'completeness' | 'accuracy' | 'compliance'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  suggested_action: string
  resolved: boolean
}

export interface QAStageStatus {
  stage: QAStage
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  completed_at?: string
  completed_by?: string
  issues: QAIssue[]
}

export interface QAStatus {
  current_stage: QAStage
  stages: QAStageStatus[]
  overall_completion: number
  quality_score: number
  issues_found: QAIssue[]
}

interface QAWorkflowProps {
  caseId: string
  qaStatus: QAStatus
  onAdvanceStage: (nextStage: QAStage) => Promise<void>
  onRejectCase: (reason: string) => Promise<void>
}

export const QualityControlWorkflow: React.FC<QAWorkflowProps> = ({
  caseId,
  qaStatus,
  onAdvanceStage,
  onRejectCase
}) => {
  const [isProcessing, setIsProcessing] = useState(false)

  const getStageIcon = (status: QAStageStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />
    }
  }

  const getSeverityColor = (severity: QAIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const handleAdvanceStage = async () => {
    setIsProcessing(true)
    try {
      const currentIndex = qaStatus.stages.findIndex(s => s.stage === qaStatus.current_stage)
      const nextStage = qaStatus.stages[currentIndex + 1]?.stage
      
      if (nextStage) {
        await onAdvanceStage(nextStage)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const criticalIssues = qaStatus.issues_found.filter(issue => 
    issue.severity === 'critical' && !issue.resolved
  )

  const stageLabels: Record<QAStage, string> = {
    data_extraction_review: 'Data Extraction Review',
    manual_validation: 'Manual Validation',
    clinical_review: 'Clinical Review',
    compliance_check: 'Compliance Check',
    final_approval: 'Final Approval'
  }

  return (
    <div className="space-y-6 text-left">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quality Control Progress</CardTitle>
              <CardDescription>Overall case validation status</CardDescription>
            </div>
            <Badge 
              variant={qaStatus.quality_score >= 85 ? 'default' : 'destructive'}
              className="text-lg px-3 py-1"
            >
              {qaStatus.quality_score}% Quality Score
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Completion</span>
                <span className="font-medium">{qaStatus.overall_completion}%</span>
              </div>
              <Progress value={qaStatus.overall_completion} className="h-2" />
            </div>

            {/* Critical Issues Alert */}
            {criticalIssues.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-800">
                    {criticalIssues.length} Critical Issue(s) Must Be Resolved
                  </span>
                </div>
                <ul className="mt-2 ml-7 space-y-1">
                  {criticalIssues.map(issue => (
                    <li key={issue.id} className="text-sm text-red-700 list-disc">
                      {issue.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stage Progress */}
      <Card>
        <CardHeader>
          <CardTitle>QA Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qaStatus.stages.map((stage) => (
              <div 
                key={stage.stage}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border",
                  stage.stage === qaStatus.current_stage
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : stage.status === 'completed'
                    ? 'bg-green-50/30 border-green-200'
                    : 'bg-gray-50 border-gray-100'
                )}
              >
                <div className="flex items-center space-x-3">
                  {getStageIcon(stage.status)}
                  <div>
                    <h3 className="font-medium text-sm">{stageLabels[stage.stage]}</h3>
                    {stage.completed_at && (
                      <p className="text-xs text-gray-500">
                        Completed {new Date(stage.completed_at).toLocaleDateString()}
                        {stage.completed_by && ` by ${stage.completed_by}`}
                      </p>
                    )}
                    {stage.issues.length > 0 && (
                      <p className="text-xs text-orange-600 font-medium">
                        {stage.issues.length} issue(s) found
                      </p>
                    )}
                  </div>
                </div>
                
                <Badge variant="outline" className={cn(
                  "capitalize",
                  stage.status === 'completed' ? 'border-green-600 text-green-700 bg-white' :
                  stage.status === 'failed' ? 'border-red-600 text-red-700 bg-white' :
                  stage.status === 'in_progress' ? 'border-blue-600 text-blue-700 bg-white' :
                  'border-gray-300 text-gray-500 bg-white'
                )}>
                  {stage.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Issues Summary */}
      {qaStatus.issues_found.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quality Issues Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {qaStatus.issues_found.map(issue => (
                <div 
                  key={issue.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    getSeverityColor(issue.severity),
                    issue.resolved ? 'opacity-40' : ''
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-[10px] bg-white">
                        {issue.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase bg-white">
                        {issue.severity}
                      </Badge>
                    </div>
                    {issue.resolved && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm font-medium mb-1">{issue.description}</p>
                  {issue.suggested_action && (
                    <p className="text-xs opacity-80 italic">Action: {issue.suggested_action}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center py-4">
        <Button 
          variant="destructive" 
          onClick={() => onRejectCase('Quality standards not met')}
          className="px-6"
        >
          Reject Case
        </Button>
        
        <div className="space-x-3">
          {qaStatus.current_stage !== 'final_approval' ? (
            <Button 
              onClick={handleAdvanceStage}
              disabled={isProcessing || criticalIssues.length > 0}
              className="px-8"
            >
              {isProcessing ? 'Processing...' : 'Advance to Next Stage'}
            </Button>
          ) : (
            <Button 
              onClick={handleAdvanceStage}
              disabled={isProcessing || criticalIssues.length > 0}
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              {isProcessing ? 'Finalizing...' : 'Final Approval'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
