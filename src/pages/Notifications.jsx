import React, { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import { Bell, Send, CheckCircle, Search, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('list') // 'list' or 'send'
  const [notifications, setNotifications] = useState([])
  const [users, setUsers] = useState([]) // For selecting recipients
  const [loading, setLoading] = useState(true)
  
  // Send Form State
  const [selectedUsers, setSelectedUsers] = useState([])
  const [messageTitle, setMessageTitle] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    if (activeTab === 'list') {
      fetchNotifications()
    } else {
      fetchUsers()
    }
  }, [activeTab])

  const fetchNotifications = async () => {
    setLoading(true)
    const supabase = getSupabase()
    // Assume we have a notifications table. If not, this will error, but code logic is sound.
    // We join with auth.users or clients/lawyers to get names? 
    // Since we don't have direct FK setup properly visible, we might just fetch notification content first
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
        console.error('Error fetching notifications:', error)
         // Fallback mock data if table doesn't exist yet for demo
         // setNotifications([]) 
    } else {
        setNotifications(data || [])
    }
    setLoading(false)
  }

  const fetchUsers = async () => {
    const supabase = getSupabase()
    const { data: clients } = await supabase.from('clients').select('id, full_name, email, role:id')
    const { data: lawyers } = await supabase.from('lawyers').select('id, full_name, email, role:id')
    
    // Combine and format
    const allUsers = [
        ...(clients || []).map(c => ({ ...c, type: 'Client' })), 
        ...(lawyers || []).map(l => ({ ...l, type: 'Lawyer' }))
    ]
    setUsers(allUsers)
  }

  const handleSend = async () => {
    if (selectedUsers.length === 0) return alert('Please select at least one user.')
    if (!messageTitle || !messageBody) return alert('Please provide title and message.')

    setIsSending(true)
    const supabase = getSupabase()
    
    try {
        const notificationsPayload = selectedUsers.map(userId => ({
            user_id: userId,
            title: messageTitle,
            message: messageBody,
            created_at: new Date().toISOString(),
            is_read: false
        }))

        const { error } = await supabase.from('notifications').insert(notificationsPayload)
        
        if (error) throw error

        alert('Notifications sent successfully!')
        setMessageTitle('')
        setMessageBody('')
        setSelectedUsers([])
        setActiveTab('list')
    } catch (err) {
        console.error(err)
        alert('Failed to send: ' + err.message)
    } finally {
        setIsSending(false)
    }
  }

  const toggleUserSelection = (id) => {
    if (selectedUsers.includes(id)) {
        setSelectedUsers(selectedUsers.filter(uid => uid !== id))
    } else {
        setSelectedUsers([...selectedUsers, id])
    }
  }

  const handleDeleteClick = (n) => {
    setDeleteTarget(n)
  }

  const confirmDelete = async (id) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Bell className="text-indigo-600" /> Notifications
        </h1>
        <div className="flex gap-2">
            <button 
                onClick={() => setActiveTab('list')}
                className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            >
                History
            </button>
             <button 
                onClick={() => setActiveTab('send')}
                className={`btn gap-2 ${activeTab === 'send' ? 'btn-primary' : 'btn-ghost'}`}
            >
                <Send size={16} /> Send New
            </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="card">
            {loading ? (
                <div className="p-8 text-center text-slate-500">Loading history...</div>
            ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800">No Notifications Sent</h3>
                    <p className="text-slate-500 mt-1">Start by sending a notification to your users.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {notifications.map(n => (
                        <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors group relative">
                             <button 
                                onClick={() => handleDeleteClick(n)}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Notification"
                             >
                                <Trash2 size={16} />
                             </button>
                            <div className="flex justify-between items-start mb-1 pr-8">
                                <h4 className="font-semibold text-slate-800">{n.title}</h4>
                                <span className="text-xs text-slate-400">{format(new Date(n.created_at), 'MMM d, HH:mm')}</span>
                            </div>
                            <p className="text-slate-600 text-sm mb-2">{n.message}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className={`px-2 py-0.5 rounded-full ${n.is_read ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {n.is_read ? 'Read' : 'Unread'}
                                </span>
                                <span>ID: {n.user_id?.slice(0,8)}...</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Selection Sidebar */}
            <div className="card lg:col-span-1 h-[600px] flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-3">Select Recipients ({selectedUsers.length})</h3>
                    <div className="relative">
                        <input 
                            className="input pl-9" 
                            placeholder="Search users..." 
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    <div className="p-2 flex gap-2">
                        <button className="text-xs text-indigo-600 font-medium hover:underline" onClick={() => setSelectedUsers(filteredUsers.map(u => u.id))}>Select All</button>
                        <button className="text-xs text-slate-500 font-medium hover:underline" onClick={() => setSelectedUsers([])}>Clear</button>
                    </div>
                    {filteredUsers.map(user => (
                        <div 
                            key={user.id} 
                            onClick={() => toggleUserSelection(user.id)}
                            className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 transition-all ${selectedUsers.includes(user.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}`}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedUsers.includes(user.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                {selectedUsers.includes(user.id) && <CheckCircle size={12} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-800 truncate">{user.full_name}</div>
                                <div className="text-xs text-slate-500 truncate">{user.type} • {user.email}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Message Form */}
            <div className="card lg:col-span-2 p-6 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-6">Compose Notification</h3>
                
                <div className="space-y-4 flex-1">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input 
                            className="input font-bold" 
                            placeholder="e.g. Important Case Update"
                            value={messageTitle}
                            onChange={(e) => setMessageTitle(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Message Body</label>
                        <textarea 
                            className="input h-64 resize-none p-4 leading-relaxed" 
                            placeholder="Type your notification message here..."
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                        ></textarea>
                        <p className="text-right text-xs text-slate-400 mt-1">{messageBody.length} characters</p>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleSend} 
                        disabled={isSending || selectedUsers.length === 0}
                        className="btn btn-primary px-8 py-3"
                    >
                        {isSending ? 'Sending...' : `Send to ${selectedUsers.length} Users`}
                    </button>
                </div>
            </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Notification"
        message="Are you sure you want to delete this notification history?"
        isDangerous={true}
        onConfirm={() => confirmDelete(deleteTarget?.id)}
      />
    </div>
  )
}
