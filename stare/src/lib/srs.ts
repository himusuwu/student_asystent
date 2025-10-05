import { addDays } from 'date-fns'
import type { Flashcard } from './types'

export type Grade = 0 | 1 | 2 | 3 | 4 | 5

export function gradeFromBool(known: boolean): Grade {
  return known ? 4 : 1
}

export function review(card: Flashcard, grade: Grade, now = new Date()): Flashcard {
  let { easiness, interval, repetition } = card
  // SM-2 easiness update
  easiness = Math.max(1.3, easiness + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)))

  if (grade < 3) {
    repetition = 0
    interval = 1
  } else {
    repetition += 1
    if (repetition === 1) interval = 1
    else if (repetition === 2) interval = 6
    else interval = Math.round(interval * easiness)
  }

  const dueDate = addDays(now, interval).toISOString()
  const history = [...(card.history ?? []), { date: now.toISOString(), quality: grade }]

  return { ...card, easiness, interval, repetition, dueDate, history }
}

export function newCard(init: Omit<Flashcard, 'easiness' | 'interval' | 'repetition' | 'dueDate'>): Flashcard {
  return {
    ...init,
    easiness: 2.5,
    interval: 0,
    repetition: 0,
    dueDate: new Date().toISOString(),
  }
}
