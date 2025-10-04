import { useEffect, useMemo, useState } from 'react'
import { listSubjects, listSessionsBySubject, getExamBank } from '@/lib/repo'
import { downloadText } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function Exams() {
  const [count, setCount] = useState(5)
  const [seed, setSeed] = useState('')
  const [content, setContent] = useState('')
  const [keyContent, setKeyContent] = useState('')
  const [subjects, setSubjects] = useState<{id:string;name:string}[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [sessions, setSessions] = useState<{id:string;title:string}[]>([])
  const [sessionId, setSessionId] = useState('')
  const [bank, setBank] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => { 
    setMounted(true)
    ;(async () => setSubjects(await listSubjects()))() 
  }, [])
  
  useEffect(() => { (async () => {
    if (!subjectId) { setSessions([]); setSessionId(''); return }
    const s = await listSessionsBySubject(subjectId)
    setSessions(s.map(x => ({ id:x.id, title:x.title })))
  })() }, [subjectId])
  
  useEffect(() => { (async () => {
    if (!sessionId) { setBank(null); return }
    setBank(await getExamBank(sessionId))
  })() }, [sessionId])

  function rng(seedStr: string) {
    let s = 0
    for (let i=0;i<seedStr.length;i++) s = (s*31 + seedStr.charCodeAt(i)) >>> 0
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff
  }

  function pick<T>(arr: T[], n: number, rnd: () => number): T[] {
    const a = [...arr]
    for (let i=a.length-1;i>0;i--) { const j = Math.floor(rnd()*(i+1)); [a[i],a[j]] = [a[j],a[i]] }
    return a.slice(0, Math.min(n, a.length))
  }

  async function generate() {
    if (!bank) { setContent('Brak banku pytań dla wybranej sesji.'); return }
    setIsGenerating(true)
    
    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const s = seed || Math.random().toString(36).slice(2,8)
    const rnd = rng(s)
    const mc = pick(bank.multipleChoice ?? [], Math.ceil(count*0.5), rnd)
    const tf = pick(bank.trueFalse ?? [], Math.ceil(count*0.3), rnd)
    const op = pick(bank.open ?? [], count - mc.length - tf.length, rnd)
    const lines: string[] = ['# Sprawdzian', '', `Seed: ${s}`, '']
    const keyLines: string[] = ['# Klucz odpowiedzi', '', `Seed: ${s}`, '']
    mc.forEach((q:any,idx:number)=>{
      const opts = pick<string>(q.options as string[], (q.options as string[]).length, rnd)
      const correctLetterIdx = opts.indexOf((q.options as string[])[q.answer])
      const qNum = idx+1
      lines.push(`${qNum}. ${q.q}`)
      opts.forEach((o: string, i: number) => { lines.push(`   ${String.fromCharCode(65+i)}) ${o}`) })
      lines.push('')
      keyLines.push(`${qNum}. ${String.fromCharCode(65+Math.max(0, correctLetterIdx))}`)
    })
    const offset = mc.length
    tf.forEach((q:any,idx:number)=>{ const n = offset+idx+1; lines.push(`${n}. [P/F] ${q.q}`); keyLines.push(`${n}. ${q.answer ? 'P' : 'F'}`) })
    op.forEach((q:any,idx:number)=>{ const n = offset+tf.length+idx+1; lines.push(`${n}. ${q.q}`); keyLines.push(`${n}. —`) })
    setContent(lines.join('\n'))
    setKeyContent(keyLines.join('\n'))
    setIsGenerating(false)
  }

  const canGenerate = subjectId && sessionId && bank

  return (
    <section className={`space-y-8 ${mounted ? 'animate-fade-in' : ''}`}>
      {/* Header */}
      <div className="text-center pb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          📝 Generator Sprawdzianów
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Twórz spersonalizowane sprawdziany z banku pytań. Dostosuj liczbę pytań i generuj różne wersje.
        </p>
      </div>

      {/* Configuration */}
      <Card variant="glass" className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          Konfiguracja sprawdzianu
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Przedmiot
            </label>
            <select 
              value={subjectId} 
              onChange={e => setSubjectId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-orange-500 dark:focus:border-orange-400 transition-colors duration-300"
            >
              <option value="">-- Wybierz przedmiot --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Sesja / Temat
            </label>
            <select 
              value={sessionId} 
              onChange={e => setSessionId(e.target.value)}
              disabled={!subjectId}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-orange-500 dark:focus:border-orange-400 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Wybierz sesję --</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          
          <div>
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              label="Liczba pytań"
              leftIcon="🔢"
            />
          </div>
          
          <div>
            <Input
              value={seed}
              onChange={e => setSeed(e.target.value)}
              label="Seed (opcjonalnie)"
              helperText="Zostaw puste dla losowego generowania"
              leftIcon="🎲"
              placeholder="np. abc123"
            />
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Button
            onClick={generate}
            disabled={!canGenerate}
            loading={isGenerating}
            size="lg"
            leftIcon="⚡"
            className="transform hover:scale-105"
          >
            {isGenerating ? 'Generuję...' : 'Generuj sprawdzian'}
          </Button>
          
          {!canGenerate && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Wybierz przedmiot i sesję, aby móc wygenerować sprawdzian
            </p>
          )}
        </div>
      </Card>

      {/* Generated Content */}
      {content && (
        <div className="space-y-6">
          {/* Action Buttons */}
          <Card variant="glass">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-xl">📋</span>
              Akcje
            </h3>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => downloadText(`exam_${sessionId || 'draft'}.md`, content)}
                variant="outline"
                leftIcon="📥"
              >
                Pobierz .md
              </Button>
              {keyContent && (
                <Button
                  onClick={() => downloadText(`exam_${sessionId || 'draft'}_key.md`, keyContent)}
                  variant="outline"
                  leftIcon="🔑"
                >
                  Pobierz klucz .md
                </Button>
              )}
              {keyContent && (
                <Button
                  onClick={() => navigator.clipboard.writeText(keyContent)}
                  variant="outline"
                  leftIcon="📋"
                >
                  Kopiuj klucz
                </Button>
              )}
              <Button
                onClick={() => window.print()}
                variant="secondary"
                leftIcon="🖨️"
              >
                Drukuj / PDF
              </Button>
            </div>
          </Card>

          {/* Exam Content */}
          <Card variant="elevated" className="max-w-none">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-xl">📄</span>
              Sprawdzian
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <pre 
                id="exam-content" 
                className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
              >
                {content}
              </pre>
            </div>
          </Card>

          {/* Answer Key */}
          {keyContent && (
            <Card variant="elevated" className="max-w-none">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                <span className="text-xl">🔑</span>
                Klucz odpowiedzi
              </h3>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <pre 
                  id="exam-key" 
                  className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
                >
                  {keyContent}
                </pre>
              </div>
            </Card>
          )}
        </div>
      )}
    </section>
  )
}
