import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAdminKey, getSupabase, setAdminKey, resetSupabase } from './lib/supabaseClient'
import { LayoutDashboard, Users, UserCog, Settings, LogOut, ShieldAlert, Briefcase, GitPullRequest, ClipboardCheck, Bell, MessageSquare } from 'lucide-react'

// Components
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Lawyers from './pages/Lawyers'
import Setup from './pages/Setup'
import Cases from './pages/Cases'
import CaseRequests from './pages/CaseRequests'
import Assessments from './pages/Assessments'
import Notifications from './pages/Notifications'

function Layout() {
  const location = useLocation()
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    if (confirm('Are you sure you want to exit Admin Mode? This will clear the stored key.')) {
      localStorage.removeItem('supabase_admin_key')
      resetSupabase()
      window.location.href = '/'
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isMobile ? 'w-[280px] shadow-2xl' : 'w-64'}
        flex flex-col h-full
      `}>
        <div className="p-6 flex items-center justify-between md:justify-start gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
             <ShieldAlert className="w-8 h-8 text-indigo-600" />
             <span className="font-bold text-xl text-slate-800 tracking-tight">Vakaalat Admin</span>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="text-slate-400">
                <ShieldAlert size={20} className="rotate-45" /> {/* Close Icon analog */}
            </button>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive('/')} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/clients" icon={<Users size={20} />} label="Clients" active={isActive('/clients')} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/lawyers" icon={<UserCog size={20} />} label="Lawyers" active={isActive('/lawyers')} onClick={() => isMobile && setSidebarOpen(false)} />
          <div className="pt-2 pb-1 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Management</div>
          <NavItem to="/cases" icon={<Briefcase size={20} />} label="Cases" active={isActive('/cases')} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/requests" icon={<GitPullRequest size={20} />} label="Case Requests" active={isActive('/requests')} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/assessments" icon={<ClipboardCheck size={20} />} label="Assessments" active={isActive('/assessments')} onClick={() => isMobile && setSidebarOpen(false)} />
          <NavItem to="/notifications" icon={<Bell size={20} />} label="Notifications" active={isActive('/notifications')} onClick={() => isMobile && setSidebarOpen(false)} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Exit</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 md:px-8 md:py-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-4">
             {/* Mobile Menu Button */}
             <button 
                onClick={() => setSidebarOpen(!isSidebarOpen)} 
                className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             </button>
             <h2 className="text-xl md:text-2xl font-bold text-slate-800 capitalize truncate w-40 md:w-auto">
                {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).replace('-', ' ')}
             </h2>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="md:hidden">
                 {/* Mobile simplified header actions if needed, e.g. notif icon */}
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-sm border border-indigo-200">A</div>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          <Outlet />
          <div className="h-10"></div> {/* Bottom spacer for mobile scrolling */}
        </div>
      </main>
    </div>
  )
}

function NavItem({ to, icon, label, active, onClick }) {
  return (
    <a 
        href={to} 
        onClick={(e) => {
            // Allow default navigation, but trigger close for mobile
            if (onClick) onClick()
        }}
        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${active ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </a>
  )
}

function ProtectedRoute() {
  const key = getAdminKey()
  if (!key) {
    return <Navigate to="/setup" replace />
  }
  return <Layout />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/lawyers" element={<Lawyers />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/requests" element={<CaseRequests />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Routes>
    </Router>
  )
}
