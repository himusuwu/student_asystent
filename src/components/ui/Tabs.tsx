import { PropsWithChildren } from 'react'

export function Tabs({ 
  children, 
  value, 
  onChange, 
  tabs 
}: PropsWithChildren<{ 
  value?: string
  onChange?: (value: string) => void
  tabs?: Array<{ value: string; label: string }>
}>) {
  if (tabs && value !== undefined && onChange) {
    // Nowy API - z tablicą tabs
    return (
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', margin:'8px 0', borderBottom: '1px solid #333' }}>
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            style={{ 
              padding:'12px 20px', 
              border:'none',
              borderBottom: value === tab.value ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'transparent',
              color: value === tab.value ? '#3b82f6' : '#9ca3af',
              fontWeight: value === tab.value ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    )
  }
  
  // Stary API - z children
  return <div style={{ display:'flex', gap:8, flexWrap:'wrap', margin:'8px 0' }}>{children}</div>
}

export function Tab({ active, onClick, children }: PropsWithChildren<{ active?: boolean; onClick?: () => void }>) {
  return (
    <button onClick={onClick} style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #333', background: active?'#1f2937':'transparent' }}>
      {children}
    </button>
  )
}
