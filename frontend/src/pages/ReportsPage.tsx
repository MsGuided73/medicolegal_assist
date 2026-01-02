import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Search, Filter, Download, Edit2 } from "lucide-react"
import { Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function ReportsPage() {
  const [search, setSearch] = useState("")
  
  // No list reports API yet in reports.ts, I'll use cases list and then fetch reports for each?
  // Actually I should add listReports to reportsApi but for now I'll just show placeholders or 
  // assume there's a list endpoint.
  
  // Checking api/reports.ts ... it doesn't have list. 
  // I'll add list to reportsApi.
  
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
        {/* Placeholder for list */}
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant="secondary">DRAFT</Badge>
                    <span className="text-xs text-muted-foreground">2026-0001</span>
                </div>
                <CardTitle className="text-lg">IME Report: John Doe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">Independent medical evaluation for lumbar spine injury.</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                    <span>Updated 2h ago</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link to="/reports/some-id">
                                <Edit2 className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
