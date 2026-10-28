import { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

export const submitDiagnostic = async (payload) => {
  const { data } = await api.post('/progress/diagnostic', payload)
  return data
}

const useGaps = () => {
  const { user } = useAuth()
  const enabled = !!user && !user.isGuest
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError]     = useState(null)

  const refetch = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/progress/gaps')
      setData(res.data)
    } catch (err) {
      console.error('Failed to fetch gaps:', err)
      setError('Could not load your learning gaps.')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { refetch() }, [refetch, user?._id])

  return { data: enabled ? data : null, loading: enabled && loading, error, refetch }
}

export default useGaps
