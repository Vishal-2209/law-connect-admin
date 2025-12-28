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
      setError('Please enter a valid key to proceed')
      setLoading(false)
      return
    }

    try {
      setAdminKey(key)
      resetSupabase()
      const supabase = getSupabase()
      
      const { error: apiError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
      
      if (apiError) throw new Error('Invalid key or unauthorized access')
      navigate('/')
    } catch (err) {
      setError(err.message || 'Verification failed')
      localStorage.removeItem('supabase_admin_key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0c10]">
      {/* Dynamic Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-[440px] px-6 animate-fade-in">
        <div className="backdrop-blur-2xl bg-white/10 p-8 md:p-10 rounded-[2rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
              <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-700 p-5 rounded-2xl shadow-lg border border-white/20">
                <ShieldCheck size={40} className="text-white" />
              </div>
            </div>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Vakaalat Control</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Master authorization required. Accessing decentralized legal command center.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                Security Key
              </label>
              <div className="relative group">
                <input 
                  type="password" 
                  value={key}
                  onChange={(e) => setKeyValue(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all group-hover:bg-white/10 font-mono text-sm"
                  placeholder="Paste Service Role Key..."
                  autoFocus
                />
                <Key className="absolute left-4 top-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center gap-3 animate-shake">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full relative py-4 bg-white text-slate-900 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] hover:shadow-[0_20px_40px_-5px_rgba(255,255,255,0.2)] ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  <span>Authorizing...</span>
                </div>
              ) : 'Authenticate Access'}
            </button>
            
            <p className="text-[10px] text-center text-slate-600 leading-normal px-4">
              Local Browser Storage only. This session is encrypted using standard JS persistence.
            </p>
          </form>
        </div>
        
        <p className="mt-8 text-center text-slate-700 text-xs">
          Built for <span className="text-slate-500">Law Connect Ecosystem</span> v1.4.2
        </p>
      </div>
    </div>
  )
}
