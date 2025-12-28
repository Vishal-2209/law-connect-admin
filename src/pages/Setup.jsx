import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAdminKey, resetSupabase, getSupabase } from '../lib/supabaseClient'
import { ShieldCheck, Key, AlertTriangle } from 'lucide-react'

export default function Setup() {
  const [key, setKeyValue] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!key.trim()) {
      setError('Please enter a valid key')
      setLoading(false)
      return
    }

    // Basic validation: Try to fetch a list of users or something restricted
    try {
      setAdminKey(key)
      resetSupabase()
      const supabase = getSupabase()
      
      // Try a lightweight admin call or just trust it for now.
      // Ideally we check `supabase.auth.admin.listUsers({ page: 1, perPage: 1 })`
      // But let's just assume valid if it starts with 'ey' (JWT) or 'service_role' (sometimes explicit)
      // Actually, let's try to list users.
      const { data, error: apiError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
      
      if (apiError) {
        throw new Error('Invalid Service Role Key or Network Error: ' + apiError.message)
      }

      navigate('/')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to verify key')
      localStorage.removeItem('supabase_admin_key') // Clear invalid key
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-4 rounded-full text-indigo-600">
            <ShieldCheck size={48} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Admin Panel Access</h1>
        <p className="text-center text-slate-500 mb-8">
          This panel requires Master Access permissions. Please enter your Supabase Service Role Key.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Service Role Key
            </label>
            <div className="relative">
              <input 
                type="password" 
                value={key}
                onChange={(e) => setKeyValue(e.target.value)}
                className="input pl-10"
                placeholder="eyJh..."
                autoFocus
              />
              <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              The key is stored locally in your browser and never sent anywhere else.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full btn btn-primary py-3 ${loading ? 'opacity-75 cursor-wait' : ''}`}
          >
            {loading ? 'Verifying...' : 'Access Panel'}
          </button>
        </form>
      </div>
    </div>
  )
}
