import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: string; text: string }
const Ctx = createContext<{ toasts: Toast[]; push: (text: string) => void; remove: (id: string) => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])
  const remove = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), [])
  const value = useMemo(() => ({ toasts, push, remove }), [toasts, push, remove])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div style={{ position:'fixed', right:16, bottom:16, display:'grid', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background:'#111827', border:'1px solid #374151', color:'#fff', padding:'8px 12px', borderRadius:8 }}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
