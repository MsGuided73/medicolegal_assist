import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Pill, Stethoscope } from 'lucide-react'

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const { result } = location.state || {}

  if (!result) {
    navigate('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center text-left">
          <h1 className="text-2xl font-bold">Document Analysis Results</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6 text-left">
        {/* Document Info */}
        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Document Type</p>
                <p className="text-lg font-medium capitalize">
                  {result.document_type?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quality Score</p>
                <p className="text-lg font-medium">
                  {(result.quality_score * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">OCR Confidence</p>
                <p className="text-lg font-medium">
                  {(result.ocr_confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Entities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Medical Entities ({result.medical_entities?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Diagnoses */}
              <div>
                <h3 className="font-medium mb-2">Diagnoses</h3>
                <div className="space-y-2">
                  {result.medical_entities
                    ?.filter((e: any) => e.category === 'diagnosis')
                    .map((entity: any, idx: number) => (
                      <div 
                        key={idx}
                        className="flex items-start justify-between p-3 bg-blue-50 rounded"
                      >
                        <div>
                          <p className="font-medium text-left">{entity.text}</p>
                          {entity.icd10_code && (
                            <p className="text-sm text-gray-600 text-left">
                              ICD-10: {entity.icd10_code}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {(entity.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>

              {/* Medications */}
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  Medications
                </h3>
                <div className="space-y-2">
                  {result.medical_entities
                    ?.filter((e: any) => e.category === 'medication')
                    .map((entity: any, idx: number) => (
                      <div 
                        key={idx}
                        className="flex items-start justify-between p-3 bg-green-50 rounded"
                      >
                        <p className="font-medium text-left">{entity.text}</p>
                        <Badge variant="secondary">
                          {(entity.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clinical Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Clinical Timeline ({result.clinical_dates?.length || 0} dates)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.clinical_dates?.map((date: any, idx: number) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium capitalize text-left">
                      {date.date_type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-600 text-left">
                      {new Date(date.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {(date.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document Sections */}
        <Card>
          <CardHeader>
            <CardTitle>Document Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.sections?.map((section: any, idx: number) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 text-left">
                  <h3 className="font-medium">{section.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {section.section_type}
                  </p>
                  <p className="text-sm mt-2 text-gray-700">
                    {section.content.substring(0, 200)}
                    {section.content.length > 200 && '...'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button className="flex-1">
            Approve & Continue
          </Button>
          <Button variant="outline" className="flex-1">
            Edit Entities
          </Button>
        </div>
      </main>
    </div>
  )
}
