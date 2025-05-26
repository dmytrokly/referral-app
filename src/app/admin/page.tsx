'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

type Code = {
  id: string
  code_text: string
  description: string
  service_id: string
  status?: string
  created_at?: string
  service: {
    name: string
  }
}

type RawCode = {
  id: string
  code_text: string
  description: string
  service_id: string
  status?: string
  services: {
    name?: string
  } | null
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [codes, setCodes] = useState<Code[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCodes = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('codes')
      .select(`
        id,
        code_text,
        description,
        service_id,
        status,
        services (
          name
        )
      `)

    if (error) {
      console.error('❌ Supabase fetch error:', error.message)
      setLoading(false)
      return
    }

    if (data) {
      const mapped = (data as RawCode[]).map((c) => ({
        ...c,
        status: c.status ?? 'active',
        service: {
          name: c.services?.name ?? 'Unknown',
        },
      }))
      setCodes(mapped)
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this code?')) return

    const { error } = await supabase.from('codes').delete().eq('id', id)

    if (error) {
      console.error('Error deleting code:', error.message)
      alert('Failed to delete code.')
      return
    }

    setCodes((prev) => prev.filter((c) => c.id !== id))
  }

  const handleReactivate = async (id: string) => {
    const { error } = await supabase
      .from('codes')
      .update({ status: 'active' })
      .eq('id', id)

    if (error) {
      console.error('Error reactivating code:', error.message)
      alert('Failed to reactivate code.')
      return
    }

    setCodes((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: 'active' } : c
      )
    )
  }

  useEffect(() => {
    if (authorized) {
      fetchCodes()
    }
  }, [authorized])

  if (!authorized) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-xl font-semibold mb-4">Admin Access</h1>
        <input
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded p-2 mb-4"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => {
            if (password === ADMIN_PASSWORD) {
              setAuthorized(true)
            } else {
              alert('Incorrect password')
            }
          }}
        >
          Login
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      {loading ? (
        <p>Loading codes...</p>
      ) : (
        <ul className="space-y-4">
          {codes.map((code) => (
            <li
              key={code.id}
              className={`border p-4 rounded flex justify-between items-start gap-4 ${
                code.status === 'inactive' ? 'bg-red-50' : ''
              }`}
            >
              <div>
                <p><strong>Service:</strong> {code.service.name}</p>
                <p><strong>Code:</strong> {code.code_text}</p>
                <p className="text-sm text-gray-600">{code.description}</p>
                {code.status === 'inactive' && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Disabled due to feedback
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end space-y-2">
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => handleDelete(code.id)}
                >
                  Delete
                </button>
                {code.status === 'inactive' && (
                  <button
                    className="text-blue-600 hover:underline text-sm"
                    onClick={() => handleReactivate(code.id)}
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
