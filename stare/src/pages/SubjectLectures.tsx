import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSubject, listLecturesBySubject, deleteLecture } from '@/lib/repo'
import type { Subject, Lecture } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function SubjectLectures() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [subject, setSubject] = useState<Subject | null>(null)
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  async function loadData() {
    if (!id) return
    
    try {
      const subj = await getSubject(id)
      const lecs = await listLecturesBySubject(id)
      
      setSubject(subj || null)
      setLectures(lecs)
    } catch (err) {
      console.error('Błąd ładowania:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(lectureId: string) {
    if (!confirm('Czy na pewno usunąć ten wykład? Wszystkie notatki, fiszki i quizy zostaną usunięte.')) {
      return
    }
    
    try {
      await deleteLecture(lectureId)
      await loadData()
    } catch (err) {
      console.error('Błąd usuwania:', err)
      alert('Nie udało się usunąć wykładu')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/subjects')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:underline mb-2"
          >
            ← Powrót do przedmiotów
          </button>
          <h1 className="text-3xl font-bold">{subject?.name || 'Przedmiot'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {lectures.length} wykładów
          </p>
        </div>
        
        <Button onClick={() => navigate('/new-lecture')}>
          + Nowy wykład
        </Button>
      </div>

      {/* Wykłady */}
      {lectures.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Brak wykładów w tym przedmiocie
          </p>
          <Button onClick={() => navigate('/new-lecture')}>
            Utwórz pierwszy wykład
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {lectures.map(lecture => (
            <Card key={lecture.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/lecture/${lecture.id}`)}>
                  <h3 className="text-xl font-semibold mb-2">{lecture.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(lecture.createdAt).toLocaleString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {lecture.duration && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Długość: {Math.floor(lecture.duration / 60)} min
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(`/lecture/${lecture.id}`)}
                    variant="outline"
                  >
                    Otwórz
                  </Button>
                  <button
                    onClick={() => handleDelete(lecture.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
