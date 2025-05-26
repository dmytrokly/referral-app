'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  normalized_name: string
}

export default function SubmitPage() {
  const [service, setService] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState('')
  const [validity, setValidity] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  const [allServices, setAllServices] = useState<Service[]>([])
  const [suggestedService, setSuggestedService] = useState<Service | null>(null)

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, normalized_name')

      if (!error && data) setAllServices(data)
    }
    fetchServices()
  }, [])

  useEffect(() => {
    if (service.length < 3) return
    const normalized = service.toLowerCase().replace(/[^a-z0-9]/gi, '')
    const match = allServices.find((s) => s.normalized_name === normalized)
    if (match) {
      setSuggestedService(null)
      return
    }
    const guess = allServices.find((s) =>
      normalized.includes(s.normalized_name.slice(0, 4))
    )
    setSuggestedService(guess || null)
  }, [service, allServices])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    const normalized = service.toLowerCase().replace(/[^a-z0-9]/gi, '')

    let { data: existing } = await supabase
      .from('services')
      .select('id')
      .eq('normalized_name', normalized)
      .single()

    if (!existing) {
      const { data: newService, error } = await supabase
        .from('services')
        .insert({ name: service })
        .select()
        .single()

      if (error || !newService) {
        console.error('❌ Failed to insert into services:', error)
        alert('Failed to create service.')
        return setStatus('idle')
      }

      existing = newService
    }

    const { error: codeError } = await supabase.from('codes').insert({
      service_id: existing!.id,
      code_text: code,
      description,
      country: country || null,
      validity_date: validity || null,
    })

    if (codeError) {
      console.error('❌ Failed to insert code:', codeError)
      alert('Failed to add code.')
      return setStatus('idle')
    }

    setStatus('done')
    setService('')
    setCode('')
    setDescription('')
    setCountry('')
    setValidity('')
    alert('Code added!')
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← Back to home
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-4">Submit a Referral Code</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          placeholder="Service name"
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="w-full border rounded p-2"
        />

        {suggestedService && (
          <div className="bg-yellow-50 border p-3 rounded text-sm">
            Did you mean <strong>{suggestedService.name}</strong>?
            <div className="space-x-4 mt-2">
              <button
                type="button"
                className="text-blue-600 underline"
                onClick={() => setService(suggestedService.name)}
              >
                Yes
              </button>
              <button
                type="button"
                className="text-gray-600 underline"
                onClick={() => setSuggestedService(null)}
              >
                No
              </button>
            </div>
          </div>
        )}

        <input
          required
          placeholder="Code or referral link"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full border rounded p-2"
        />
        <input
          placeholder="Description (e.g., 'Get $10 off')"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded p-2"
        />
        <input
          placeholder="Country (optional)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full border rounded p-2"
        />
        <input
          type="date"
          placeholder="Valid until (optional)"
          value={validity}
          onChange={(e) => setValidity(e.target.value)}
          className="w-full border rounded p-2"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {status === 'loading' ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  )
}
