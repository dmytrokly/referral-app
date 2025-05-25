'use client'

import { useState } from 'react'
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
}

type Service = {
  id: string
  name: string
  normalized_name: string
}

export default function HomePage() {
  const [query, setQuery] = useState('')
  const [suggestedService, setSuggestedService] = useState<Service | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [allCodes, setAllCodes] = useState<Code[]>([])
  const [codeIndex, setCodeIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const currentCode = allCodes[codeIndex]

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNotFound(false)
    setConfirmed(false)
    setSuggestedService(null)
    setAllCodes([])

    const normalized = query.toLowerCase().replace(/[^a-z0-9]/gi, '')

    const { data: services } = await supabase.rpc('fuzzy_service_match', {
      search_input: normalized,
    })

    if (!services || services.length === 0) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setSuggestedService(services[0])
    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!suggestedService) return
    setLoading(true)

    const { data: codes } = await supabase
      .from('codes')
      .select('*')
      .eq('service_id', suggestedService.id)

    if (!codes || codes.length === 0) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setAllCodes(shuffleArray(codes))
    setCodeIndex(0)
    setConfirmed(true)
    setLoading(false)
  }

  const handleRetry = () => {
    if (allCodes.length > 1) {
      setCodeIndex((prev) => (prev + 1) % allCodes.length)
    }
  }

  const handleReject = () => {
    setSuggestedService(null)
    setConfirmed(false)
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
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </form>

      {loading && <p className="mt-4">Searching...</p>}
      {notFound && (
        <p className="mt-4 text-red-600">No codes found for that service.</p>
      )}

      {!confirmed && suggestedService && (
        <div className="mt-6 p-4 border rounded bg-yellow-50">
          <p className="mb-2">
            Did you mean <strong>{suggestedService.name}</strong>?
          </p>
          <div className="space-x-4">
            <button
              onClick={handleConfirm}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Yes
            </button>
            <button
              onClick={handleReject}
              className="border border-gray-400 px-4 py-2 rounded"
            >
              No
            </button>
          </div>
        </div>
      )}

      {confirmed && currentCode && (
        <div className="mt-6 border p-4 rounded bg-gray-50 space-y-2">
          <p className="text-lg font-semibold">🎁 Code Found!</p>
          <p>
            <strong>Code:</strong> {currentCode.code_text}
          </p>
          <p>
            <strong>Description:</strong> {currentCode.description}
          </p>
          {currentCode.country && (
            <p>
              <strong>Country:</strong> {currentCode.country}
            </p>
          )}
          {currentCode.validity_date && (
            <p>
              <strong>Valid Until:</strong>{' '}
              {new Date(currentCode.validity_date).toLocaleDateString()}
            </p>
          )}

          <div className="relative inline-block mt-4 group">
            <button
              onClick={handleRetry}
              disabled={allCodes.length <= 1}
              className={`px-4 py-2 rounded text-sm border w-full sm:w-auto
                ${
                  allCodes.length <= 1
                    ? 'text-gray-400 border-gray-300 cursor-not-allowed bg-gray-100'
                    : 'text-blue-600 border-blue-600 hover:bg-blue-50'
                }`}
            >
              Try another code →
            </button>
            {allCodes.length <= 1 && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1 text-xs text-white bg-gray-800 rounded shadow">
                Only one code available
              </div>
            )}
          </div>
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
