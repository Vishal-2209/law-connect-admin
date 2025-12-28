import React, { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import { Search, Eye, Trash2, GitPullRequest, ArrowRight, Edit } from 'lucide-react'
import { format } from 'date-fns'
import DetailModal from '../components/DetailModal'
import EditModal from '../components/EditModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function CaseRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    const supabase = getSupabase()
    
    // Join with Clients, Lawyers, and Case Table
    // client_id -> clients(id)
    // lawyer_id -> lawyers(id)
    // case_id -> case_table(case_id)
    const { data, error } = await supabase
      .from('case_requests')
      .select(`
        *,
        clients (id, full_name, email, phone),
        lawyers (id, full_name, email, bar_council_number),
        case_table (case_id, case_name, case_number)
      `)
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching requests:', error)
    else setRequests(data || [])
    
    setLoading(false)
  }

  const handleDeleteClick = (r) => {
    setDeleteTarget(r)
  }

  const confirmDelete = async (id) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('case_requests').delete().eq('id', id)
    
    if (error) alert('Error deleting request: ' + error.message)
    else setRequests(prev => prev.filter(r => r.id !== id))
  }

  const filteredRequests = requests.filter(r => 
    r.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.clients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.lawyers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.case_table?.case_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status) => {
    if (!status) return 'badge-gray'
    switch(status.toLowerCase()) {
      case 'accepted': return 'badge-green'
      case 'rejected': return 'badge-red'
      case 'pending': return 'badge-blue'
      default: return 'badge-gray'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-800">Case Requests</h1>
        <div className="relative w-64">
           <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Search requests..." 
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
                <th>Request ID</th>
                <th>Client</th>
                <th></th>
                <th>Lawyer</th>
                <th>Case</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan="7" className="text-center p-8 text-slate-500">Loading requests...</td></tr>
              ) : filteredRequests.length === 0 ? (
                 <tr><td colSpan="7" className="text-center p-8 text-slate-500">No requests found.</td></tr>
              ) : (
                filteredRequests.map(r => (
                  <tr key={r.id} className="group hover:bg-slate-50 transition-colors">
                    <td data-label="Request ID">
                      <div className="font-mono text-xs text-slate-500 font-bold">{r.id.slice(0,8)}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{format(new Date(r.created_at), 'MMM d, HH:mm')}</div>
                    </td>
                    <td data-label="Client">
                      {r.clients ? (
                        <div 
                          className="cursor-pointer hover:text-indigo-600 font-semibold text-slate-800 text-sm"
                          onClick={() => setSelectedRequest(r.clients)}
                          title="View Client Details"
                        >
                          {r.clients.full_name}
                        </div>
                      ) : <span className="text-slate-400 text-xs italic">Unknown</span>}
                    </td>
                    <td className="text-center text-slate-300 md:table-cell hidden">
                      <ArrowRight size={16} />
                    </td>
                    <td data-label="Lawyer">
                      {r.lawyers ? (
                        <div 
                           className="cursor-pointer hover:text-indigo-600 font-semibold text-slate-800 text-sm"
                           onClick={() => setSelectedRequest(r.lawyers)}
                           title="View Lawyer Details"
                        >
                          {r.lawyers.full_name}
                        </div>
                      ) : <span className="text-slate-400 text-xs italic">Unknown</span>}
                    </td>
                    <td data-label="Case">
                      {r.case_table ? (
                         <div 
                           className="cursor-pointer hover:text-indigo-600 text-xs text-slate-600 font-medium truncate max-w-[150px]"
                           onClick={() => setSelectedRequest(r.case_table)}
                           title="View Case Details"
                         >
                           {r.case_table.case_name}
                         </div>
                      ) : <span className="text-slate-400 text-xs italic">Unknown Case</span>}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${getStatusColor(r.status)} capitalize text-[10px] py-0.5 px-2`}>
                        {r.status || 'Pending'}
                      </span>
                    </td>
                    <td data-label="Actions" className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => { setSelectedRequest(r); setIsEditOpen(true); }}
                          className="btn btn-ghost hover:text-indigo-600 p-2"
                          title="Edit Request"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => setSelectedRequest(r)}
                          className="btn btn-ghost hover:text-indigo-600 p-2"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(r)} 
                          className="btn btn-ghost hover:text-red-600 p-2"
                          title="Delete Request"
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

      <DetailModal 
        isOpen={!!selectedRequest && !isEditOpen} 
        onClose={() => setSelectedRequest(null)} 
        title="Details" 
        data={selectedRequest} 
      />
      
      <EditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Request"
        data={selectedRequest}
        table="case_requests"
        onSaveSuccess={(updated) => {
           setRequests(requests.map(r => r.id === updated.id ? {...r, ...updated} : r))
           alert('Request updated successfully')
        }}
      />
      
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Request"
        message={`Are you sure you want to delete this case request? This action cannot be undone.`}
        isDangerous={true}
        onConfirm={() => confirmDelete(deleteTarget?.id)}
      />
    </div>
  )
}
