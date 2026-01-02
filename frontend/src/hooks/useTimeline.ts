import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { timelineApi, TimelineEvent } from "@/api/timeline"

export function useCaseTimeline(caseId: string) {
  return useQuery({
    queryKey: ["timeline", caseId],
    queryFn: () => timelineApi.getByCaseId(caseId),
    enabled: !!caseId,
  })
}

export function useGenerateTimeline() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (caseId: string) => timelineApi.generate(caseId),
    onSuccess: (_, caseId) => {
      queryClient.invalidateQueries({ queryKey: ["timeline", caseId] })
    },
  })
}

export function useAddTimelineEvent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ caseId, data }: { caseId: string, data: Partial<TimelineEvent> }) => 
      timelineApi.addEvent(caseId, data),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ["timeline", newEvent.case_id] })
    },
  })
}
