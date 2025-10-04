import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getNotesBySession, saveUserNote } from '@/lib/repo'
import { downloadText } from '@/lib/utils'
import { Tabs, Tab } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'

export default function NoteView() {
  const { sessionId } = useParams()
  const [notes, setNotes] = useState<Array<{id:string;kind:string;content:string}>>([])

  useEffect(() => { if (sessionId) (async () => setNotes(await getNotesBySession(sessionId)))() }, [sessionId])

  const order = ['speech','slides','off_slides','short','user','exam_bank']
  const sorted = useMemo(()=>[...notes].sort((a,b)=> order.indexOf(a.kind) - order.indexOf(b.kind)), [notes])
  const [active, setActive] = useState<string>('speech')
  const activeNote = sorted.find(n => n.kind === active)
  const [userDraft, setUserDraft] = useState('')
  const { push } = useToast()

  useEffect(() => {
    const u = sorted.find(n => n.kind === 'user')
    setUserDraft(u?.content ?? '')
  }, [sorted])

  return (
    <section>
      <h1>Notatka: {sessionId}</h1>
      <Tabs>
        {order.map(k => (
          <Tab key={k} active={active===k} onClick={()=>setActive(k)}>{label(k)}</Tab>
        ))}
      </Tabs>
      {!activeNote && <p>Brak treści dla: {label(active)}</p>}
      {activeNote && (
        <article style={{ border:'1px solid #333', padding:8, borderRadius:6, margin:'12px 0' }}>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={()=>downloadText(`${active}-${sessionId}.md`, activeNote.content)}>Pobierz .md</button>
          </div>
          {active !== 'user' ? (
            <Markdown content={activeNote.content} />
          ) : (
            <div style={{ display:'grid', gap:8 }}>
              <textarea rows={14} value={userDraft} onChange={e=>setUserDraft(e.target.value)} />
              <button onClick={async()=>{ if (!sessionId) return; await saveUserNote(sessionId, userDraft); push('Zapisano Twoje notatki'); }}>Zapisz moje notatki</button>
            </div>
          )}
        </article>
      )}
      {!sorted.length && <p>Brak notatek dla tej sesji.</p>}
    </section>
  )
}

function label(kind: string) {
  switch(kind){
    case 'speech': return 'Dokładne z mowy'
    case 'slides': return 'Ze slajdów'
    case 'off_slides': return 'Poza slajdami'
    case 'short': return 'Krótka notatka'
    case 'user': return 'Inne notatki'
    case 'exam_bank': return 'Bank pytań'
    default: return kind
  }
}

function Markdown({ content }: { content: string }) {
  // Minimalny renderer MD (bez zależności): pocięte na linie
  // Minimalne wsparcie dla bloków ```json
  const styled = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre data-lang="${lang ?? ''}" style="background:#0b1220;padding:8px;border-radius:6px;overflow:auto">${escapeHtml(code)}</pre>`
  })
  return <div style={{ whiteSpace:'pre-wrap' }} dangerouslySetInnerHTML={{ __html: styled }} />
}

function escapeHtml(s: string){
  return s.replace(/[&<>"]+/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] as string))
}
