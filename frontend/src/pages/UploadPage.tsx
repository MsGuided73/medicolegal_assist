import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText } from 'lucide-react'
import { useDocumentIntelligence } from '@/hooks/useDocumentIntelligence'

export default function UploadDocument() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  
  const navigate = useNavigate()
  const { analyzeDocument } = useDocumentIntelligence()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024 // 100MB
  })

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setStatus('Uploading...')

    try {
      // Simulate/Show initial progress
      setProgress(30)
      setStatus('Processing document...')

      // Call API
      const result = await analyzeDocument(file)

      setProgress(100)
      setStatus('Complete!')

      // Navigate to results
      setTimeout(() => {
        navigate('/results', { state: { result } })
      }, 1000)

    } catch (error: any) {
      setStatus(`Error: ${error.message}`)
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 text-left">
          <h1 className="text-2xl font-bold">Upload Medical Document</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 text-left">
        <Card>
          <CardHeader>
            <CardTitle>Upload PDF Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${file ? 'bg-green-50 border-green-500' : ''}
              `}
            >
              <input {...getInputProps()} />
              
              {!file ? (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg mb-2 text-center">
                    {isDragActive 
                      ? 'Drop the PDF here...'
                      : 'Drag & drop a PDF here, or click to select'
                    }
                  </p>
                  <p className="text-sm text-gray-500 text-center">
                    Maximum file size: 100MB
                  </p>
                </>
              ) : (
                <>
                  <FileText className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium mb-1 text-center">{file.name}</p>
                  <p className="text-sm text-gray-500 text-center">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{status}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1"
              >
                {uploading ? 'Processing...' : 'Analyze Document'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
