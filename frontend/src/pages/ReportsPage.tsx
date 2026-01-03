import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Search, Filter, Download, Edit2 } from "lucide-react"
import { Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useReports } from "@/hooks/useReports"

export default function ReportsPage() {
  const [search, setSearch] = useState("")

  const { data: reports, isLoading } = useReports()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return reports || []
    return (reports || []).filter((r: any) => {
      const patient = `${r.patient_first_name || ""} ${r.patient_last_name || ""}`.toLowerCase()
      const caseNum = (r.case_number || "").toLowerCase()
      const type = (r.report_type || "").toLowerCase()
      return patient.includes(q) || caseNum.includes(q) || type.includes(q)
    })
  }, [reports, search])
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Manage and export medical reports</p>
        </div>
        <Button asChild>
            <Link to="/cases">
                <Plus className="h-4 w-4 mr-2" />
                New Report (from Case)
            </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports by patient or case number..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No reports found.</p>
        )}

        {filtered.map((r: any) => (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant="secondary">{String(r.status || "draft").toUpperCase()}</Badge>
                <span className="text-xs text-muted-foreground">{r.case_id}</span>
              </div>
              <CardTitle className="text-lg">{String(r.report_type || "report").toUpperCase()} Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                Report date: {r.report_date || "—"}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                <span>Updated {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/reports/${r.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
