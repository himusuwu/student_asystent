import { db } from './db'
import { slugify } from './utils'

export interface RepoFile { path: string; content: string }

export async function buildExportFiles(): Promise<RepoFile[]> {
  const d = await db()
  const files: RepoFile[] = []

  // Collect subjects
  const subjTx = d.transaction('subjects')
  const subjStore = subjTx.objectStore('subjects')
  let subjCursor = await subjStore.openCursor()
  while (subjCursor) {
    const subject = subjCursor.value as { id: string; name: string; color?: string; createdAt: string }
    const subjSlug = slugify(subject.name)
    // sessions by subject
    const sessIdx = d.transaction('sessions').store.index('bySubject')
    let sessCursor = await sessIdx.openCursor(subject.id)
    while (sessCursor) {
      const s = sessCursor.value as { id: string; subjectId: string; title: string; createdAt: string }
      const date = s.createdAt.slice(0,10)
      const sessSlug = slugify(s.title)
      const base = `subjects/${subjSlug}/${date}_${sessSlug}`
      // notes
      const notesIdx = d.transaction('notes').store.index('bySession')
      let noteCursor = await notesIdx.openCursor(s.id)
      while (noteCursor) {
        const n = noteCursor.value as { id: string; sessionId: string; kind: string; content: string }
        const name = fileNameForKind(n.kind)
        if (name) files.push({ path: `${base}/${name}`, content: withFrontmatter(subject.name, s.title, n.kind, n.content) })
        noteCursor = await noteCursor.continue()
      }
      sessCursor = await sessCursor.continue()
    }
    subjCursor = await subjCursor.continue()
  }

  // flashcards (all) as one JSON dump
  const fcTx = d.transaction('flashcards')
  const fcStore = fcTx.objectStore('flashcards')
  const allFlash: any[] = []
  let fcCursor = await fcStore.openCursor()
  while (fcCursor) {
    allFlash.push(fcCursor.value)
    fcCursor = await fcCursor.continue()
  }
  files.push({ path: `global/flashcards.json`, content: JSON.stringify(allFlash, null, 2) })

  return files
}

function fileNameForKind(kind: string): string | null {
  switch(kind){
    case 'speech': return 'transcript.md'
    case 'slides': return 'slides.md'
    case 'off_slides': return 'off_slides.md'
    case 'short': return 'summary_short.md'
    case 'user': return 'notes_user.md'
    case 'exam_bank': return 'exam_bank.md'
    default: return null
  }
}

function withFrontmatter(subject: string, session: string, kind: string, content: string) {
  const fm = [
    '---',
    `subject: ${escapeYaml(subject)}`,
    `session: ${escapeYaml(session)}`,
    `kind: ${kind}`,
    '---',
    '',
  ].join('\n')
  return fm + content
}

function escapeYaml(s: string) {
  if (/[:\-?\[\]\{\},&*!#|>'"%@`]/.test(s) || /\s/.test(s)) return JSON.stringify(s)
  return s
}
