import { useState, useEffect, useRef } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { listChatMessages, addChatMessage, getLectureTab } from '@/lib/repo'
import type { ChatMessage } from '@/lib/types'
import { log } from '@/lib/logs'

// Lazy load AI
type AiModule = typeof import('@/lib/ai')
let aiModPromise: Promise<AiModule> | null = null
function ai(): Promise<AiModule> {
  if (!aiModPromise) aiModPromise = import('@/lib/ai')
  return aiModPromise
}

interface Props {
  lectureId: string
}

export function ChatTab({ lectureId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    loadMessages()
    loadContext()
  }, [lectureId])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  async function loadMessages() {
    try {
      const msgs = await listChatMessages(lectureId)
      setMessages(msgs)
    } catch (err: any) {
      log(`[ChatTab] Błąd ładowania: ${err.message}`)
    }
  }
  
  async function loadContext() {
    try {
      // Pobierz szczegółową notatkę lub oczyszczoną transkrypcję jako kontekst
      const detailed = await getLectureTab(lectureId, 'detailed_note')
      const cleaned = await getLectureTab(lectureId, 'cleaned')
      const transcript = await getLectureTab(lectureId, 'transcript')
      
      if (detailed) {
        setContext(detailed.content)
      } else if (cleaned) {
        setContext(cleaned.content)
      } else if (transcript) {
        setContext(transcript.content)
      }
    } catch (err: any) {
      log(`[ChatTab] Błąd ładowania kontekstu: ${err.message}`)
    }
  }
  
  async function sendMessage() {
    if (!input.trim() || loading) return
    
    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    
    try {
      // Dodaj wiadomość użytkownika
      await addChatMessage(lectureId, 'user', userMessage)
      
      await loadMessages()
      
      // Generuj odpowiedź AI
      const aiModule = await ai()
      
      // Zbuduj historię konwersacji
      const history = messages
        .slice(-5) // Ostatnie 5 wymian
        .map(m => `${m.role === 'user' ? 'Pytanie' : 'Odpowiedź'}: ${m.content}`)
        .join('\n\n')
      
      const prompt = `Jesteś asystentem AI pomagającym zrozumieć wykład.

KONTEKST WYKŁADU:
${context.substring(0, 8000)}${context.length > 8000 ? '\n[...]' : ''}

${history ? `HISTORIA KONWERSACJI:\n${history}\n` : ''}
NOWE PYTANIE STUDENTA:
${userMessage}

Odpowiedz krótko i konkretnie na pytanie studenta. Odwołuj się do treści wykładu. Jeśli informacji nie ma w wykładzie, powiedz o tym wprost.

Odpowiedź:`

      const response = await aiModule.generateWithAI(prompt, 'notes')
      
      // Dodaj odpowiedź AI
      await addChatMessage(lectureId, 'assistant', response.trim())
      
      await loadMessages()
      
    } catch (err: any) {
      log(`[ChatTab] Błąd: ${err.message}`)
      // Dodaj wiadomość błędu
      await addChatMessage(lectureId, 'assistant', `❌ Błąd: ${err.message}`)
      await loadMessages()
    } finally {
      setLoading(false)
    }
  }
  
  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }
  
  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <Card className="flex-1 p-4 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <p className="text-lg mb-2">💬 Czat z wykładem</p>
            <p className="text-sm">Zadaj pytanie o treść wykładu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString('pl-PL', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>
      
      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Zadaj pytanie o wykład..."
          className="flex-1"
          disabled={loading}
        />
        <Button 
          onClick={sendMessage} 
          disabled={!input.trim() || loading}
        >
          {loading ? '...' : 'Wyślij'}
        </Button>
      </div>
    </div>
  )
}
