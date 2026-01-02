import { BODY_REGIONS } from "@/lib/anatomyData"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface AnatomySelectorProps {
  selectedRegions: string[]
  onToggleRegion: (region: string) => void
}

export function AnatomySelector({ selectedRegions, onToggleRegion }: AnatomySelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {BODY_REGIONS.map((region) => {
          const isSelected = selectedRegions.includes(region)
          return (
            <Button
              key={region}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "justify-between h-auto py-3 px-4 text-left font-normal",
                isSelected && "border-primary"
              )}
              onClick={() => onToggleRegion(region)}
            >
              {region}
              {isSelected && <Check className="h-4 w-4 ml-2 flex-shrink-0" />}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
