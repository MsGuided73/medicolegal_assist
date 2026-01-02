import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCreateCase } from "@/hooks/useCases"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft } from "lucide-react"
import { toast } from "react-hot-toast" // Wait, is react-hot-toast installed?

const caseFormSchema = z.object({
  patient_first_name: z.string().min(1, "First name is required"),
  patient_last_name: z.string().min(1, "Last name is required"),
  patient_dob: z.string().min(1, "Date of birth is required"),
  injury_date: z.string().min(1, "Injury date is required"),
  injury_mechanism: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  exam_date: z.string().optional(),
  report_due_date: z.string().optional(),
})

type CaseFormValues = z.infer<typeof caseFormSchema>

export default function CreateCasePage() {
  const navigate = useNavigate()
  const { mutate: createCase, isPending } = useCreateCase()

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      priority: "normal",
    },
  })

  function onSubmit(values: CaseFormValues) {
    createCase(values, {
      onSuccess: (newCase) => {
        toast.success("Case created successfully")
        navigate(`/cases/${newCase.id}`)
      },
      onError: (error) => {
        console.error("Failed to create case:", error)
        toast.error("Failed to create case")
      }
    })
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cases")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Create New Case</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_first_name">First Name *</Label>
                <Input
                  id="patient_first_name"
                  {...form.register("patient_first_name")}
                  placeholder="John"
                />
                {form.formState.errors.patient_first_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.patient_first_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="patient_last_name">Last Name *</Label>
                <Input
                  id="patient_last_name"
                  {...form.register("patient_last_name")}
                  placeholder="Doe"
                />
                {form.formState.errors.patient_last_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.patient_last_name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient_dob">Date of Birth *</Label>
              <Input
                id="patient_dob"
                type="date"
                {...form.register("patient_dob")}
              />
              {form.formState.errors.patient_dob && (
                <p className="text-xs text-destructive">{form.formState.errors.patient_dob.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="injury_date">Injury Date *</Label>
                <Input
                  id="injury_date"
                  type="date"
                  {...form.register("injury_date")}
                />
                {form.formState.errors.injury_date && (
                  <p className="text-xs text-destructive">{form.formState.errors.injury_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  defaultValue={form.getValues("priority")}
                  onValueChange={(value: any) => form.setValue("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="injury_mechanism">Injury Mechanism</Label>
              <Input
                id="injury_mechanism"
                {...form.register("injury_mechanism")}
                placeholder="e.g. MVA, Fall at work, etc."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam_date">Scheduled Exam Date</Label>
                <Input
                  id="exam_date"
                  type="date"
                  {...form.register("exam_date")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report_due_date">Report Due Date</Label>
                <Input
                  id="report_due_date"
                  type="date"
                  {...form.register("report_due_date")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate("/cases")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Case"}
          </Button>
        </div>
      </form>
    </div>
  )
}
