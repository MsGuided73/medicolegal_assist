import { Badge } from "@/components/ui/badge"
import { CasePriority } from "@/types/case"
import { cn } from "@/lib/utils"

const priorityConfig = {
  urgent: { color: "bg-red-100 text-red-800 border-red-200", label: "Urgent", emoji: "🔴" },
  high: { color: "bg-orange-100 text-orange-800 border-orange-200", label: "High", emoji: "🟠" },
  normal: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Normal", emoji: "🟡" },
  low: { color: "bg-green-100 text-green-800 border-green-200", label: "Low", emoji: "🟢" },
}

interface CasePriorityBadgeProps {
  priority: CasePriority
  className?: string
}

export function CasePriorityBadge({ priority, className }: CasePriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.normal

  return (
    <Badge
      variant="outline"
      className={cn("flex w-fit items-center gap-1 font-medium", config.color, className)}
    >
      <span className="text-[10px]">{config.emoji}</span>
      {config.label}
    </Badge>
  )
}
