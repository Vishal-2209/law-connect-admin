import React, { useState } from 'react'
import { X, Upload, Check, User, Briefcase, Lock, Mail, Plus, Trash2 } from 'lucide-react'
import { getSupabase } from '../lib/supabaseClient'
import { INDIAN_STATES, CITIES_BY_STATE, LAWYER_SPECIALIZATIONS } from '../lib/constants'

export default function CreateUserModal({ isOpen, onClose, defaultRole = 'client', onUserCreated }) {
  if (!isOpen) return null

  // Steps: 0 = Auth, 1 = Profile Details, 2 = Experience (Lawyer Only)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Auth Data
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    role: defaultRole
  })

  // Profile Data
  // Profile Data
  const [profileData, setProfileData] = useState({
      current_state: '',
      current_city: '',
      primary_specialization: '',
      other_specializations: [],
      experience_years: 0
  })

  
  // Experience Data (for Lawyers)
  const [experiences, setExperiences] = useState([])
  const [file, setFile] = useState(null)

  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value })
  }

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => {
        const newData = { ...prev, [name]: value }
        
        // Reset city if state changes
        if (name === 'current_state') {
            newData.current_city = ''
        }
        
        return newData
    })
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }
  
  const addExperience = () => {
      setExperiences([...experiences, { case_title: '', case_domain: '', case_description: '', case_outcome: '' }])
  }

  const updateExperience = (index, field, value) => {
      const newExp = [...experiences]
      newExp[index][field] = value
      setExperiences(newExp)
  }

  const removeExperience = (index) => {
      setExperiences(experiences.filter((_, i) => i !== index))
  }

  const handleNext = () => {
      setError(null)
      if (step === 0) {
          if(!authData.email || !authData.password) { setError('Email and Password required'); return; }
          if(authData.password.length < 6) { setError('Password must be 6+ chars'); return; }
          setStep(1)
      } else if (step === 1) {
          // Validation
          if (!profileData.full_name) { setError('Full Name is required'); return; }
          if (authData.role === 'lawyer') {
              if (!profileData.bar_council_number) { setError('Bar Council Number is required'); return; }
              // Check experience requirement
              if (parseInt(profileData.experience_years) >= 2) {
                  setStep(2)
                  // Pre-fill 5 slots if empty
                  if (experiences.length === 0) {
                      setExperiences(Array(2).fill({ case_title: '', case_domain: '', case_description: '', case_outcome: '' }))
                  }
                  return
              }
          }
          handleSubmit()
      }
  }

  const handleSubmit = async () => {
     setLoading(true)
     setError(null)
     const supabase = getSupabase()

     try {
       // 1. Create User in Auth
       const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
         email: authData.email,
         password: authData.password,
         email_confirm: true
       })
       
       if (authError) throw authError
       const userId = authUser.user.id

       // 2. Upload Photo (Lawyer Only)
       let profilePhotoUrl = null
       if (authData.role === 'lawyer' && file) {
         const fileExt = file.name.split('.').pop()
         const filePath = `${userId}/profile.${fileExt}`
         const { error: uploadError } = await supabase.storage.from('Photos').upload(filePath, file)
         if (!uploadError) {
             const { data: { publicUrl } } = supabase.storage.from('Photos').getPublicUrl(filePath)
             profilePhotoUrl = publicUrl
         }
       }

       // 3. Insert Profile Data
       const isLawyer = authData.role === 'lawyer'
       const table = isLawyer ? 'lawyers' : 'clients'
       
       // Define allowed fields based on schema
       const clientFields = [
         'full_name', 'age', 'occupation', 'current_address_line1', 
         'current_city', 'current_state', 'phone', 'email'
       ]
       
       const lawyerFields = [
         'full_name', 'age', 'current_address_line1', 'current_city', 
         'current_state', 'phone', 'email', 'bar_council_number', 
         'primary_specialization', 'other_specializations',
         'experience_years', 'profile_photo_url', 'law_school'
       ]

       const allowedFields = isLawyer ? lawyerFields : clientFields
       const profileInsert = {
         id: userId,
         email: authData.email,
         ...(profilePhotoUrl && { profile_photo_url: profilePhotoUrl })
       }

       // Only add fields that are allowed and have values
       allowedFields.forEach(field => {
         if (profileData[field] !== undefined && profileData[field] !== '') {
            // Convert numbers
            if (field === 'age' || field === 'experience_years') {
                profileInsert[field] = parseInt(profileData[field], 10)
            } else {
                profileInsert[field] = profileData[field]
            }
         }
       })

       if (!isLawyer) {
           // Default occupation for client if not provided, though it's optional in schema? 
           // Schema says occupation text, nullable.
       } else {
           // Default occupation for lawyer
           profileInsert['occupation'] = 'Lawyer'
       }

       const { error: dbError } = await supabase.from(table).insert(profileInsert)
       if (dbError) throw dbError

       // 3. Insert Experiences if Lawyer and applicable
       if (isLawyer && experiences.length > 0) {
           const expInserts = experiences.map(exp => ({
               lawyer_id: userId,
               case_title: exp.case_title,
               case_domain: exp.case_domain,
               case_description: exp.case_description,
               case_outcome: exp.case_outcome
           })).filter(e => e.case_title && e.case_title.length > 2)
           
           if (expInserts.length > 0) {
               const { error: expError } = await supabase.from('lawyer_experience_details').insert(expInserts)
               if (expError) console.warn('Case experience insert failed:', expError)
           }
       }

       alert(`${authData.role === 'client' ? 'Client' : 'Lawyer'} created successfully!`)
       onUserCreated()
       onClose()
     } catch (err) {
       console.error(err)
       setError(err.message)
     } finally {
       setLoading(false)
     }
  }

  const renderStep0 = () => (
    <div className="space-y-4">
      <h4 className="font-semibold text-slate-700 mb-2">Login Credentials</h4>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Role</label>
        <div className="flex gap-4">
          <button 
            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${authData.role === 'client' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}
            onClick={() => setAuthData({...authData, role: 'client'})}
          >
            <User size={18} /> Client
          </button>
          <button 
            className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${authData.role === 'lawyer' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'}`}
             onClick={() => setAuthData({...authData, role: 'lawyer'})}
          >
            <Briefcase size={18} /> Lawyer
          </button>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
        <div className="relative">
          <input 
            type="email" 
            name="email"
            value={authData.email}
            onChange={handleAuthChange}
            className="input pl-10"
            placeholder="user@example.com"
          />
          <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
        <div className="relative">
          <input 
            type="password" 
            name="password"
            value={authData.password}
            onChange={handleAuthChange}
            className="input pl-10"
            placeholder="Min 6 characters"
          />
          <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
        </div>
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-4">
      <h4 className="font-semibold text-slate-700 mb-2">Profile Details ({authData.role})</h4>
      
      {authData.role === 'lawyer' && (
       <div className="flex justify-center mb-6">
         <div className="relative group cursor-pointer">
           <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 ${file ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50'}`}>
             {file ? (
               <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover rounded-full" />
             ) : (
               <Upload className="text-slate-400" size={24} />
             )}
           </div>
            <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
            <div className="text-xs text-center mt-2 text-slate-500">{file ? 'Change Photo' : 'Upload Photo'}</div>
         </div>
       </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-1">Full Name *</label>
          <input className="input" name="full_name" value={profileData.full_name || ''} onChange={handleProfileChange} />
        </div>
        
        {authData.role === 'client' ? (
          <>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Age</label><input type="number" className="input" name="age" value={profileData.age || ''} onChange={handleProfileChange} /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Occupation</label><input className="input" name="occupation" value={profileData.occupation || ''} onChange={handleProfileChange} /></div>
          </>
        ) : (
           <>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1">Bar Council Number *</label><input className="input" name="bar_council_number" value={profileData.bar_council_number || ''} onChange={handleProfileChange} /></div>
            
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Age</label><input type="number" className="input" name="age" value={profileData.age || ''} onChange={handleProfileChange} /></div>
            
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Law School</label><input className="input" name="law_school" value={profileData.law_school || ''} onChange={handleProfileChange} /></div>

            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Primary Specialization</label>
                <select className="input" name="primary_specialization" value={profileData.primary_specialization || ''} onChange={handleProfileChange}>
                    <option value="">Select Primary Specialization</option>
                    {LAWYER_SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {parseInt(profileData.experience_years) > 2 && (
            <div>
                 <label className="block text-sm font-medium text-slate-600 mb-1">Other Specializations</label>
                 <div className="flex flex-wrap gap-2 p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                    {LAWYER_SPECIALIZATIONS.filter(s => s !== profileData.primary_specialization).map(s => {
                        const isSelected = profileData.other_specializations?.includes(s)
                        return (
                            <button
                                key={s}
                                onClick={() => {
                                    const current = profileData.other_specializations || []
                                    if (isSelected) {
                                        setProfileData(prev => ({ ...prev, other_specializations: current.filter(item => item !== s) }))
                                    } else {
                                        setProfileData(prev => ({ ...prev, other_specializations: [...current, s] }))
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                                    isSelected 
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                            >
                                {s} {isSelected && '✓'}
                            </button>
                        )
                    })}
                 </div>
            </div>
            )}

            <div><label className="block text-sm font-medium text-slate-600 mb-1">Experience (Years)</label><input type="number" className="input" name="experience_years" value={profileData.experience_years || ''} onChange={handleProfileChange} /></div>
           </>
        )}
        
        {/* Common Location Fields */}
        <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">State</label>
            <select className="input" name="current_state" value={profileData.current_state || ''} onChange={handleProfileChange}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
            </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">City</label>
            <select className="input" name="current_city" value={profileData.current_city || ''} onChange={handleProfileChange} disabled={!profileData.current_state}>
                <option value="">Select City</option>
                {profileData.current_state && CITIES_BY_STATE[profileData.current_state]?.map(city => (
                    <option key={city} value={city}>{city}</option>
                ))}
            </select>
        </div>
        <div><label className="block text-sm font-medium text-slate-600 mb-1">Phone</label><input className="input" name="phone" value={profileData.phone || ''} onChange={handleProfileChange} /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1">Address</label><input className="input" name="current_address_line1" value={profileData.current_address_line1 || ''} onChange={handleProfileChange} /></div>
      </div>
    </div>
  )

  const renderStep2 = () => (
      <div className="space-y-4">
          <h4 className="font-semibold text-slate-700 mb-2">Case Experience Details</h4>
          <p className="text-sm text-slate-500 mb-4">Please add details of your past major cases.</p>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {experiences.map((exp, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
                      <button onClick={() => removeExperience(index)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><X size={16} /></button>
                      <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Case {index + 1}</h5>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input 
                                className="input text-sm" 
                                placeholder="Case Title (e.g. State vs Smith)" 
                                value={exp.case_title} 
                                onChange={(e) => updateExperience(index, 'case_title', e.target.value)}
                            />
                            <select 
                                className="input text-sm"
                                value={exp.case_domain}
                                onChange={(e) => updateExperience(index, 'case_domain', e.target.value)}
                            >
                                <option value="">Select Domain</option>
                                {LAWYER_SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <textarea
                            className="textarea text-sm w-full"
                            placeholder="Case Description..."
                            value={exp.case_description}
                            onChange={(e) => updateExperience(index, 'case_description', e.target.value)}
                            rows="2"
                        ></textarea>
                         <input 
                            className="input text-sm" 
                            placeholder="Case Outcome (e.g. Acquitted)" 
                            value={exp.case_outcome} 
                            onChange={(e) => updateExperience(index, 'case_outcome', e.target.value)}
                            />
                      </div>
                  </div>
              ))}
              <button 
                onClick={addExperience}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-2 font-medium"
              >
                  <Plus size={16} /> Add Another Case
              </button>
          </div>
      </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">Add New User</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6">
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          
          {error && (
             <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between">
            {step > 0 ? (
                <button onClick={() => setStep(step - 1)} className="btn btn-ghost">Back</button>
            ) : <div></div>}
            
            {step === 2 || (step === 1 && (authData.role === 'client' || parseInt(profileData.experience_years || 0) < 2)) ? (
                <button onClick={handleSubmit} className="btn btn-primary gap-2" disabled={loading}>
                    {loading ? 'Creating User...' : 'Create User'}
                </button>
            ) : (
                <button 
                  onClick={handleNext} 
                  className="btn btn-primary"
                >
                    Next Step
                </button>
            )}
        </div>
      </div>
    </div>
  )
}
