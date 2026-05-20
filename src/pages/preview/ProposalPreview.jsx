import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { renderProposalHtml } from '../../lib/renderProposalHtml'

export default function ProposalPreview() {
  const { id } = useParams()
  const [html, setHtml] = useState(null)
  const [error, setError] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('engagements')
        .select('proposal_json')
        .eq('id', id)
        .single()
      if (err) return setError(err.message)
      if (!data?.proposal_json) return setError('No proposal found for this engagement.')
      setHtml(renderProposalHtml(data.proposal_json))
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
      title="Business Proposal Preview"
      style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
    />
  )
}
