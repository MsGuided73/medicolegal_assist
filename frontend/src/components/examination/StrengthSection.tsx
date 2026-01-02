import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { StrengthTest } from "@/types/examination"

interface StrengthSectionProps {
  selectedRegions: string[]
  strengthTests: StrengthTest[]
  onAddTest: (test: Partial<StrengthTest>) => void
  onUpdateTest: (id: string, test: Partial<StrengthTest>) => void
}

const MUSCLE_GROUPS: Record<string, string[]> = {
  "Cervical Spine": ["Paraspinal muscles", "Sternocleidomastoid", "Trapezius"],
  "Lumbar Spine": ["Paraspinal muscles", "Psoas", "Gluteus Maximus"],
  "Shoulder (Left)": ["Deltoid", "Biceps", "Triceps", "Rotator cuff"],
  "Shoulder (Right)": ["Deltoid", "Biceps", "Triceps", "Rotator cuff"],
  // Add more
}

export function StrengthSection({
  selectedRegions,
  strengthTests,
  onAddTest,
  onUpdateTest,
}: StrengthSectionProps) {
  const [selectedRegion, setSelectedRegion] = useState(selectedRegions[0] || "")

  const muscleGroups = MUSCLE_GROUPS[selectedRegion] || ["General"]
  const regionTests = strengthTests.filter(t => t.body_region === selectedRegion)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {selectedRegions.map((region) => (
          <Button
            key={region}
            variant={selectedRegion === region ? "default" : "outline"}
            onClick={() => setSelectedRegion(region)}
          >
            {region}
          </Button>
        ))}
      </div>

      {selectedRegion ? (
        <div className="space-y-4">
          {muscleGroups.map((muscle) => {
            const test = regionTests.find(t => t.muscle_group === muscle)
            
            return (
              <Card key={muscle}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium">{muscle}</CardTitle>
                </CardHeader>
                <CardContent className="py-3 px-4 pt-0">
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs">Strength Grade (0-5)</Label>
                        <div className="flex gap-1">
                            {[0, 1, 2, 3, 4, 5].map(grade => (
                                <Button
                                    key={grade}
                                    variant={test?.strength_grade === grade ? "default" : "outline"}
                                    size="sm"
                                    className="w-10"
                                    onClick={() => {
                                        if (test) {
                                            onUpdateTest(test.id, { strength_grade: grade })
                                        } else {
                                            onAddTest({
                                                body_region: selectedRegion,
                                                muscle_group: muscle,
                                                strength_grade: grade,
                                                side: "bilateral"
                                            })
                                        }
                                    }}
                                >
                                    {grade}
                                </Button>
                            ))}
                        </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          Please select a body region to record strength tests.
        </div>
      )}
    </div>
  )
}
