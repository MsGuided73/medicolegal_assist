import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Case } from "@/types/case"
import { CaseStatusBadge } from "./CaseStatusBadge"
import { CasePriorityBadge } from "./CasePriorityBadge"
import { format } from "date-fns"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { User, Calendar } from "lucide-react"

interface CaseCardProps {
  case: Case
  onStatusChange?: (status: string) => void
  onAssign?: (userId: string) => void
}

export function CaseCard({ case: caseData }: CaseCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <span className="text-xs font-mono text-muted-foreground">{caseData.case_number}</span>
          <CasePriorityBadge priority={caseData.priority} />
        </div>
        <CardTitle className="text-lg">
          <Link to={`/cases/${caseData.id}`} className="hover:text-primary transition-colors">
            {caseData.patient_first_name} {caseData.patient_last_name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-1">
            {caseData.injury_mechanism || "No injury mechanism specified"}
          </p>
          
          <div className="flex flex-wrap gap-2">
            <CaseStatusBadge status={caseData.status} />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {caseData.report_due_date ? format(new Date(caseData.report_due_date), "MMM d") : "N/A"}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">Dr. Williams</span> {/* Placeholder for now */}
            </div>
          </div>

          <div className="pt-2">
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link to={`/cases/${caseData.id}`}>View Details</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
