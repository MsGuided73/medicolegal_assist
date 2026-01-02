import { useQuery } from "@tanstack/react-query"
import { FileText, Download, CheckCircle, Clock, AlertCircle } from "lucide-react"

import { apiClient } from "@/api/client"
import { UploadedDocument } from "@/types/document"

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
  const { data, isLoading } = useQuery({
    queryKey: ["documents", caseId],
    queryFn: () => apiClient.get<{ documents: UploadedDocument[] }>(`/document-intelligence/documents/${caseId}`),
    enabled: !!caseId,
  })

  const documents = (data?.documents ?? []) as any[]

  const statusIcons: Record<string, JSX.Element> = {
    pending: <Clock className="w-4 h-4 text-gray-400" />,
    processing: <Clock className="w-4 h-4 text-blue-500 animate-spin" />,
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    failed: <AlertCircle className="w-4 h-4 text-red-500" />,
  }

  const handleDownload = async (documentId: string) => {
    const res = await apiClient.get<{ download_url: string }>(
      `/document-intelligence/documents/${documentId}/download`
    )
    window.open(res.download_url, "_blank")
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
    </div>
  )
}

