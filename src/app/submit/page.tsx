'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SubmitPage() {
  const [service, setService] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState('')
  const [validity, setValidity] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    const normalized = service.toLowerCase().replace(/[^a-z0-9]/gi, '')

    // 1. Find or create the service
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

    // 2. Insert the code
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
      <h1 className="text-2xl font-bold mb-4">Submit a Referral Code</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          placeholder="Service name"
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="w-full border rounded p-2"
        />
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
