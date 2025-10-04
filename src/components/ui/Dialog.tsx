import { PropsWithChildren, useEffect, useRef } from 'react'

export function Dialog({ open, onClose, children }: PropsWithChildren<{ open: boolean; onClose: () => void }>) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onClose={onClose} style={{ border:'1px solid #333', borderRadius:8, padding:0, background:'var(--bg, #0b0b0b)' }}>
      <div style={{ padding:12 }}>{children}</div>
    </dialog>
  )
}
