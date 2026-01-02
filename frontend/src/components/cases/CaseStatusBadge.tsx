import { Badge } from "@/components/ui/badge"
import { CaseStatus } from "@/types/case"
import { cn } from "@/lib/utils"
import { Circle, Clock, Eye, CheckCircle, Archive } from "lucide-react"

const statusConfig = {
  open: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Open", icon: Circle },
  in_progress: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "In Progress", icon: Clock },
  review: { color: "bg-orange-100 text-orange-800 border-orange-200", label: "Review", icon: Eye },
  completed: { color: "bg-green-100 text-green-800 border-green-200", label: "Completed", icon: CheckCircle },
  archived: { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Archived", icon: Archive },
}

interface CaseStatusBadgeProps {
  status: CaseStatus
  className?: string
}

export function CaseStatusBadge({ status, className }: CaseStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.open
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn("flex w-fit items-center gap-1 font-medium", config.color, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}
