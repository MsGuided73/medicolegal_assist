import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getMovementsForJoint, ROM_NORMALS } from "@/lib/anatomyData"
import { ROMMeasurement } from "@/types/examination"

interface ROMSectionProps {
  selectedRegions: string[]
  measurements: ROMMeasurement[]
  onAddMeasurement: (measurement: Partial<ROMMeasurement>) => void
  onUpdateMeasurement: (id: string, measurement: Partial<ROMMeasurement>) => void
  onRemoveMeasurement: (id: string) => void
}

export function ROMSection({
  selectedRegions,
  measurements,
  onAddMeasurement,
  onUpdateMeasurement,
  onRemoveMeasurement: _onRemoveMeasurement,
}: ROMSectionProps) {
  const [selectedRegion, setSelectedRegion] = useState(selectedRegions[0] || "")

  const movements = getMovementsForJoint(selectedRegion)
  const regionMeasurements = measurements.filter(m => m.body_region === selectedRegion)

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {movements.map((movement) => {
              const measurement = regionMeasurements.find(m => m.movement === movement)
              const normalValue = ROM_NORMALS[selectedRegion]?.[movement]

              return (
                <Card key={movement}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-medium">{movement}</CardTitle>
                      {normalValue && (
                        <span className="text-xs text-muted-foreground">Normal: {normalValue}°</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="py-3 px-4 pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Active (°)</Label>
                        <Input
                          type="number"
                          value={measurement?.active_rom || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            if (measurement) {
                              onUpdateMeasurement(measurement.id, { active_rom: val })
                            } else {
                              onAddMeasurement({
                                body_region: selectedRegion,
                                movement,
                                active_rom: val,
                                joint: selectedRegion, // Simplified
                                side: "bilateral"
                              })
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Passive (°)</Label>
                        <Input
                          type="number"
                          value={measurement?.passive_rom || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            if (measurement) {
                              onUpdateMeasurement(measurement.id, { passive_rom: val })
                            } else {
                              onAddMeasurement({
                                body_region: selectedRegion,
                                movement,
                                passive_rom: val,
                                joint: selectedRegion,
                                side: "bilateral"
                              })
                            }
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          Please select a body region to record measurements.
        </div>
      )}
    </div>
  )
}
