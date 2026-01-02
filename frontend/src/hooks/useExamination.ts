import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { examinationsApi } from "@/api/examinations"
import { Examination, ROMMeasurement, StrengthTest, SpecialTest } from "@/types/examination"

export function useExamination(caseId: string) {
  return useQuery({
    queryKey: ["examination", caseId],
    queryFn: () => examinationsApi.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useUpdateExamination(id?: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<Examination>) => {
      if (!id) throw new Error("Examination ID is required for update")
      return examinationsApi.update(id, data)
    },
    onSuccess: (updatedExam) => {
      queryClient.setQueryData(["examination", updatedExam.case_id], updatedExam)
    },
  })
}

export function useCreateExamination() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: examinationsApi.create,
    onSuccess: (newExam) => {
      queryClient.invalidateQueries({ queryKey: ["examination", newExam.case_id] })
    },
  })
}

export function useAddROM(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ROMMeasurement>) => examinationsApi.addROM(examId, data),
    onSuccess: (result) => {
      // Invalidate to refresh the full exam data
      queryClient.invalidateQueries({ queryKey: ["examination"] })
    }
  })
}

export function useAddStrength(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<StrengthTest>) => examinationsApi.addStrength(examId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examination"] })
    }
  })
}

export function useAddSpecialTest(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SpecialTest>) => examinationsApi.addSpecialTest(examId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examination"] })
    }
  })
}
