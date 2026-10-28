// Keep in sync with server/constants/topics.js
export const TOPIC_PREREQS = {
  variables: [],
  'data-types': ['variables'],
  conditions: ['variables', 'data-types'],
  loops: ['conditions'],
  functions: ['loops'],
  lists: ['functions'],
  strings: ['lists'],
  oop: ['functions', 'lists'],
  'error-handling': ['oop'],
  algorithms: ['error-handling'],
}

export const TOPIC_ORDER = ['variables', 'data-types', 'conditions', 'loops', 'functions', 'lists', 'strings', 'oop', 'error-handling', 'algorithms']

// Node coordinates for a 900x290 viewBox
export const GRAPH_LAYOUT = {
  variables: { x: 80, y: 70 },
  'data-types': { x: 230, y: 70 },
  conditions: { x: 380, y: 70 },
  loops: { x: 530, y: 70 },
  functions: { x: 680, y: 70 },
  algorithms: { x: 230, y: 220 },
  'error-handling': { x: 380, y: 220 },
  oop: { x: 530, y: 220 },
  lists: { x: 680, y: 220 },
  strings: { x: 830, y: 220 },
}

export const GRAPH_EDGES = Object.entries(TOPIC_PREREQS).flatMap(([to, froms]) => froms.map(from => [from, to]))

export const bandColorKey = (score) => {
  if (score === null || score === undefined) return 'muted'
  if (score < 40) return 'error'
  if (score < 60) return 'warning'
  if (score < 80) return 'accent'
  return 'success'
}

// Resolve a band color from the theme palette
export const bandColor = (score, colors) => {
  const key = bandColorKey(score)
  return key === 'muted' ? colors.textMuted : colors[key]
}
