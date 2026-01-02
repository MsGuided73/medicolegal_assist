import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useCase } from "@/hooks/useCases"
import { useCaseTimeline } from "@/hooks/useTimeline"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimelineViewer } from "@/components/upload/TimelineViewer"
import { 
  ChevronLeft, 
  ArrowRight, 
  Stethoscope, 
  Pill, 
  Activity, 
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function DocumentAnalysisPage() {
  const { id: caseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { result: aiResult } = location.state || {}
  
  const { data: caseData } = useCase(caseId || "")
  const { data: timeline } = useCaseTimeline(caseId || "")

  // In a real scenario, if no state result, we might fetch from API
  const displayResult = aiResult || {
    medical_entities: [],
    clinical_dates: [],
    quality_score: 0.85,
    ocr_confidence: 0.92
  }

  const diagnoses = displayResult.medical_entities?.filter((e: any) => e.category === 'diagnosis') || []
  const medications = displayResult.medical_entities?.filter((e: any) => e.category === 'medication') || []
  const procedures = displayResult.medical_entities?.filter((e: any) => e.category === 'procedure') || []

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${caseId}`)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Analysis Results</h1>
            <p className="text-sm text-muted-foreground mr-2">
              Case #{caseData?.case_number} • AI processing complete
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/examinations?caseId=${caseId}`)}>
          Proceed to Examination
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{(displayResult.quality_score * 100).toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">Document clarity and legibility</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">OCR Confidence</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{(displayResult.ocr_confidence * 100).toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">Text extraction accuracy</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Entities Found</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{displayResult.medical_entities?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Clinical details extracted</p>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entities" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="entities">Medical Entities</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Diagnoses */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-blue-500" />
                            Diagnoses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {diagnoses.length > 0 ? diagnoses.map((e: any, i: number) => (
                            <div key={i} className="p-3 bg-secondary/30 rounded-lg space-y-1">
                                <p className="font-medium text-sm">{e.text}</p>
                                {e.icd10_code && <Badge variant="outline" className="text-[10px]">{e.icd10_code}</Badge>}
                            </div>
                        )) : <p className="text-sm text-muted-foreground italic">No diagnoses found</p>}
                    </CardContent>
                </Card>

                {/* Medications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Pill className="h-5 w-5 text-green-500" />
                            Medications
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {medications.length > 0 ? medications.map((e: any, i: number) => (
                            <div key={i} className="p-3 bg-secondary/30 rounded-lg">
                                <p className="font-medium text-sm">{e.text}</p>
                            </div>
                        )) : <p className="text-sm text-muted-foreground italic">No medications found</p>}
                    </CardContent>
                </Card>

                {/* Procedures */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-purple-500" />
                            Procedures
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {procedures.length > 0 ? procedures.map((e: any, i: number) => (
                            <div key={i} className="p-3 bg-secondary/30 rounded-lg">
                                <p className="font-medium text-sm">{e.text}</p>
                            </div>
                        )) : <p className="text-sm text-muted-foreground italic">No procedures found</p>}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Clinical Timeline</CardTitle>
                    <CardDescription>Chronological sequence of extracted medical events.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TimelineViewer timeline={timeline || []} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
