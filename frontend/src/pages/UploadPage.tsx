import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useDropzone } from "react-dropzone"
import { useUploadAndAnalyze } from "@/hooks/useDocuments"
import { useCases, useCreateCase } from "@/hooks/useCases"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, Check, ChevronLeft, Plus, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"

export default function UploadPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCaseId = searchParams.get("caseId")
  
  const [caseId, setCaseId] = useState<string | null>(initialCaseId)
  const [isCreatingCase, setIsCreatingCase] = useState(false)
  const [patientName, setPatientName] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const { mutateAsync: uploadFile } = useUploadAndAnalyze()
  const { mutateAsync: createCase } = useCreateCase()
  const { data: cases } = useCases({ status: "open" })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 100 * 1024 * 1024
  })

  const handleStartUpload = async () => {
    if (files.length === 0) return
    
    let currentCaseId = caseId
    
    setUploading(true)
    
    try {
      // 1. Create case if needed
      if (!currentCaseId) {
        if (!patientName) {
            toast.error("Please enter a patient name or select a case")
            setUploading(false)
            return
        }
        const newCase = await createCase({
            patient_first_name: patientName.split(' ')[0],
            patient_last_name: patientName.split(' ').slice(1).join(' ') || 'Unknown',
            status: "open",
            case_number: `CASE-${Date.now()}`
        })
        currentCaseId = newCase.id
        setCaseId(currentCaseId)
      }

      // 2. Upload files in sequence
      for (const file of files) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 10 }))
        await uploadFile({ caseId: currentCaseId!, file })
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
      }

      toast.success("All documents uploaded and queued for analysis")
      
      // Navigate to analysis results
      setTimeout(() => {
        navigate(`/cases/${currentCaseId}/analysis`)
      }, 1500)

    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`)
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-left">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Upload Medical Records</h1>
          <p className="text-muted-foreground">Associate medical documents with a case for AI analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Step 1: Case Association */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select or Create Case</CardTitle>
              <CardDescription>All uploaded documents must be tied to a specific patient case.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!caseId && !isCreatingCase ? (
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label>Select Existing Case</Label>
                        <select 
                            className="w-full p-2 border rounded-md"
                            onChange={(e) => setCaseId(e.target.value)}
                            value={caseId || ""}
                        >
                            <option value="">-- Choose a case --</option>
                            {cases?.map(c => (
                                <option key={c.id} value={c.id}>{c.patient_first_name} {c.patient_last_name} ({c.case_number})</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">OR</span></div>
                    </div>
                    <Button variant="outline" onClick={() => setIsCreatingCase(true)} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Case for this Upload
                    </Button>
                </div>
              ) : isCreatingCase ? (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Patient Full Name</Label>
                        <Input 
                            placeholder="e.g. John Doe" 
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setIsCreatingCase(false)}>Cancel</Button>
                        <Button variant="secondary" onClick={() => setCaseId(null)}>Select Existing Instead</Button>
                    </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-600" />
                        <div>
                            <p className="font-medium">Case Associated</p>
                            <p className="text-xs text-muted-foreground">ID: {caseId}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setCaseId(null); setIsCreatingCase(false); }}>Change</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Multi-file Dropzone */}
          <Card>
            <CardHeader>
              <CardTitle>2. Upload Document Sets</CardTitle>
              <CardDescription>Drag and drop multiple medical records (PDF only).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
                  isDragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/20 hover:border-primary/50",
                  files.length > 0 && "border-green-500/50 bg-green-50/10"
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-lg font-medium">Click or drag records here</p>
                  <p className="text-sm text-muted-foreground">Support for multi-file upload (up to 100MB per file)</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label>Files to process ({files.length})</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded bg-secondary/10">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {uploadProgress[file.name] > 0 && (
                                <span className="text-[10px] font-bold text-primary">{uploadProgress[file.name]}%</span>
                            )}
                            <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                                <XCircle className="h-4 w-4" />
                            </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                    <div className="flex justify-between"><span>Record Sets:</span> <span className="font-bold">{files.length}</span></div>
                    <div className="flex justify-between"><span>Total Size:</span> <span className="font-bold">{(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(1)} MB</span></div>
                </div>
                <Button 
                    className="w-full py-6" 
                    disabled={files.length === 0 || uploading}
                    onClick={handleStartUpload}
                >
                    {uploading ? "Uploading..." : "Start AI Analysis"}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">Documents are processed using HIPAA-compliant Gemini 2.0 pipeline.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
                <CardTitle className="text-sm">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• PDF format only</p>
                <p>• Clear legibility for optimal OCR</p>
                <p>• Max 649 pages per document</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
