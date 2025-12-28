import React, { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import { Search, Ban, Trash2, Award, Edit, Plus } from 'lucide-react'
import { format } from 'date-fns'
import EditModal from '../components/EditModal'
import ConfirmDialog from '../components/ConfirmDialog'
import CreateUserModal from '../components/CreateUserModal'

export default function Lawyers() {
  const [lawyers, setLawyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedLawyer, setSelectedLawyer] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useEffect(() => {
    fetchLawyers()
  }, [])

  const fetchLawyers = async () => {
    setLoading(true)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('lawyers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error fetching lawyers:', error)
    else setLawyers(data || [])
    
    setLoading(false)
  }

  const handleDeleteClick = (lawyer) => {
    setDeleteTarget({ id: lawyer.id, name: lawyer.full_name })
  }

  const confirmDelete = async (id) => {
    const supabase = getSupabase()

    try {
      // 1. Delete from lawyers table
      const { error: dbError } = await supabase.from('lawyers').delete().eq('id', id)
      if (dbError) throw dbError

      // 2. Delete from Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(id)
      if (authError) console.warn('Auth deletion warning:', authError)

      setLawyers(prev => prev.filter(l => l.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete lawyer: ' + err.message)
    }
  }

  const handleBan = async (id, email) => {
    const duration = prompt('Enter ban duration in hours (e.g. 24 for 1 day, 876000 for 100 years):', '876000')
    if (!duration) return

    setActionLoading(id)
    const supabase = getSupabase()

    try {
      const { error } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: `${duration}h`
      })
      
      if (error) throw error
      alert(`Lawyer ${email} has been banned for ${duration} hours.`)
    } catch (err) {
      console.error(err)
      alert('Failed to ban lawyer: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredLawyers = lawyers.filter(lawyer => 
    lawyer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lawyer.email && lawyer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (lawyer.bar_council_number && lawyer.bar_council_number.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">Lawyer Management</h1>
            <button 
                onClick={() => setIsCreateOpen(true)}
                className="btn btn-sm btn-primary gap-2"
            >
                <Plus size={16} /> Add Lawyer
            </button>
        </div>
        <div className="relative w-64">
           <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Search lawyers..." 
             className="input pl-10"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr>
                <th>Professional</th>
                <th>Credentials</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan="6" className="text-center p-8">Loading lawyers...</td></tr>
              ) : filteredLawyers.length === 0 ? (
                 <tr><td colSpan="6" className="text-center p-8">No lawyers found.</td></tr>
              ) : (
                filteredLawyers.map(lawyer => (
                  <tr key={lawyer.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                           {lawyer.profile_photo_url ? (
                            <img src={lawyer.profile_photo_url} alt="" className="w-full h-full object-cover"/>
                          ) : (
                            lawyer.full_name?.[0] || 'L'
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{lawyer.full_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{lawyer.occupation || 'Lawyer'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Award size={14} className="text-amber-500" />
                        <span className="text-sm font-medium">{lawyer.bar_council_number || 'N/A'}</span>
                      </div>
                      <p className="text-xs text-slate-500">{lawyer.specialization || 'General'}</p>
                    </td>
                    <td>
                      <p className="text-sm">{lawyer.email}</p>
                      <p className="text-xs text-slate-500">{lawyer.phone}</p>
                    </td>
                    <td>
                      <p className="text-sm">{lawyer.current_city}, {lawyer.current_state}</p>
                    </td>
                    <td>
                      {lawyer.created_at ? format(new Date(lawyer.created_at), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedLawyer(lawyer); setIsEditOpen(true); }}
                          disabled={actionLoading === lawyer.id}
                          className="btn btn-ghost hover:text-indigo-600 p-2"
                          title="Edit Lawyer"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleBan(lawyer.id, lawyer.email)}
                          disabled={actionLoading === lawyer.id}
                          className="btn btn-ghost hover:text-amber-600 p-2"
                          title="Ban Lawyer"
                        >
                          <Ban size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(lawyer)} 
                          disabled={actionLoading === lawyer.id}
                          className="btn btn-ghost hover:text-red-600 p-2"
                          title="Delete Lawyer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <EditModal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        title="Lawyer" 
        data={selectedLawyer} 
        table="lawyers"
        onSaveSuccess={(updated) => {
          setLawyers(lawyers.map(l => l.id === updated.id ? {...l, ...updated} : l))
          alert('Lawyer updated successfully')
        }}
      />
      
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Lawyer"
        message={`Are you sure you want to PERMANENTLY delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isDangerous={true}
        onConfirm={() => confirmDelete(deleteTarget?.id)}
      />

       <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultRole="lawyer"
        onUserCreated={() => {
            fetchLawyers()
        }}
      />
    </div>
  )
}
