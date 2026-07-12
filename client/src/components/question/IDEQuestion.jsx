import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Play } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import SpeakButton from '../shared/SpeakButton'
import LoadingSpinner from '../shared/LoadingSpinner'
import { normalizeLanguage } from '../../utils/i18n'

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute'

const TEXT = {
  english: {
    expectedOutput: 'Expected Output',
    got: 'Got',
    runCode: 'Run Code',
    running: 'Running...',
    aiReviewing: 'AI reviewing your code...',
    aiReview: 'AI Review',
    outputMismatch: 'Output does not match. Review your logic.',
    runFailed: 'Failed to run code. Check your internet connection.',
  },
  hindi: {
    expectedOutput: 'Expected Output',
    got: 'Mila',
    runCode: 'Code Run Karo',
    running: 'Run ho raha hai...',
    aiReviewing: 'AI review kar raha hai...',
    aiReview: 'AI Review',
    outputMismatch: 'Output match nahi hua. Code dobara check karo.',
    runFailed: 'Code run nahi ho paya. Internet connection check karo.',
  },
  tamil: {
    expectedOutput: 'Expected Output',
    got: 'கிடைத்தது',
    runCode: 'Code ஓட்டு',
    running: 'ஓடுகிறது...',
    aiReviewing: 'AI உங்கள் code-ஐ review செய்கிறது...',
    aiReview: 'AI Review',
    outputMismatch: 'Output match ஆகவில்லை. Logic-ஐ மீண்டும் பாருங்கள்.',
    runFailed: 'Code run ஆகவில்லை. Internet connection-ஐ சரிபார்க்கவும்.',
  },
  malayalam: {
    expectedOutput: 'Expected Output',
    got: 'ലഭിച്ചത്',
    runCode: 'Code Run ചെയ്യൂ',
    running: 'Run ചെയ്യുന്നു...',
    aiReviewing: 'AI code review ചെയ്യുന്നു...',
    aiReview: 'AI Review',
    outputMismatch: 'Output match ആയില്ല. Logic വീണ്ടും പരിശോധിക്കൂ.',
    runFailed: 'Code run ചെയ്യാനായില്ല. Internet connection പരിശോധിക്കൂ.',
  },
}

async function runPython(code) {
  const res = await fetch(PISTON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'python',
      version: '3.10.0',
      files: [{ name: 'solution.py', content: code }],
    }),
  })
  const data = await res.json()
  if (data.run?.stderr) return { output: data.run.stderr, isError: true }
  return { output: (data.run?.stdout || '').trim(), isError: false }
}

export default function IDEQuestion({ problem, expectedOutput, answered, onAnswer, language, hobby, topicId }) {
  const { colors, isDark } = useTheme()
  const { user } = useAuth()

  const [code,      setCode]      = useState('# Write your Python code here\n')
  const [output,    setOutput]    = useState('')
  const [running,   setRunning]   = useState(false)
  const [feedback,  setFeedback]  = useState(null) // {type:'correct'|'wrong'|'error', message}
  const [aiReview,  setAiReview]  = useState('')
  const [loadingAi, setLoadingAi] = useState(false)

  const effectiveLang  = normalizeLanguage(language || user?.language || 'english')
  const effectiveHobby = hobby    || user?.hobby    || 'cricket'
  const labels = TEXT[effectiveLang] || TEXT.english

  const runCode = async () => {
    if (running || answered) return
    setRunning(true)
    setFeedback(null)
    setAiReview('')
    setOutput('')

    try {
      const { output: result, isError } = await runPython(code)
      setOutput(result)

      if (isError) {
        // A syntax/runtime error isn't a genuine answer attempt — let the
        // student fix their code and run again instead of burning their
        // one shot on a typo.
        setFeedback({ type: 'error', message: result })
        return
      }

      const isCorrect = result.trim() === (expectedOutput || '').trim()

      if (isCorrect) {
        setFeedback({ type: 'correct', message: '✅ Correct output!' })
        onAnswer(result.trim())
      } else {
        setFeedback({ type: 'wrong', message: `❌ Expected: ${expectedOutput}\n${labels.got}: ${result}` })
        onAnswer(result.trim())
        // Get AI code review
        setLoadingAi(true)
        try {
          const res = await api.post('/groq/ide-check', {
            topicId: topicId || 'code',
            code,
            expectedOutput,
            userOutput: result,
            language: effectiveLang,
          })
          setAiReview(res.data.feedback || res.data.summary || '')
        } catch {
          setAiReview(labels.outputMismatch)
        } finally {
          setLoadingAi(false)
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: labels.runFailed })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Expected Output box */}
      <div style={{
        background: colors.bg, border: `1px solid ${colors.border}`,
        borderRadius: 10, padding: '10px 14px', marginBottom: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <span style={{ color: colors.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            {labels.expectedOutput}
          </span>
          <pre style={{ color: '#10B981', margin: '4px 0 0', fontFamily: 'monospace', fontSize: 14 }}>
            {expectedOutput}
          </pre>
        </div>
        {problem && <SpeakButton text={problem} language={effectiveLang} />}
      </div>

      {/* Monaco Editor */}
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{
          background: colors.surface, padding: '7px 14px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ display: 'flex', gap: 5 }}>
            {['#ef4444', '#fbbf24', '#22c55e'].map(c => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
            ))}
          </span>
          <span style={{ color: colors.textMuted, fontSize: 12 }}>solution.py</span>
          <span style={{ marginLeft: 'auto', color: colors.textMuted, fontSize: 11 }}>🐍 Python</span>
        </div>
        <Editor
          height="220px"
          language="python"
          value={code}
          onChange={v => setCode(v || '')}
          theme={isDark ? 'vs-dark' : 'light'}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            lineNumbers: 'on',
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </div>

      {/* Output */}
      {output && (
        <div style={{
          background: colors.bg, border: `1px solid ${colors.border}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
        }}>
          <span style={{ color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            Output
          </span>
          <pre style={{ color: colors.text, margin: '4px 0 0', fontFamily: 'monospace', fontSize: 13 }}>
            {output || '(empty)'}
          </pre>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div style={{
          background: feedback.type === 'correct' ? '#052e16' : '#2d0a0a',
          border: `1px solid ${feedback.type === 'correct' ? '#10B981' : '#ef4444'}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          whiteSpace: 'pre-wrap',
        }}>
          <span style={{ color: feedback.type === 'correct' ? '#10B981' : '#ef4444', fontSize: 13 }}>
            {feedback.message}
          </span>
        </div>
      )}

      {/* AI Review */}
      {loadingAi && <LoadingSpinner text={labels.aiReviewing} />}
      {aiReview && (
        <div style={{
          background: `${colors.accent}10`, border: `1px solid ${colors.accent}30`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
        }}>
          <span style={{ color: colors.accent, fontSize: 12, fontWeight: 600 }}>🤖 {labels.aiReview}</span>
          <p style={{ color: colors.text, fontSize: 13, margin: '6px 0 0', lineHeight: 1.6 }}>{aiReview}</p>
        </div>
      )}

      {/* Run Button */}
      {!answered && (
        <button onClick={runCode} disabled={running || !code.trim() || code.trim() === '# Write your Python code here'} style={{
          background: '#10B981', color: '#fff', border: 'none',
          borderRadius: 10, padding: '10px 24px', cursor: running ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          opacity: running ? 0.7 : 1, fontFamily: 'Poppins, sans-serif',
        }}>
          <Play size={15} />
          {running ? labels.running : labels.runCode}
        </button>
      )}
    </div>
  )
}
