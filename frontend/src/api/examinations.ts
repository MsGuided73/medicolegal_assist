import { apiClient } from "./client"
import { Examination, ROMMeasurement, StrengthTest, SpecialTest } from "@/types/examination"

export const examinationsApi = {
  // Get examination by case ID
  getByCaseId: (caseId: string) => 
    apiClient.get<Examination>(`/examinations/cases/${caseId}`),

  // Create examination
  create: (data: Partial<Examination>) => 
    apiClient.post<Examination>("/examinations", data),

  // Update examination
  update: (id: string, data: Partial<Examination>) => 
    apiClient.put<Examination>(`/examinations/${id}`, data),

  // ROM measurements
  addROM: (examId: string, data: Partial<ROMMeasurement>) =>
    apiClient.post<ROMMeasurement>(`/examinations/${examId}/rom`, data),
  
  // Strength tests
  addStrength: (examId: string, data: Partial<StrengthTest>) =>
    apiClient.post<StrengthTest>(`/examinations/${examId}/strength`, data),

  // Special tests
  addSpecialTest: (examId: string, data: Partial<SpecialTest>) =>
    apiClient.post<SpecialTest>(`/examinations/${examId}/special-tests`, data),
}
