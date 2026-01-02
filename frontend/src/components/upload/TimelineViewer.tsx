import { TimelineEvent } from "@/api/timeline"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, Pill, Stethoscope, AlertTriangle, Calendar } from "lucide-react"

interface TimelineViewerProps {
  timeline: TimelineEvent[]
}

export function TimelineViewer({ timeline }: TimelineViewerProps) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-gray-50">
        No clinical events found for this case yet.
      </div>
    )
  }

  const sortedEvents = [...timeline].sort((a, b) => 
    new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "injury": return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "medication": return <Pill className="h-4 w-4 text-blue-500" />
      case "procedure": return <Stethoscope className="h-4 w-4 text-green-500" />
      case "exam": return <Activity className="h-4 w-4 text-purple-500" />
      default: return <Calendar className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {sortedEvents.map((event, index) => (
        <div key={event.id} className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm z-10">
            {getEventIcon(event.event_type)}
          </div>
          <Card className="flex-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold">{event.title}</h4>
                <time className="text-xs text-muted-foreground">
                    {format(new Date(event.event_date), "MMM d, yyyy")}
                </time>
              </div>
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
