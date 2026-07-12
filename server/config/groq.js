const Groq = require('groq-sdk')

// Each role gets its own key(s) — never swap roles. Each role now supports a
// primary + backup key: if the primary fails (rate limit, invalid key,
// network error), the call automatically retries with the backup instead of
// failing the whole request.
const buildClients = (primaryEnvKey, roleName) => {
  const keys = [process.env[primaryEnvKey], process.env[`${primaryEnvKey}_BACKUP`]].filter(Boolean)
  if (keys.length === 0) console.error(`${primaryEnvKey} (and backup) missing. ${roleName} AI calls will use fallbacks.`)
  return keys.map(apiKey => new Groq({ apiKey }))
}

const groqTheory    = buildClients('GROQ_KEY_1', 'Theory')     // Theory only
const groqQuestion  = buildClients('GROQ_KEY_2', 'Question')   // Questions only
const groqAnswer    = buildClients('GROQ_KEY_3', 'Answer/IDE') // Wrong summary + IDE check only
const groqChallenge = buildClients('GROQ_KEY_4', 'Challenge')  // AI Challenge only

// Tries each client for the role in order (primary, then backup). A failure
// on one key falls through to the next automatically — the app should never
// hang or error out just because one key hit a rate limit or went bad.
const groqCall = async (clients, messages, maxTokens = 512) => {
  const list = Array.isArray(clients) ? clients : [clients]
  for (const client of list) {
    try {
      const response = await client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      })
      const content = response.choices?.[0]?.message?.content?.trim()
      if (!content) throw new Error('EMPTY_RESPONSE')
      return content
    } catch (err) {
      console.error('Groq API Error (falling back to next key if available):', err.message)
    }
  }
  throw new Error('GROQ_FAILED')
}

module.exports = { groqTheory, groqQuestion, groqAnswer, groqChallenge, groqCall }
