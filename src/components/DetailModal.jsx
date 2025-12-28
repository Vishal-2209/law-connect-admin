import React from 'react'
import { X } from 'lucide-react'

export default function DetailModal({ isOpen, onClose, title, data }) {
  if (!isOpen || !data) return null

  // Helper to render values nicely
  const renderValue = (key, value) => {
    if (value === null || value === undefined) return <span className="text-slate-400">N/A</span>
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    // If it's an object (like a joined table), render a nested summary or recurs
    if (typeof value === 'object') {
       return (
         <div className="pl-4 border-l-2 border-slate-100 mt-2">
           {Object.entries(value).map(([k, v]) => (
             <div key={k} className="mb-1 text-sm">
               <span className="font-medium text-slate-600 mr-2 capitalize">{k.replace(/_/g, ' ')}:</span>
               <span className="text-slate-800">{String(v)}</span>
             </div>
           ))}
         </div>
       )
    }
    return String(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">{title} Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6">
            {Object.entries(data).map(([key, value]) => {
              // Skip internal fields if needed, or specific huge objects
              return (
                <div key={key} className="border-b border-slate-50 pb-3 last:border-0">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <div className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                    {renderValue(key, value)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end">
          <button onClick={onClose} className="btn btn-primary">Close</button>
        </div>
      </div>
    </div>
  )
}
