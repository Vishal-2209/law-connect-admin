import React, { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import { Search, Eye, Trash2, ClipboardCheck } from 'lucide-react'
import { format } from 'date-fns'
import DetailModal from '../components/DetailModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Assessments() {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    fetchAssessments()
  }, [])

  const fetchAssessments = async () => {
    setLoading(true)
    const supabase = getSupabase()
    
    // Attempt to be smart.
    const { data: simpleData, error: simpleError } = await supabase
        .from('user_assessments')
        .select('*')
        .order('created_at', { ascending: false })

    if (simpleError) {
        console.error(simpleError)
    } else {
        // Fetch all client names to map them manually
        const userIds = [...new Set(simpleData.map(a => a.user_id))]
        if (userIds.length > 0) {
            const { data: clients } = await supabase.from('clients').select('id, full_name').in('id', userIds)
            const { data: lawyers } = await supabase.from('lawyers').select('id, full_name').in('id', userIds)
            
            const nameMap = {}
            clients?.forEach(c => nameMap[c.id] = c.full_name)
            lawyers?.forEach(l => nameMap[l.id] = l.full_name)
            
            const enriched = simpleData.map(a => ({
                ...a,
                user_name: nameMap[a.user_id] || 'Unknown User'
            }))
            setAssessments(enriched)
        } else {
            setAssessments(simpleData)
        }
    }
    
    setLoading(false)
  }

  const handleDeleteClick = (a) => {
    setDeleteTarget(a)
  }

  const confirmDelete = async (id) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('user_assessments').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else setAssessments(prev => prev.filter(a => a.id !== id))
  }

  const filtered = assessments.filter(a => 
    a.category_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-800">User Assessments</h1>
         <div className="relative w-64">
           <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Search assessments..." 
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
                <th>Category</th>
                <th>Result</th>
                <th>User</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {loading ? (
                 <tr><td colSpan="5" className="text-center p-8 text-slate-500">Loading assessments...</td></tr>
              ) : filtered.length === 0 ? (
                 <tr><td colSpan="5" className="text-center p-8 text-slate-500">No records found.</td></tr>
              ) : (
                filtered.map(a => (
                   <tr key={a.id} className="group hover:bg-slate-50 transition-colors">
                     <td data-label="Category">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-green-50 text-green-600 rounded-lg shrink-0">
                           <ClipboardCheck size={18} />
                         </div>
                         <span className="font-semibold text-slate-800 text-sm truncate max-w-[200px]">{a.category_title}</span>
                       </div>
                     </td>
                     <td data-label="Result">
                       <span className="badge badge-gray text-[10px] font-bold tracking-tight">{a.likely_category || 'Pending'}</span>
                     </td>
                     <td data-label="User">
                        <div className="text-sm font-semibold text-slate-800">{a.user_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono italic">{a.user_id?.slice(0,8)}</div>
                     </td>
                     <td data-label="Date">
                        <span className="text-sm text-slate-500 font-medium">
                          {a.created_at ? format(new Date(a.created_at), 'MMM d, yyyy') : '-'}
                        </span>
                     </td>
                     <td data-label="Actions" className="text-right">
                       <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => setSelectedAssessment(a)}
                          className="btn btn-ghost hover:text-indigo-600 p-2"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(a)} 
                          className="btn btn-ghost hover:text-red-600 p-2"
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
        isOpen={!!selectedAssessment} 
        onClose={() => setSelectedAssessment(null)} 
        title="Assessment Result" 
        data={selectedAssessment} 
      />
      
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Assessment"
        message={`Are you sure you want to delete this assessment record?`}
        isDangerous={true}
        onConfirm={() => confirmDelete(deleteTarget?.id)}
      />
    </div>
  )
}
