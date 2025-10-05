import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLecture, listLectureTabs, saveLectureTab } from '@/lib/repo'
import { downloadText } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { MarkdownViewer } from '@/components/MarkdownViewer'
import { Download, Save, ArrowLeft } from 'lucide-react'
import type { Lecture } from '@/lib/types'

type Tab = {
  id: string;
  kind: string;
  content: string;
}

export default function NoteView() {
  const { lectureId } = useParams()
  const navigate = useNavigate()
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTab, setActiveTab] = useState<string>('transcript')
  const [userDraft, setUserDraft] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (lectureId) {
      (async () => {
        const [lectureData, tabsData] = await Promise.all([
          getLecture(lectureId),
          listLectureTabs(lectureId),
        ])
        setLecture(lectureData || null)
        setTabs(tabsData as Tab[])
        
        const userTab = tabsData.find((t: Tab) => t.kind === 'user')
        setUserDraft(userTab?.content ?? '')

        // Ustaw domyślną aktywną kartę
        if (tabsData.length > 0) {
          const preferredOrder = ['notes', 'cleaned', 'transcript', 'user']
          for (const kind of preferredOrder) {
            if (tabsData.some((t: Tab) => t.kind === kind)) {
              setActiveTab(kind)
              return
            }
          }
          setActiveTab(tabsData[0].kind)
        }

      })()
    }
  }, [lectureId])

  const tabOrder = ['notes', 'cleaned', 'transcript', 'user', 'summary', 'questions', 'flashcards', 'mindmap']
  const sortedTabs = useMemo(() => [...tabs].sort((a, b) => {
    const indexA = tabOrder.indexOf(a.kind)
    const indexB = tabOrder.indexOf(b.kind)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  }), [tabs])

  const activeTabData = sortedTabs.find(t => t.kind === activeTab)

  async function handleSaveUserNote() {
    if (!lectureId) return
    // User notes are no longer saved as a lecture tab
    // This functionality is deprecated
    toast({
      title: "Informacja",
      description: "Funkcja notatek użytkownika jest w trakcie aktualizacji.",
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lecture?.title || 'Ładowanie...'}</h1>
            <p className="text-muted-foreground">
              Przeglądaj notatki i materiały wygenerowane przez AI.
            </p>
          </div>
        </div>
      </div>

      {sortedTabs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p>Brak notatek dla tego wykładu.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sortedTabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.kind}>{label(tab.kind)}</TabsTrigger>
            ))}
          </TabsList>

          {sortedTabs.map(tab => (
            <TabsContent key={tab.id} value={tab.kind}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{label(tab.kind)}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadText(`${tab.kind}-${lectureId}.md`, tab.content)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Pobierz
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {tab.kind === 'user' ? (
                    <div className="space-y-4">
                      <Textarea
                        value={userDraft}
                        onChange={e => setUserDraft(e.target.value)}
                        rows={16}
                        placeholder="Zacznij pisać swoje notatki..."
                      />
                      <Button onClick={handleSaveUserNote}>
                        <Save className="mr-2 h-4 w-4" />
                        Zapisz moje notatki
                      </Button>
                    </div>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none">
                      <MarkdownViewer content={tab.content} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}

function label(kind: string) {
  switch (kind) {
    case 'transcript': return 'Transkrypcja'
    case 'cleaned': return 'Oczyszczony tekst'
    case 'notes': return 'Notatki'
    case 'user': return 'Moje notatki'
    case 'summary': return 'Streszczenie'
    case 'questions': return 'Bank pytań'
    case 'flashcards': return 'Fiszki'
    case 'mindmap': return 'Mapa myśli'
    default: return kind
  }
}
