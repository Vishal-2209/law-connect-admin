import React, { useState, useEffect } from 'react'
import { X, Save, Lock, AlertTriangle, Upload } from 'lucide-react'
import { getSupabase } from '../lib/supabaseClient'

export default function EditModal({ isOpen, onClose, title, data, table, onSaveSuccess }) {
  if (!isOpen || !data) return null

  const [formData, setFormData] = useState({})
  const [password, setPassword] = useState('') // New state for password change
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [file, setFile] = useState(null) // For photo upload

  useEffect(() => {
    setFormData(data)
    setPassword('') // Reset password field
    setFile(null) // Reset file
  }, [data])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0])
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    const supabase = getSupabase()

    try {
      let recordId = data.id 
      if (!recordId && data.case_id) recordId = data.case_id
      
      let matchQuery = {}
      if (data.id) matchQuery = { id: data.id }
      else if (data.case_id) matchQuery = { case_id: data.case_id }
      else if (table === 'user_assessments') matchQuery = { id: data.id } 
      else throw new Error('Cannot determine ID for update')

      // 1. Prepare Public Table Updates
      const updates = {}
      const readOnlyFields = ['id', 'created_at', 'updated_at', 'profile_photo_url', 'user_id', 'client_id', 'lawyer_id', 'case_id', 'clients', 'lawyers', 'case_table'];
      
      Object.keys(formData).forEach(key => {
        if (typeof formData[key] === 'object' && formData[key] !== null) return;
        if (readOnlyFields.includes(key)) return;
        updates[key] = formData[key]
      })
      
      // 2. Handle Photo Upload
      if (file && recordId) {
          const fileExt = file.name.split('.').pop()
          const filePath = `${recordId}/profile.${fileExt}`
          
          // Upsert true to overwrite
          const { error: uploadError } = await supabase.storage
            .from('Photos')
            .upload(filePath, file, { upsert: true })
            
          if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message)
          
          const { data: { publicUrl } } = supabase.storage
            .from('Photos')
            .getPublicUrl(filePath)
            
          updates.profile_photo_url = publicUrl
          
          // Update local state to reflect new photo immediately in UI if we re-open
          setFormData(prev => ({ ...prev, profile_photo_url: publicUrl }))
      }

      // 3. Perform Public Table Update
      const { error: updateError } = await supabase
        .from(table)
        .update(updates)
        .match(matchQuery)

      if (updateError) throw updateError

      // 4. Handle Auth Updates (Password, Email, Phone) - ONLY if it's a Client or Lawyer (User)
      // We assume if the table is 'clients' or 'lawyers', the 'id' corresponds to auth.uid
      if ((table === 'clients' || table === 'lawyers') && recordId) {
          const authUpdates = {}
          if (password && password.trim().length > 0) {
              if (password.length < 6) throw new Error('Password must be at least 6 characters')
              authUpdates.password = password
          }
          
          // Check if email changed (compared to original data, not just formData)
          if (formData.email !== data.email) authUpdates.email = formData.email
          if (formData.phone !== data.phone) authUpdates.phone = formData.phone
          
          if (Object.keys(authUpdates).length > 0) {
              // Admin Update User
              const { error: authError } = await supabase.auth.admin.updateUserById(recordId, authUpdates)
              if (authError) throw new Error('Auth Update Failed: ' + authError.message)
              
              if (authUpdates.password) alert('Password updated successfully.')
          }
      }

      onSaveSuccess({ ...formData, ...updates })
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper to check if we should show the Password/Photo field
  const isUserTable = table === 'clients' || table === 'lawyers';
  
  // Fields needed to explicitly exclude from text inputs but might handle separately
  const excludedKeys = ['id', 'created_at', 'updated_at', 'profile_photo_url', 'client_id', 'lawyer_id', 'case_id', 'user_id', 'clients', 'lawyers', 'case_table'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">Edit {title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-4">
           {/* Profile Photo Edit */}
           {isUserTable && (
               <div className="flex justify-center mb-6">
                 <div className="relative group cursor-pointer">
                   <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 ${file || formData.profile_photo_url ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50'}`}>
                     {(file || formData.profile_photo_url) ? (
                       <img 
                          src={file ? URL.createObjectURL(file) : formData.profile_photo_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover rounded-full" 
                        />
                     ) : (
                       <Upload className="text-slate-400" size={24} />
                     )}
                   </div>
                    <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                    <div className="text-xs text-center mt-2 text-indigo-600 font-medium">Click to Change Photo</div>
                 </div>
               </div>
           )}

          {Object.keys(formData).map(key => {
            // Skip non-editable or complex fields
            if (typeof formData[key] === 'object' && formData[key] !== null) return null;
            if (excludedKeys.includes(key)) return null;

            return (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <input 
                  type="text" 
                  name={key}
                  value={formData[key] || ''} 
                  onChange={handleChange}
                  className="input"
                />
              </div>
            )
          })}
          
           {/* Password Reset Field for Users */}
           {isUserTable && (
               <div className="border-t border-slate-100 pt-4 mt-4">
                   <div className="flex items-center gap-2 mb-2 text-amber-600">
                       <Lock size={16} />
                       <span className="text-sm font-bold">Reset Password</span>
                   </div>
                   <input 
                      type="text" 
                      placeholder="Enter new password (min 6 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                   />
                   <p className="text-xs text-slate-400 mt-1">Leave blank to keep existing password.</p>
               </div>
           )}

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost" disabled={loading}>Cancel</button>
          <button onClick={handleSave} className="btn btn-primary gap-2" disabled={loading}>
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
