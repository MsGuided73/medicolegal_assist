import { useState, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { 
  useExamination, 
  useUpdateExamination, 
  useCreateExamination,
  useAddROM,
  useAddStrength
} from "@/hooks/useExamination"
import { useCase } from "@/hooks/useCases"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AnatomySelector } from "@/components/examination/AnatomySelector"
import { ROMSection } from "@/components/examination/ROMSection"
import { StrengthSection } from "@/components/examination/StrengthSection"
import { ChevronLeft, Save, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

export default function PhysicalExamPage() {
  const [searchParams] = useSearchParams()
  const caseId = searchParams.get("caseId")
  const navigate = useNavigate()
  
  const { data: caseData } = useCase(caseId || "")
  const { data: exam, isLoading: examLoading } = useExamination(caseId || "")
  const { mutate: createExam } = useCreateExamination()
  const { mutate: updateExam } = useUpdateExamination(exam?.id)
  const { mutate: addROM } = useAddROM(exam?.id || "")
  const { mutate: addStrength } = useAddStrength(exam?.id || "")

  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("anatomy")

  useEffect(() => {
    if (caseData && !exam && !examLoading && caseId) {
      // Create exam if it doesn't exist
      createExam({
        case_id: caseId,
        exam_date: new Date().toISOString().split('T')[0],
      })
    }
  }, [caseData, exam, examLoading, caseId, createExam])

  useEffect(() => {
    if (exam?.rom_measurements) {
        const regions = [...new Set(exam.rom_measurements.map(m => m.body_region))]
        setSelectedRegions(prev => [...new Set([...prev, ...regions])])
    }
  }, [exam])

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    )
  }

  const handleComplete = () => {
    updateExam({ status: "completed" }, {
      onSuccess: () => {
        toast.success("Examination completed")
        navigate(`/cases/${caseId}`)
      }
    })
  }

  if (!caseId) return <div className="p-8 text-center text-destructive">Error: No case ID provided.</div>
  if (examLoading) return <div className="p-8 text-center animate-pulse">Loading examination...</div>

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cases/${caseId}`)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Physical Examination</h1>
            <p className="text-sm text-muted-foreground">
              {caseData?.patient_first_name} {caseData?.patient_last_name} • Case #{caseData?.case_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success("Draft saved")}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
            </Button>
            <Button size="sm" onClick={handleComplete}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Examination
            </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="anatomy">1. Body Regions</TabsTrigger>
          <TabsTrigger value="rom" disabled={selectedRegions.length === 0}>2. Range of Motion</TabsTrigger>
          <TabsTrigger value="strength" disabled={selectedRegions.length === 0}>3. Strength</TabsTrigger>
        </TabsList>

        <TabsContent value="anatomy" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Body Regions</CardTitle>
              <CardDescription>Select the anatomical areas affected by the injury to record measurements.</CardDescription>
            </CardHeader>
            <CardContent>
              <AnatomySelector 
                selectedRegions={selectedRegions} 
                onToggleRegion={toggleRegion} 
              />
              <div className="mt-8 flex justify-end">
                <Button 
                    disabled={selectedRegions.length === 0}
                    onClick={() => setActiveTab("rom")}
                >
                    Next: Range of Motion
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rom" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Range of Motion Measurements</CardTitle>
                    <CardDescription>Record active and passive range of motion for selected regions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ROMSection 
                        selectedRegions={selectedRegions}
                        measurements={exam?.rom_measurements || []}
                        onAddMeasurement={(m) => addROM(m)}
                        onUpdateMeasurement={(id, m) => { /* Update existing logic */ }}
                        onRemoveMeasurement={(id) => { /* Remove logic */ }}
                    />
                    <div className="mt-8 flex justify-between">
                        <Button variant="outline" onClick={() => setActiveTab("anatomy")}>Back</Button>
                        <Button onClick={() => setActiveTab("strength")}>Next: Strength</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="strength" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manual Muscle Testing</CardTitle>
                    <CardDescription>Grade muscle strength on a 0-5 scale.</CardDescription>
                </CardHeader>
                <CardContent>
                    <StrengthSection 
                        selectedRegions={selectedRegions}
                        strengthTests={exam?.strength_tests || []}
                        onAddTest={(t) => addStrength(t)}
                        onUpdateTest={(id, t) => { /* Update logic */ }}
                    />
                    <div className="mt-8 flex justify-between">
                        <Button variant="outline" onClick={() => setActiveTab("rom")}>Back</Button>
                        <Button onClick={handleComplete}>Complete Examination</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
