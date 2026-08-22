const KEY = 'wtk_tutorial_v1'

export interface TutorialMeta {
  asked: boolean
  completed: boolean
}

const DEFAULTS: TutorialMeta = { asked: false, completed: false }

export function loadTutorialMeta(): TutorialMeta {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<TutorialMeta>
    return {
      asked: !!parsed.asked,
      completed: !!parsed.completed,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveTutorialMeta(partial: Partial<TutorialMeta>): TutorialMeta {
  const next = { ...loadTutorialMeta(), ...partial }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function markTutorialAsked(): void {
  saveTutorialMeta({ asked: true })
}

export function markTutorialCompleted(): void {
  saveTutorialMeta({ asked: true, completed: true })
}
