import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { renderDocumentAHtml } from '../../lib/renderDocumentAHtml'

function buildDocAJson(engagement) {
  const date = new Date().toISOString().slice(0, 10)
  const options = engagement.solutions?.solutions ?? []
  return {
    engagement_title: engagement.client_name,
    client_name: engagement.client_name,
    generated_date: date,
    options,
  }
}

export default function SolutionsPreview() {
  const { id } = useParams()
  const [html, setHtml] = useState(null)
  const [error, setError] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('engagements')
        .select('client_name, solutions')
        .eq('id', id)
        .single()
      if (err) return setError(err.message)
      if (!data?.solutions) return setError('No solutions found for this engagement.')
      setHtml(renderDocumentAHtml(buildDocAJson(data)))
    }
    load()
  }, [id])

  useEffect(() => {
    if (!html || !iframeRef.current) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    iframeRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [html])

  if (error) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px', color: '#D61C5E' }}>
        {error}
      </div>
    )
  }

  if (!html) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px', color: '#6B7280' }}>
        Loading preview…
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      title="Solution Options Preview"
      style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
    />
  )
}
