import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useReport } from "@/hooks/useReports"
import { useCase } from "@/hooks/useCases"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ChevronLeft, 
  Save, 
  FileText, 
  Download, 
  Send, 
  MoreVertical,
  CheckCircle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { Report, ReportSection } from "@/types/report"

export default function ReportEditorPage() {
  const { id: reportId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: report, isLoading: reportLoading } = useReport(reportId!)
  const { data: caseData } = useCase((report as Report)?.case_id || "")

  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    if (report && (report as Report).sections && (report as Report).sections!.length > 0) {
      setActiveSection((report as Report).sections![0].id)
    }
  }, [report])

  if (reportLoading) return <div className="p-8 text-center animate-pulse">Loading report...</div>
  if (!report) return <div className="p-8 text-center">Report not found.</div>

  const typedReport = report as Report

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {typedReport.report_type.replace("_", " ").toUpperCase()} Report
            </h1>
            <p className="text-sm text-muted-foreground mr-2">
              Case #{caseData?.case_number} • {caseData?.patient_first_name} {caseData?.patient_last_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="secondary" className="mr-2 capitalize">{typedReport.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => toast.success("Draft saved")}>
                <Save className="h-4 w-4 mr-2" />
                Save
            </Button>
            <Button size="sm">
                <Send className="h-4 w-4 mr-2" />
                Finalize
            </Button>
            <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
            </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Navigation Sections */}
        <aside className="w-64 bg-white border-r overflow-y-auto p-4 space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Report Sections</h2>
            {typedReport.sections?.map((section: ReportSection) => (
                <button
                    key={section.id}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                        activeSection === section.id 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "hover:bg-secondary text-muted-foreground"
                    }`}
                    onClick={() => setActiveSection(section.id)}
                >
                    <span className="truncate">{section.section_title}</span>
                    {section.content?.trim() && <CheckCircle className={`h-3 w-3 ${activeSection === section.id ? "text-primary-foreground" : "text-green-500"}`} />}
                </button>
            ))}
        </aside>

        {/* Main Content - Editor Area */}
        <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {typedReport.sections?.map((section: ReportSection) => (
                    <Card key={section.id} className={activeSection === section.id ? "ring-2 ring-primary border-transparent" : "opacity-80"}>
                        <CardHeader className="py-4 border-b">
                            <CardTitle className="text-lg">{section.section_title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <textarea
                                className="w-full min-h-[200px] p-6 focus:outline-none resize-none bg-transparent prose max-w-none"
                                placeholder={`Enter content for ${section.section_title}...`}
                                defaultValue={section.content}
                                onFocus={() => setActiveSection(section.id)}
                            />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </main>

        {/* Right Panel - AI Insights / Case Summary */}
        <aside className="w-80 bg-white border-l overflow-y-auto p-6 hidden lg:block">
            <div className="space-y-8">
                <div>
                    <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        AI Clinical Insight
                    </h2>
                    <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                        <p>Based on the analyzed records, there is a consistent history of lower back pain since the incident on {caseData?.injury_date}.</p>
                        <p>Primary ICD-10 suggestions:</p>
                        <ul className="list-disc list-inside">
                            <li>M54.5 (Low back pain)</li>
                            <li>M51.17 (Lumbosacral disc disorder)</li>
                        </ul>
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Download className="h-4 w-4 text-green-500" />
                        Export Options
                    </h2>
                    <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                            <FileText className="h-4 w-4 mr-2" />
                            Professional PDF
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                            <FileText className="h-4 w-4 mr-2" />
                            Word Document
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
      </div>
    </div>
  )
}
