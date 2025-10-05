import { useState } from 'react'
import { Card } from './ui/Card'
import { log } from '@/lib/logs'

// Lazy load AI
type AiModule = typeof import('@/lib/ai')
let aiModPromise: Promise<AiModule> | null = null
function ai(): Promise<AiModule> {
  if (!aiModPromise) aiModPromise = import('@/lib/ai')
  return aiModPromise
}

interface MindmapNode {
  title: string
  level: number
  children: MindmapNode[]
}

interface Props {
  markdown: string
  lectureId: string
}

export function MindmapViewer({ markdown, lectureId }: Props) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<string>('')
  const [loading, setLoading] = useState(false)
  
  // Parse markdown do hierarchii
  const nodes = parseMarkdownToNodes(markdown)
  
  async function handleNodeClick(title: string) {
    setSelectedNode(title)
    setLoading(true)
    
    try {
      const aiModule = await ai()
      const prompt = `Wyjaśnij szczegółowo ten temat z wykładu:

TEMAT: ${title}

Kontekst (pełna mapa myśli):
${markdown}

Podaj:
1. Szczegółową definicję/wyjaśnienie
2. Związek z innymi tematami
3. Praktyczne przykłady
4. Kluczowe punkty do zapamiętania

Odpowiedź:`

      const response = await aiModule.generateWithAI(prompt, 'notes')
      setExplanation(response.trim())
    } catch (err: any) {
      log(`[MindmapViewer] Błąd: ${err.message}`)
      setExplanation('Błąd podczas generowania wyjaśnienia')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mapa */}
      <Card className="p-6 overflow-auto max-h-[600px]">
        <h3 className="text-xl font-semibold mb-4">Mapa myśli</h3>
        <div className="space-y-2">
          {nodes.map((node, idx) => (
            <MindmapNodeView 
              key={idx} 
              node={node} 
              onSelect={handleNodeClick}
              selected={selectedNode}
            />
          ))}
        </div>
      </Card>
      
      {/* Panel wyjaśnień */}
      {selectedNode && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Wyjaśnienie</h3>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Generowanie wyjaśnienia...</p>
            </div>
          ) : (
            <div className="prose dark:prose-invert">
              <h4>{selectedNode}</h4>
              <div dangerouslySetInnerHTML={{ __html: explanation.replace(/\n\n/g, '</p><p>').replace(/^(.+)$/gm, '<p>$1</p>') }} />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

interface NodeViewProps {
  node: MindmapNode
  onSelect: (title: string) => void
  selected: string | null
}

function MindmapNodeView({ node, onSelect, selected }: NodeViewProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isSelected = selected === node.title
  
  const indent = node.level * 20
  
  return (
    <div style={{ marginLeft: `${indent}px` }}>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded)
          onSelect(node.title)
        }}
        className={`
          flex items-center gap-2 p-2 rounded-lg w-full text-left transition-colors
          ${isSelected 
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }
        `}
      >
        {hasChildren && (
          <span className="text-gray-500">
            {expanded ? '▼' : '▶'}
          </span>
        )}
        <span className={`font-${node.level === 0 ? 'bold' : 'medium'}`}>
          {node.title}
        </span>
      </button>
      
      {expanded && hasChildren && (
        <div className="mt-1">
          {node.children.map((child, idx) => (
            <MindmapNodeView 
              key={idx} 
              node={child} 
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function parseMarkdownToNodes(markdown: string): MindmapNode[] {
  const lines = markdown.split('\n').filter(l => l.trim())
  const root: MindmapNode[] = []
  const stack: MindmapNode[] = []
  
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (!match) continue
    
    const level = match[1].length - 1 // H1 = level 0
    const title = match[2].trim()
    
    const node: MindmapNode = {
      title,
      level,
      children: []
    }
    
    // Znajdź rodzica
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }
    
    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    
    stack.push(node)
  }
  
  return root
}
