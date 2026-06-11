import { useState } from 'react'
import { COOKIE_NAME } from '../constants'
import type { SavedWork } from '../types'
import { getCookie, setCookie } from '../utils/cookies'
import { serializeSavedWorks } from '../utils/savedWorks'

export function useSavedWorks(setMessage: (message: string) => void) {
  const [savedWorks, setSavedWorks] = useState<SavedWork[]>(() => {
    try {
      const saved = getCookie(COOKIE_NAME)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const persistSavedWorks = (works: SavedWork[], messageText: string) => {
    const serialized = serializeSavedWorks(works)
    if (!serialized) {
      setMessage('Could not update saved works because the cookie would be too large.')
      return false
    }
    setCookie(COOKIE_NAME, serialized)
    setSavedWorks(JSON.parse(serialized))
    setMessage(messageText)
    return true
  }

  const saveWork = (work: SavedWork) => {
    const next = [work, ...savedWorks].slice(0, 8)
    const serialized = serializeSavedWorks(next)
    if (!serialized) {
      setMessage(
        'This design is too large for a browser cookie. Try fewer colors or a smaller grid before saving.',
      )
      return
    }
    setCookie(COOKIE_NAME, serialized)
    setSavedWorks(JSON.parse(serialized))
    setMessage('Saved this finished work to cookies.')
  }

  const renameSavedWork = (id: string, name: string) => {
    const next = savedWorks.map((work) =>
      work.id === id ? { ...work, name: name || 'Untitled template' } : work,
    )
    persistSavedWorks(next, 'Renamed saved work.')
  }

  const deleteSavedWork = (id: string) => {
    const work = savedWorks.find((saved) => saved.id === id)
    const next = savedWorks.filter((saved) => saved.id !== id)
    persistSavedWorks(
      next,
      work ? `Deleted saved work: ${work.name}` : 'Deleted saved work.',
    )
  }

  return {
    deleteSavedWork,
    renameSavedWork,
    savedWorks,
    saveWork,
  }
}
