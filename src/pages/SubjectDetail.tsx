import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { createSession, listSessionsBySubject, listSubjects, updateSessionSubject, getSubject, listLecturesBySubject } from '@/lib/repo'
import type { Lecture } from '@/lib/types'

export default function SubjectDetail() {
  const { subjectId } = useParams()
  const [subjectName, setSubjectName] = useState('')
  const [sessions, setSessions] = useState<{id:string;title:string;createdAt:string}[]>([])
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [title, setTitle] = useState('Wykład')
  const [subjects, setSubjects] = useState<{id:string;name:string}[]>([])
  const [targetSubject, setTargetSubject] = useState('')

  useEffect(() => { 
    if (subjectId) {
      (async () => {
        const subject = await getSubject(subjectId)
        if (subject) setSubjectName(subject.name)
        
        setSessions(await listSessionsBySubject(subjectId))
        setLectures(await listLecturesBySubject(subjectId))
      })()
    }
  }, [subjectId])
  useEffect(() => { (async () => setSubjects(await listSubjects()))() }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!subjectId || !title.trim()) return
    await createSession(subjectId, title.trim())
    setTitle('Wykład')
    setSessions(await listSessionsBySubject(subjectId))
  }

  return (
    <section>
      <h1>{subjectName || 'Przedmiot'}</h1>
      
      {/* Nowe wykłady */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>📚 Wykłady</h2>
          <Link to="/new-lecture" style={{ 
            background: '#10b981', 
            color: 'white', 
            padding: '8px 16px', 
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600'
          }}>
            + Nowy wykład
          </Link>
        </div>
        
        {lectures.length > 0 ? (
          <ul style={{ display: 'grid', gap: 8 }}>
            {lectures.map(lec => (
              <li key={lec.id} style={{ border: '1px solid #333', padding: 12, borderRadius: 6, background: 'rgba(16, 185, 129, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>{lec.title}</strong>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
                      {new Date(lec.createdAt).toLocaleString('pl-PL')}
                    </div>
                  </div>
                  <Link to={`/lecture/${lec.id}`} style={{ 
                    background: '#3b82f6', 
                    color: 'white', 
                    padding: '6px 12px', 
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.9rem'
                  }}>
                    Otwórz →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ 
            border: '2px dashed #555', 
            padding: '24px', 
            borderRadius: '8px', 
            textAlign: 'center',
            opacity: 0.7
          }}>
            Brak wykładów. Kliknij "Nowy wykład" aby dodać pierwszy.
          </div>
        )}
      </div>
      
      {/* Stare sesje (legacy) */}
      <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid #444' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', opacity: 0.7 }}>📝 Stare sesje (legacy)</h2>
        <form onSubmit={onCreate} style={{ display:'flex', gap:8, alignItems:'center', margin:'8px 0 16px' }}>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Tytuł sesji (np. Wykład 03)" />
          <button type="submit">Utwórz sesję</button>
          <Link to="/new">Nowa notatka</Link>
        </form>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>
        <ul style={{ display:'grid', gap:8 }}>
          {sessions.map(s => (
            <li key={s.id} draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', s.id) }} style={{ border:'1px solid #333', padding:8, borderRadius:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <strong>{s.title}</strong>
                <Link to={`/notes/${s.id}`}>Otwórz</Link>
              </div>
              <small>{new Date(s.createdAt).toLocaleString()}</small>
            </li>
          ))}
          {!sessions.length && <li>Brak sesji.</li>}
        </ul>
        <aside style={{ border:'1px dashed #555', padding:8, borderRadius:6 }}
          onDragOver={(e)=>e.preventDefault()}
          onDrop={async (e)=>{
            e.preventDefault()
            const id = e.dataTransfer.getData('text/plain')
            if (!id || !targetSubject || targetSubject===subjectId) return
            await updateSessionSubject(id, targetSubject)
            if (subjectId) setSessions(await listSessionsBySubject(subjectId))
            alert('Sesja przeniesiona')
          }}>
          <div style={{ display:'grid', gap:8 }}>
            <div><strong>Przenieś sesję do:</strong></div>
            <select value={targetSubject} onChange={e=>setTargetSubject(e.target.value)}>
              <option value="">-- wybierz przedmiot --</option>
              {subjects.filter(s=>s.id!==subjectId).map(s=> (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p style={{ opacity:.8 }}>Przeciągnij kartę sesji na ten panel, aby przenieść.</p>
          </div>
        </aside>
      </div>
      </div>
    </section>
  )
}
