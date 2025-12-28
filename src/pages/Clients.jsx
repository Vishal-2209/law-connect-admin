import React, { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import { Search, Ban, Trash2, MoreHorizontal, UserX, UserMinus, Edit, Plus } from 'lucide-react'
import { format } from 'date-fns'
import EditModal from '../components/EditModal'
import ConfirmDialog from '../components/ConfirmDialog'
import CreateUserModal from '../components/CreateUserModal'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    setLoading(true)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error fetching clients:', error)
    else setClients(data || [])
    
    setLoading(false)
  }

  const handleDeleteClick = (client) => {
    setDeleteTarget({ id: client.id, name: client.full_name })
  }

  const confirmDelete = async (id) => {
    const supabase = getSupabase()

    try {
      // 1. Delete from clients table (in case cascade is not set)
      const { error: dbError } = await supabase.from('clients').delete().eq('id', id)
      if (dbError) throw dbError

      // 2. Delete from Auth (requires service role)
      const { error: authError } = await supabase.auth.admin.deleteUser(id)
      if (authError) {
         console.warn('Auth deletion warning:', authError)
      }

      setClients(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete user: ' + err.message)
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
      alert(`User ${email} has been banned for ${duration} hours.`)
    } catch (err) {
      console.error(err)
      alert('Failed to ban user: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredClients = clients.filter(client => 
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800">Client Management</h1>
            <button 
                onClick={() => setIsCreateOpen(true)}
                className="btn btn-sm btn-primary gap-2"
            >
                <Plus size={16} /> Add Client
            </button>
        </div>
        <div className="relative w-64">
           <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Search clients..." 
             className="input pl-10"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan="7" className="text-center p-8">Loading clients...</td></tr>
              ) : filteredClients.length === 0 ? (
                 <tr><td colSpan="7" className="text-center p-8">No clients found.</td></tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id}>
                    <td data-label="Profile">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden shrink-0">
                          {client.profile_photo_url ? (
                            <img src={client.profile_photo_url} alt="" className="w-full h-full object-cover"/>
                          ) : (
                            client.full_name?.[0] || 'U'
                          )}
                        </div>
                        <div className="md:hidden lg:block truncate max-w-[120px]">
                          <p className="font-medium text-slate-900 truncate">{client.full_name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-500">ID: {client.id.slice(0,8)}</p>
                        </div>
                      </div>
                    </td>
                    <td data-label="Contact">
                      <div className="text-sm">
                        <p className="text-slate-900">{client.email}</p>
                        <p className="text-slate-500 text-xs">{client.phone}</p>
                      </div>
                    </td>
                    <td data-label="Location">
                      <p className="text-sm text-slate-600">{client.current_city}, {client.current_state}</p>
                    </td>
                    <td data-label="Status">
                      <span className="badge badge-green">Active</span>
                    </td>
                    <td data-label="Joined">
                      <span className="text-sm text-slate-500">
                        {client.created_at ? format(new Date(client.created_at), 'MMM d, yyyy') : '-'}
                      </span>
                    </td>
                    <td data-label="Actions" className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => { setSelectedClient(client); setIsEditOpen(true); }}
                          className="btn btn-ghost hover:text-indigo-600 p-2"
                          title="Edit Client"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleBan(client.id, client.email)}
                          disabled={actionLoading === client.id}
                          className="btn btn-ghost hover:text-amber-600 p-2"
                          title="Ban User"
                        >
                          <Ban size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(client)} 
                          disabled={actionLoading === client.id}
                          className="btn btn-ghost hover:text-red-600 p-2"
                          title="Delete User"
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
        title="Client" 
        data={selectedClient} 
        table="clients"
        onSaveSuccess={(updated) => {
          setClients(clients.map(c => c.id === updated.id ? {...c, ...updated} : c))
          alert('Client updated successfully')
        }}
      />
      
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Client"
        message={`Are you sure you want to PERMANENTLY delete "${deleteTarget?.name}"? This action cannot be undone and will remove all associated data.`}
        isDangerous={true}
        onConfirm={() => confirmDelete(deleteTarget?.id)}
      />

      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultRole="client"
        onUserCreated={() => {
            fetchClients()
        }}
      />
    </div>
  )
}
