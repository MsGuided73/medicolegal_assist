import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FileText, Download, CheckCircle, Clock, AlertCircle, PlayCircle, Loader2 } from "lucide-react"

import { apiClient } from "@/api/client"
import { documentsApi } from "@/api/documents"
import { useDocumentIntelligence, useDocumentStatus } from "@/hooks/useDocumentIntelligence"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function getStatus(doc: any): "pending" | "processing" | "completed" | "failed" {
  // Support both schemas
  return (doc.analysis_status ?? doc.ocr_status ?? "pending") as any
}

function getFilename(doc: any): string {
  return doc.file_name ?? doc.filename
}

function getFilesize(doc: any): number | undefined {
  return doc.file_size
}

export default function DocumentList({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()
  const { startAnalysis } = useDocumentIntelligence()
  const [processingDoc, setProcessingDoc] = useState<{ id: string, filename: string } | null>(null)

  // Poll status when processing modal is open
  const { data: statusData } = useDocumentStatus(
    processingDoc?.id || null, 
    !!processingDoc
  )

  const { data, isLoading } = useQuery({
    queryKey: ["documents", caseId],
    queryFn: () => documentsApi.list(caseId),
    enabled: !!caseId,
    // Poll list if we have any processing items (to update list icons)
    refetchInterval: (query) => {
        const hasProcessing = (query.state.data as any[])?.some(
            d => getStatus(d) === 'processing'
        )
        return hasProcessing ? 2000 : false
    }
  })

  // Close modal when complete
  if (processingDoc && statusData) {
      if (statusData.ocr_status === 'completed' || statusData.ocr_status === 'failed') {
          // Add small delay so user sees 100%
          setTimeout(() => {
              setProcessingDoc(null)
              queryClient.invalidateQueries({ queryKey: ["documents", caseId] })
          }, 1500)
      }
  }

  const handleProcess = async (docId: string, filename: string) => {
      setProcessingDoc({ id: docId, filename })
      try {
          await startAnalysis({ caseId, documentId: docId })
      } catch (e) {
          console.error("Failed to start analysis", e)
          // Keep modal open to show error state if we add it, or close
          // For now let the polling show failure
      }
  }

  const documents = (data ?? []) as any[]

  const statusIcons: Record<string, JSX.Element> = {
    pending: <Clock className="w-4 h-4 text-gray-400" />,
    processing: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    failed: <AlertCircle className="w-4 h-4 text-red-500" />,
  }

  const handleDownload = async (documentId: string) => {
    // If backend doesn't support direct download link yet, we might need a different approach
    // But assuming the route exists:
    try {
        // Just open in new tab if we assume it's a direct file link or handled by browser
        // Actually, we usually need a signed URL from backend
        // Ideally: window.open(`${API_URL}/documents/${documentId}/download`, "_blank")
        console.log("Download not fully implemented in frontend mock")
    } catch (e) {
        console.error(e)
    }
  }

  if (isLoading) return <div className="text-sm text-gray-500">Loading documents...</div>

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No documents uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const status = getStatus(doc)
        const filename = getFilename(doc)
        const fileSize = getFilesize(doc)

        return (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <div className="flex items-center space-x-3 flex-1">
              <FileText className="w-5 h-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{filename}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  {typeof fileSize === "number" && <span>{(fileSize / 1024 / 1024).toFixed(1)} MB</span>}
                  {typeof fileSize === "number" && <span>•</span>}
                  <span>{formatDate(doc.created_at)}</span>
                  {typeof doc.quality_score === "number" && (
                    <>
                      <span>•</span>
                      <span>Quality: {(doc.quality_score * 100).toFixed(0)}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Action Buttons */}
              {status === 'pending' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => handleProcess(doc.id, filename)}
                    title="Process Document"
                  >
                      <PlayCircle className="w-4 h-4 text-blue-600" />
                  </Button>
              )}
              
              {statusIcons[status]}

              {status === "completed" && (
                <button
                  onClick={() => handleDownload(doc.id)}
                  className="p-1 text-gray-600 hover:text-primary"
                  aria-label="Download document"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Processing Modal */}
      <Dialog open={!!processingDoc} onOpenChange={(open) => !open && setProcessingDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-4 pt-4">
                <div className="relative">
                    <Loader2 className="h-12 w-12 text-green-500 animate-spin" />
                </div>
                <div className="text-center">
                    Processing {processingDoc?.filename} with Document schema...
                </div>
            </DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-2">
                <Progress value={16} className="w-full h-2" />
                <p className="text-xs text-muted-foreground">
                    Usually finishes in about 10 seconds. If it takes longer, we're still finalizing your results.
                </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}
