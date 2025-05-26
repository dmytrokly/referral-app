"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Code = {
  id: string
  service_id: string
  code_text: string
  description: string
  country: string | null
  validity_date: string | null
  created_at?: string
  copy_count?: number
  feedback_count_worked?: number
  feedback_count_failed?: number
}

type Service = {
  id: string
  name: string
  normalized_name: string
  country: string | null
  code_count?: number
}

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [suggestedService, setSuggestedService] = useState<Service | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [allCodes, setAllCodes] = useState<Code[]>([])
  const [codeIndex, setCodeIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [copied, setCopied] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [showFailureReasons, setShowFailureReasons] = useState(false)

  const currentCode = allCodes[codeIndex]

  useEffect(() => {
    fetchAllServices()
  }, [])

  const fetchAllServices = async () => {
    const { data, error } = await supabase
      .from('services_with_code_counts')
      .select('id, name, normalized_name, country, code_count')

    if (error) {
      console.error('Error fetching services:', error.message)
      return
    }

    setServices(data || [])
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNotFound(false)
    setConfirmed(false)
    setSuggestedService(null)
    setAllCodes([])

    const normalized = query.toLowerCase().replace(/[^a-z0-9]/gi, '')

    const exactMatch = services.find((s) => s.normalized_name === normalized)
    if (exactMatch && (exactMatch.code_count ?? 0) > 0) {
      setSuggestedService(exactMatch)
      setLoading(false)
      return
    }

    const { data: fuzzyMatches } = await supabase.rpc('fuzzy_service_match', {
      search_input: normalized,
    })

    if (fuzzyMatches && fuzzyMatches.length > 0) {
      for (const match of fuzzyMatches as Service[]) {
        const { count } = await supabase
          .from('codes')
          .select('*', { count: 'exact', head: true })
          .eq('service_id', match.id)

        if ((count ?? 0) > 0) {
          setSuggestedService(match)
          setLoading(false)
          return
        }
      }
    }

    setNotFound(true)
    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!suggestedService) return
    setLoading(true)

    const { data: codes } = await supabase
      .from('codes')
      .select(`
        id, service_id, code_text, description, country,
        validity_date, created_at, copy_count,
        feedback_count_worked, feedback_count_failed
      `)
      .eq('service_id', suggestedService.id)
      .eq('status', 'active')

    if (!codes || codes.length === 0) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const shuffled = shuffleArray(codes)
    setAllCodes(shuffled)
    setCodeIndex(0)
    setConfirmed(true)
    setLoading(false)
    setFeedbackGiven(false)
  }

  const handleRetry = () => {
    if (allCodes.length > 1) {
      const newIndex = (codeIndex + 1) % allCodes.length
      setCodeIndex(newIndex)
      setShowFailureReasons(false)
      setFeedbackGiven(false)
      setCopied(false)
    }
  }

  const handleReject = () => {
    setSuggestedService(null)
    setConfirmed(false)
  }

  const handleCopyCode = async () => {
    if (!currentCode) return
    try {
      await navigator.clipboard.writeText(currentCode.code_text)
      setCopied(true)

      const { error } = await supabase
        .from('codes')
        .update({
          copy_count: (currentCode.copy_count ?? 0) + 1,
          last_copied_at: new Date().toISOString(),
        })
        .eq('id', currentCode.id)

      if (error) console.error('❌ Supabase update error:', error.message)
      else console.log('✅ Copy count updated in database')

      setAllCodes((prev) =>
        prev.map((c, i) =>
          i === codeIndex ? { ...c, copy_count: (c.copy_count ?? 0) + 1 } : c
        )
      )
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const handleFeedback = async (worked: boolean, reason?: string) => {
    if (!currentCode) return

    await supabase.from('feedback').insert({
      code_id: currentCode.id,
      worked,
      failure_reason: worked ? null : reason ?? null,
    })

    setFeedbackGiven(true)
    setShowFailureReasons(false)
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Find a Referral Code</h1>
        <Link href="/submit" className="text-blue-600 hover:underline text-sm">
          Submit a code →
        </Link>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <input
          required
          placeholder="Enter service name (e.g. N26)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border rounded p-2"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Search
        </button>
      </form>

      {loading && <p className="mt-4">Searching...</p>}
      {notFound && <p className="mt-4 text-red-600">No codes found for that service.</p>}

      {!confirmed && suggestedService && (
        <div className="mt-6 p-4 border rounded bg-yellow-50">
          <p className="mb-2">Did you mean <strong>{suggestedService.name}</strong>?</p>
          <div className="space-x-4">
            <button onClick={handleConfirm} className="bg-blue-600 text-white px-4 py-2 rounded">
              Yes
            </button>
            <button onClick={handleReject} className="border border-gray-400 px-4 py-2 rounded">
              No
            </button>
          </div>
        </div>
      )}

      {confirmed && currentCode && (
        <div className="mt-6 border p-4 rounded bg-gray-50 space-y-2">
          <p className="text-lg font-semibold">🎁 Code Found!</p>
          <p><strong>Service:</strong> {suggestedService?.name}</p>
          <div className="flex items-center gap-2">
            <p><strong>Code:</strong> {currentCode.code_text}</p>
            <button onClick={handleCopyCode} className="text-sm px-3 py-1 border rounded text-blue-600 border-blue-600 hover:bg-blue-50">
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <p><strong>Description:</strong> {currentCode.description}</p>
          {currentCode.country && <p><strong>Country:</strong> {currentCode.country}</p>}
          {currentCode.validity_date && (
            <p><strong>Valid Until:</strong> {new Date(currentCode.validity_date).toLocaleDateString()}</p>
          )}

          <div className="text-sm text-gray-700 mt-4 space-y-1">
            <p>📋 Copied {currentCode.copy_count ?? 0} times</p>
            <p>✔️ {currentCode.feedback_count_worked ?? 0} said it worked</p>
            <p>❌ {currentCode.feedback_count_failed ?? 0} reported issues</p>
            <p>📅 Added {formatDaysAgo(currentCode.created_at)}</p>
          </div>

          <div className="relative inline-block mt-4 group">
            <button
              onClick={handleRetry}
              disabled={allCodes.length <= 1}
              className={`px-4 py-2 rounded text-sm border w-full sm:w-auto
                ${allCodes.length <= 1
                  ? 'text-gray-400 border-gray-300 cursor-not-allowed bg-gray-100'
                  : 'text-blue-600 border-blue-600 hover:bg-blue-50'}`}
            >
              Try another code →
            </button>
            {allCodes.length <= 1 && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 text-xs text-white bg-gray-800 rounded shadow">
                Only one code available
              </div>
            )}
          </div>

          {copied && !feedbackGiven && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Did this code work?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFeedback(true)}
                  className="px-3 py-1 rounded bg-green-600 text-white text-sm"
                >✔️ Yes</button>
                <button
                  onClick={() => setShowFailureReasons(true)}
                  className="px-3 py-1 rounded bg-red-600 text-white text-sm"
                >❌ No</button>
              </div>

              {showFailureReasons && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm">Why didn’t it work?</p>
                  {['Expired', 'Already Used', 'Invalid', 'Other'].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => handleFeedback(false, reason)}
                      className="block text-left w-full px-3 py-1 border rounded hover:bg-red-50 text-sm"
                    >{reason}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {services.some((s) => (s.code_count ?? 0) > 0) && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Explore Top Services</h2>
          <ul className="list-disc list-inside space-y-2">
            {services
              .filter((s) => (s.code_count ?? 0) > 0)
              .sort((a, b) => (b.code_count ?? 0) - (a.code_count ?? 0))
              .slice(0, 10)
              .map((service) => (
                <li key={service.id} className="ml-4">
                  <span className="font-medium">{service.name}</span>{' '}
                  <span className="text-blue-600">
                    ({service.code_count ?? 0} codes)
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function formatDaysAgo(dateString: string | undefined) {
  if (!dateString) return 'Unknown'
  const created = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Less than a day ago'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}
