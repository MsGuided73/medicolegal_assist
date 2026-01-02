import { cn } from "@/lib/utils"

export interface CalendarProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  mode?: "single"
  initialFocus?: boolean
}

export function Calendar({ selected, onSelect, className }: CalendarProps & { className?: string }) {
  return (
    <div className={cn("p-3", className)}>
      <input
        type="date"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={selected ? selected.toISOString().split('T')[0] : ""}
        onChange={(e) => {
          const date = e.target.value ? new Date(e.target.value) : undefined
          onSelect?.(date)
        }}
      />
    </div>
  )
}
