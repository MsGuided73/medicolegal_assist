import { useParams, Link } from "react-router-dom"
import { useCase, useUpdateCase } from "@/hooks/useCases"
import { Button } from "@/components/ui/button"
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge"
import { CasePriorityBadge } from "@/components/cases/CasePriorityBadge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TimelineViewer } from "@/components/upload/TimelineViewer"
import { useCaseTimeline } from "@/hooks/useTimeline"
import { useReports } from "@/hooks/useReports"
import { 
  ChevronLeft, 
  FileText, 
  History, 
  Activity, 
  ClipboardCheck,
  Plus,
  Upload,
  BrainCircuit,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "react-hot-toast"

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: caseData, isLoading } = useCase(id!)
  const { mutate: updateCase } = useUpdateCase(id!)
  const { data: timeline } = useCaseTimeline(id!)
  const { data: reports } = useReports({}, "recent") // Filter for current case ideally

  if (isLoading) return <div className="p-8 animate-pulse text-center">Loading case details...</div>
  if (!caseData) return <div className="p-8 text-center">Case not found.</div>

  const handleStatusChange = (newStatus: any) => {
    updateCase({ status: newStatus }, {
      onSuccess: () => toast.success(`Status updated to ${newStatus}`),
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/cases">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {caseData.patient_first_name} {caseData.patient_last_name}
              </h1>
              <CaseStatusBadge status={caseData.status} />
              <CasePriorityBadge priority={caseData.priority} />
            </div>
            <p className="text-sm text-muted-foreground">Case #{caseData.case_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
                <Link to="/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
                <Link to={`/cases/${id}/analysis`}>
                    <BrainCircuit className="h-4 w-4 mr-2" />
                    AI Analysis
                </Link>
            </Button>
            <Button size="sm" asChild>
                <Link to={`/examinations?caseId=${id}`}>
                    <Activity className="h-4 w-4 mr-2" />
                    Start Exam
                </Link>
            </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2 hidden md:block" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2 hidden md:block" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <History className="h-4 w-4 mr-2 hidden md:block" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="exam">
            <Activity className="h-4 w-4 mr-2 hidden md:block" />
            Physical Exam
          </TabsTrigger>
          <TabsTrigger value="reports">
            <ClipboardCheck className="h-4 w-4 mr-2 hidden md:block" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Case Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Patient DOB</p>
                    <p className="font-medium">{caseData.patient_dob ? format(new Date(caseData.patient_dob), "MMMM d, yyyy") : "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Injury Date</p>
                    <p className="font-medium">{caseData.injury_date ? format(new Date(caseData.injury_date), "MMMM d, yyyy") : "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Scheduled Exam</p>
                    <p className="font-medium">{caseData.exam_date ? format(new Date(caseData.exam_date), "MMMM d, yyyy") : "None scheduled"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Report Due Date</p>
                    <p className="font-medium">{caseData.report_due_date ? format(new Date(caseData.report_due_date), "MMMM d, yyyy") : "No due date"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Injury Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Mechanism of Injury</p>
                    <p>{caseData.injury_mechanism || "No details provided"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Affected Body Regions</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {caseData.injury_body_region?.map(region => (
                        <span key={region} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                          {region}
                        </span>
                      )) || <span className="text-sm italic">None specified</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Case Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <CaseStatusBadge status={caseData.status} className="w-full justify-center py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange("in_progress")}>In Progress</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange("review")}>Review</Button>
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange("completed")} className="col-span-2">Mark Completed</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Document Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Document upload and analysis view placeholder.</p>
              <Button className="mt-4" asChild>
                <Link to="/upload">Upload New Document</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Timeline</CardTitle>
              <CardDescription>Chronological sequence of medical events extracted from records.</CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineViewer timeline={timeline || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exam">
          <Card>
            <CardHeader>
              <CardTitle>Physical Examination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Examination forms placeholder.</p>
              <Button className="mt-4" asChild>
                <Link to={`/examinations?caseId=${caseData.id}`}>Start Examination</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Reports</CardTitle>
                  <CardDescription>View and manage medical reports for this case.</CardDescription>
              </div>
              <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  {/* Filter reports for this case */}
                  {reports?.filter((r: any) => r.case_id === id).map((report: any) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/20 transition-colors">
                          <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-primary" />
                              <div>
                                  <p className="font-medium capitalize">{report.report_type.replace('_', ' ')} Report</p>
                                  <p className="text-xs text-muted-foreground">Updated {format(new Date(report.updated_at), "MMM d, yyyy")}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">{report.status}</Badge>
                              <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/reports/${report.id}`}>Edit</Link>
                              </Button>
                          </div>
                      </div>
                  ))}
                  {(!reports || reports.filter((r: any) => r.case_id === id).length === 0) && (
                      <p className="text-center py-8 text-muted-foreground italic">No reports generated for this case yet.</p>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
