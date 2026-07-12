// Ground-truth Python execution for AI-generated questions. An LLM's stated
// correctAnswer can be flat-out wrong even when it's syntactically well
// formed (e.g. claiming 'Jai Ho'.upper() == 'jai ho'). When the question has
// runnable code, we execute it for real via Piston instead of trusting the
// model's self-reported answer.
const PISTON_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute'

const runPython = async (code, timeoutMs = 8000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(PISTON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        version: '3.10.0',
        files: [{ name: 'solution.py', content: code }],
      }),
      signal: controller.signal,
    })
    const data = await res.json()
    if (data.run?.stderr) return { output: data.run.stderr, isError: true }
    return { output: (data.run?.stdout || '').trim(), isError: false }
  } catch (err) {
    return { output: err.message, isError: true }
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { runPython }
