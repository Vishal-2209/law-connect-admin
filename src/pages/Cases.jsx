import React, { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import { Search, Eye, Trash2, FileText, Edit } from 'lucide-react'
import { format } from 'date-fns'
import DetailModal from '../components/DetailModal'
import EditModal from '../components/EditModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Cases() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCase, setSelectedCase] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    fetchCases()
  }, [])

  const fetchCases = async () => {
    setLoading(true)
    const supabase = getSupabase()
    
    // 1. Fetch cases
    const { data: casesData, error: casesError } = await supabase
      .from('case_table')
      .select('*')
      .order('created_at', { ascending: false })

    if (casesError) {
      console.error('Error fetching cases:', casesError)
      setLoading(false)
      return
    }

    // 2. Fetch associated client details manually
    // Extract unique client IDs
    const clientIds = [...new Set(casesData.map(c => c.client_id).filter(Boolean))]
    
    let clientMap = {}
    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, full_name, email, phone')
        .in('id', clientIds)
      
      if (clientsData) {
        clientsData.forEach(client => {
          clientMap[client.id] = client
        })
      }
    }

    // 3. Attach client data to cases
    const enrichedCases = casesData.map(c => ({
      ...c,
      clients: clientMap[c.client_id] || null
    }))

    setCases(enrichedCases)
    setLoading(false)
  }

  const handleDeleteClick = (c) => {
    setDeleteTarget(c)
  }

  const confirmDelete = async (id) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('case_table').delete().eq('case_id', id)
    
    if (error) alert('Error deleting case: ' + error.message)
    else setCases(prev => prev.filter(c => c.case_id !== id))
  }

  const filteredCases = cases.filter(c => 
    c.case_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-800">Case Management</h1>
        <div className="relative w-64">
           <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Search cases..." 
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
                <th>Case Details</th>
                <th>Client</th>
                <th>Status</th>
                <th>Filing Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan="5" className="text-center p-8 text-slate-500">Loading cases...</td></tr>
              ) : filteredCases.length === 0 ? (
                 <tr><td colSpan="5" className="text-center p-8 text-slate-500">No cases found.</td></tr>
              ) : (
                filteredCases.map(c => (
                  <tr key={c.case_id} className="hover:bg-slate-50/50 transition-colors group">
                    <td data-label="Case Details">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="truncate max-w-[200px]">
                          <p className="font-medium text-slate-900 cursor-pointer hover:text-indigo-600 truncate" onClick={() => setSelectedCase(c)}>
                            {c.case_name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono tracking-tight">{c.case_number}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{c.court_type}</p>
                        </div>
                      </div>
                    </td>
                    <td data-label="Client">
                      {c.clients ? (
                        <div className="text-sm">
                          <p className="font-medium text-slate-900">{c.clients.full_name}</p>
                          <p className="text-xs text-slate-500">{c.clients.phone}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unknown Client</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${c.Case_Status === 'Active' ? 'badge-green' : 'badge-gray'}`}>
                        {c.Case_Status}
                      </span>
                    </td>
                    <td data-label="Filing Date">
                      <span className="text-sm text-slate-500 font-medium">
                        {c.filing_date ? format(new Date(c.filing_date), 'MMM d, yyyy') : '-'}
                      </span>
                    </td>
                    <td data-label="Actions" className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => { setSelectedCase(c); setIsEditOpen(true); }}
                          className="btn btn-ghost hover:text-indigo-600 p-2"
                          title="Edit Case"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => setSelectedCase(c)}
                          className="btn btn-ghost hover:text-indigo-600 p-2"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(c)} 
                          className="btn btn-ghost hover:text-red-600 p-2"
                          title="Delete Case"
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
        isOpen={!!selectedCase && !isEditOpen} 
        onClose={() => setSelectedCase(null)} 
        title="Case" 
        data={selectedCase} 
      />
      
      <EditModal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        title="Case" 
        data={selectedCase} 
        table="case_table"
        onSaveSuccess={(updated) => {
           setCases(cases.map(c => c.case_id === updated.case_id ? {...c, ...updated} : c))
           alert('Case updated successfully')
        }}
      />
      
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Case"
        message={`Are you sure you want to delete case "${deleteTarget?.case_name}"? This action cannot be undone.`}
        isDangerous={true}
        onConfirm={() => confirmDelete(deleteTarget?.case_id)}
      />
    </div>
  )
}
