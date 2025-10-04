import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createSubject, listSubjects } from '@/lib/repo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function Subjects() {
  const [items, setItems] = useState<{id:string;name:string;color?:string}[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { 
    setMounted(true)
    const loadSubjects = async () => {
      setIsLoading(true)
      try {
        setItems(await listSubjects())
      } finally {
        setIsLoading(false)
      }
    }
    loadSubjects()
  }, [])

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsLoading(true)
    try {
      await createSubject(name.trim(), color)
      setName('')
      setItems(await listSubjects())
    } finally {
      setIsLoading(false)
    }
  }

  const predefinedColors = [
    '#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'
  ]

  return (
    <section className={`space-y-8 ${mounted ? 'animate-fade-in' : ''}`}>
      <div className="text-center pb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📚 Twoje Przedmioty
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Organizuj swoje przedmioty, dodawaj notatki i śledź postępy w nauce.
        </p>
      </div>

      {/* Add Subject Form */}
      <Card variant="glass" className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <span className="text-2xl">➕</span>
          Dodaj nowy przedmiot
        </h2>
        <form onSubmit={onAdd} className="space-y-4">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nazwa przedmiotu (np. Matematyka, Historia)"
            label="Nazwa przedmiotu"
            leftIcon="📖"
            required
          />
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Wybierz kolor
            </label>
            <div className="flex flex-wrap gap-3 mb-4">
              {predefinedColors.map(preColor => (
                <button
                  key={preColor}
                  type="button"
                  onClick={() => setColor(preColor)}
                  className={`w-10 h-10 rounded-full border-4 transition-all duration-300 transform hover:scale-110 ${
                    color === preColor 
                      ? 'border-gray-800 dark:border-white scale-110' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: preColor }}
                  title={`Kolor ${preColor}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 rounded-full border-4 border-gray-300 dark:border-gray-600 cursor-pointer hover:border-gray-500 transition-colors duration-300"
                title="Wybierz własny kolor"
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            loading={isLoading}
            disabled={!name.trim()}
            className="w-full"
            leftIcon="✨"
          >
            {isLoading ? 'Dodawanie...' : 'Dodaj przedmiot'}
          </Button>
        </form>
      </Card>

      {/* Subjects Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Wszystkie przedmioty ({items.length})
        </h2>
        
        {isLoading && !items.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card className="h-32">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((subject, index) => (
              <Card 
                key={subject.id} 
                hover 
                className={`group relative overflow-hidden transition-all duration-500 ${mounted ? 'animate-slide-up' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Color accent */}
                <div 
                  className="absolute top-0 left-0 w-full h-2 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                  style={{ backgroundColor: subject.color ?? '#888' }}
                />
                
                {/* Color indicator */}
                <div 
                  className="absolute top-4 right-4 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-lg"
                  style={{ backgroundColor: subject.color ?? '#888' }}
                />
                
                <Link 
                  to={`/subjects/${subject.id}`}
                  className="block p-6 h-full"
                >
                  <div className="flex items-start gap-4 h-full">
                    <div className="flex-shrink-0">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: subject.color ?? '#888' }}
                      >
                        {subject.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                        {subject.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Kliknij aby zobaczyć szczegóły
                      </p>
                      
                      {/* Stats placeholder */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="text-gray-400">Notatki</div>
                          <div className="font-semibold text-gray-600 dark:text-gray-300">12</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Fiszki</div>
                          <div className="font-semibold text-gray-600 dark:text-gray-300">24</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 inline-flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:translate-x-1 transition-transform duration-300">
                    Otwórz przedmiot <span className="ml-1">→</span>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
        
        {!isLoading && !items.length && (
          <Card variant="glass" className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Brak przedmiotów
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Dodaj swój pierwszy przedmiot, aby rozpocząć organizowanie nauki.
            </p>
            <Button 
              onClick={() => (document.querySelector('input[placeholder*="Nazwa"]') as HTMLInputElement)?.focus()}
              leftIcon="➕"
            >
              Dodaj pierwszy przedmiot
            </Button>
          </Card>
        )}
      </div>
    </section>
  )
}
