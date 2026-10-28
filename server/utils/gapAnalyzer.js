// Pure gap analysis over Progress docs + prerequisite DAG. No I/O.

const { LABELS, GENERAL_TAG, parseKey } = require('../constants/conceptTags')
const { getMasteryBand } = require('./mastery')

const WEAK_SCORE = 60
const MIN_CONCEPT_ATTEMPTS = 2
const MIN_TOPIC_ATTEMPTS = 3

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

const confidenceFor = (attempts) => attempts >= 8 ? 'high' : attempts >= MIN_TOPIC_ATTEMPTS ? 'medium' : 'low'

const analyzeGaps = ({ progressDocs = [], topics = [] } = {}) => {
  const sorted = [...topics].sort((a, b) => a.order - b.order)
  const byId = new Map(sorted.map(t => [t.topicId, t]))
  const docs = (Array.isArray(progressDocs) ? progressDocs : []).filter(Boolean)

  // a) flatten concept mastery
  const specific = []
  const general = []
  for (const doc of docs) {
    for (const m of Array.isArray(doc.conceptMastery) ? doc.conceptMastery : []) {
      const parsed = parseKey(m && m.key)
      if (!parsed || !byId.has(parsed.topicId)) continue
      const entry = {
        key: m.key,
        topicId: parsed.topicId,
        tag: parsed.slug,
        score: num(m.score),
        attempts: num(m.attempts),
        correct: num(m.correct),
      }
      ;(parsed.slug === GENERAL_TAG ? general : specific).push(entry)
    }
  }

  // level accuracy fallback + completion + raw attempts per topic
  const levelStats = {}
  const completed = new Set()
  let levelAttempts = 0
  for (const doc of docs) {
    if (doc.topicCompleted) completed.add(doc.topicId)
    let att = 0
    let cor = 0
    for (const lv of Object.values(doc.levels || {})) {
      att += num(lv && lv.questionsAttempted)
      cor += num(lv && lv.correctAnswers)
    }
    levelAttempts += att
    levelStats[doc.topicId] = { att, cor }
  }

  // b) topic mastery
  const topicMastery = sorted.map(t => {
    const spec = specific.filter(e => e.topicId === t.topicId)
    const gen = general.filter(e => e.topicId === t.topicId)
    const specAtt = spec.reduce((s, e) => s + e.attempts, 0)
    const genAtt = gen.reduce((s, e) => s + e.attempts, 0)
    const lv = levelStats[t.topicId] || { att: 0, cor: 0 }
    let score = null
    let attempts = 0
    let source = 'none'
    if (specAtt > 0) {
      score = Math.round(spec.reduce((s, e) => s + e.score * e.attempts, 0) / specAtt)
      attempts = specAtt
      source = 'concepts'
    } else if (genAtt > 0) {
      score = Math.round(gen.reduce((s, e) => s + e.score * e.attempts, 0) / genAtt)
      attempts = genAtt
      source = 'general'
    } else if (lv.att > 0) {
      score = Math.round((lv.cor / lv.att) * 100)
      attempts = lv.att
      source = 'level-accuracy'
    }
    return {
      topicId: t.topicId,
      name: t.name,
      score,
      attempts,
      band: score === null ? null : getMasteryBand(score),
      confidence: confidenceFor(attempts),
      source,
    }
  })
  const masteryById = new Map(topicMastery.map(m => [m.topicId, m]))

  // c) weak concepts
  const weakConcepts = specific
    .filter(e => e.score < WEAK_SCORE && e.attempts >= MIN_CONCEPT_ATTEMPTS)
    .sort((a, b) => a.score - b.score)
    .map(e => ({
      key: e.key,
      topicId: e.topicId,
      tag: e.tag,
      label: LABELS[e.key] || e.tag,
      score: e.score,
      band: getMasteryBand(e.score),
      attempts: e.attempts,
      correct: e.correct,
    }))

  // d) weak topics
  const weakTopics = topicMastery.filter(m => m.score !== null && m.score < WEAK_SCORE && m.attempts >= MIN_TOPIC_ATTEMPTS)
  const weakIds = new Set(weakTopics.map(m => m.topicId))

  // e) root-cause tracing
  const ancestors = (id, seen = new Set()) => {
    for (const p of (byId.get(id) && byId.get(id).prerequisites) || []) {
      if (!seen.has(p) && byId.has(p)) {
        seen.add(p)
        ancestors(p, seen)
      }
    }
    return seen
  }
  const shortestPath = (from, to) => {
    const queue = [[from]]
    const seen = new Set([from])
    while (queue.length) {
      const path = queue.shift()
      const last = path[path.length - 1]
      if (last === to) return path
      for (const t of sorted) {
        if ((t.prerequisites || []).includes(last) && !seen.has(t.topicId)) {
          seen.add(t.topicId)
          queue.push([...path, t.topicId])
        }
      }
    }
    return [from, to]
  }
  const roots = new Map()
  for (const wt of weakTopics) {
    const weakAnc = [...ancestors(wt.topicId)].filter(id => weakIds.has(id))
    if (!weakAnc.length) continue
    weakAnc.sort((a, b) => (byId.get(a).order - byId.get(b).order) || (masteryById.get(a).score - masteryById.get(b).score))
    const rootId = weakAnc[0]
    if (!roots.has(rootId)) roots.set(rootId, [])
    roots.get(rootId).push(wt.topicId)
  }
  const rootCauses = [...roots.entries()]
    .map(([rootId, explains]) => {
      explains.sort((a, b) => byId.get(a).order - byId.get(b).order)
      const m = masteryById.get(rootId)
      return {
        topicId: rootId,
        name: m.name,
        score: m.score,
        confidence: m.confidence,
        explains,
        path: shortestPath(rootId, explains[0]),
      }
    })
    .sort((a, b) => (byId.get(a.topicId).order - byId.get(b.topicId).order) || (a.score - b.score))

  // g) coverage
  const specificAttempts = specific.reduce((s, e) => s + e.attempts, 0)
  const generalAttempts = general.reduce((s, e) => s + e.attempts, 0)
  const totalAttempts = specificAttempts + generalAttempts
  const coverage = {
    totalAttempts,
    specificTagAttempts: specificAttempts,
    generalAttempts,
    specificShare: totalAttempts ? specificAttempts / totalAttempts : null,
  }

  // f) recommendation
  const name = (id) => byId.get(id).name
  const weakestTag = (topicId) => {
    const s = specific.filter(e => e.topicId === topicId).sort((a, b) => a.score - b.score)[0]
    return s ? s.tag : null
  }
  let recommendation
  if (rootCauses.length) {
    const root = rootCauses[0]
    const names = root.explains.map(name)
    const reason = `${names.join(' and ')} ${names.length > 1 ? 'are' : 'is'} weak because ${root.name} is weak.`
      + (root.path.length > 2 ? ` Chain: ${root.path.map(name).join(' -> ')}.` : '')
    recommendation = { type: 'prerequisite-repair', topicId: root.topicId, tag: weakestTag(root.topicId), reason }
  } else if (weakConcepts.length) {
    const w = weakConcepts[0]
    recommendation = {
      type: 'practice',
      topicId: w.topicId,
      tag: w.tag,
      reason: `${w.label} in ${name(w.topicId)} is your weakest concept (${w.score}% after ${w.attempts} tries).`,
    }
  } else if (Math.max(totalAttempts, levelAttempts) === 0) {
    recommendation = {
      type: 'diagnose',
      topicId: sorted.length ? sorted[0].topicId : null,
      reason: 'Take a 5-question check to find your starting point.',
    }
  } else {
    const next = sorted.find(t => !completed.has(t.topicId)) || sorted[sorted.length - 1]
    recommendation = {
      type: 'advance',
      topicId: next ? next.topicId : null,
      reason: next && !completed.has(next.topicId)
        ? `No weak spots found. Keep going with ${next.name}.`
        : 'No weak spots found and every topic is complete. Revisit any topic to stay sharp.',
    }
  }

  return {
    topicMastery,
    weakConcepts,
    weakTopics,
    rootCauses,
    recommendation,
    coverage,
    generatedAt: new Date().toISOString(),
  }
}

module.exports = { analyzeGaps, WEAK_SCORE, MIN_CONCEPT_ATTEMPTS, MIN_TOPIC_ATTEMPTS }
