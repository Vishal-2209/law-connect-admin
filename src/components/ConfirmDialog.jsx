import React, { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ isOpen, onClose, title, message, onConfirm, isDangerous = false }) {
  if (!isOpen) return null

  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${isDangerous ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
          <button 
            onClick={onClose} 
            className="btn btn-ghost text-slate-600 font-medium" 
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            className={`btn ${isDangerous ? 'btn-danger' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} font-medium min-w-[80px]`}
            disabled={loading}
          >
            {loading ? 'Processing...' : (isDangerous ? 'Delete' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
