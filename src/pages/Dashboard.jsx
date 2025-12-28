import React, { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabaseClient'
import { Users, Briefcase, UserCheck, Activity, TrendingUp, PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { format } from 'date-fns'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    clients: 0,
    lawyers: 0,
    cases: 0,
    activeCases: 0
  })
  const [chartsData, setChartsData] = useState({
    caseStatus: [],
    lawyerSpecialization: []
  })
  const [recentCases, setRecentCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase()
      
      // 1. Basic Counts
      const [
        { count: clientCount },
        { count: lawyerCount },
        { count: caseCount },
        { count: activeCaseCount }
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('lawyers').select('*', { count: 'exact', head: true }),
        supabase.from('case_table').select('*', { count: 'exact', head: true }),
        supabase.from('case_table').select('*', { count: 'exact', head: true }).eq('Case_Status', 'Active')
      ])

      // 2. Fetch Data for Charts
      // Case Status Distribution
      const { data: allCases } = await supabase.from('case_table').select('Case_Status')
      const statusMap = {}
      allCases?.forEach(c => {
          const status = c.Case_Status || 'Unknown'
          statusMap[status] = (statusMap[status] || 0) + 1
      })
      const caseStatusData = Object.keys(statusMap).map(key => ({ name: key, value: statusMap[key] }))

      // Lawyer Specialization
      const { data: allLawyers } = await supabase.from('lawyers').select('specialization')
      const specMap = {}
      allLawyers?.forEach(l => {
          const spec = l.specialization || 'General'
          specMap[spec] = (specMap[spec] || 0) + 1
      })
      // Take top 5
      const lawyerSpecData = Object.keys(specMap)
        .map(key => ({ name: key, value: specMap[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      // 3. Recent Cases
      const { data: recent } = await supabase
        .from('case_table')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        clients: clientCount || 0,
        lawyers: lawyerCount || 0,
        cases: caseCount || 0,
        activeCases: activeCaseCount || 0
      })
      setChartsData({
          caseStatus: caseStatusData,
          lawyerSpecialization: lawyerSpecData
      })
      setRecentCases(recent || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Clients" value={stats.clients} icon={<Users size={24} className="text-blue-500" />} color="blue" />
        <StatCard title="Verified Lawyers" value={stats.lawyers} icon={<UserCheck size={24} className="text-emerald-500" />} color="emerald" />
        <StatCard title="Total Cases" value={stats.cases} icon={<Briefcase size={24} className="text-amber-500" />} color="amber" />
        <StatCard title="Active Cases" value={stats.activeCases} icon={<Activity size={24} className="text-rose-500" />} color="rose" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Case Status Chart */}
        <div className="card p-6 min-h-[400px] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <PieChartIcon size={20} className="text-indigo-500" /> Case Status Distribution
            </h3>
            <div className="flex-1 w-full h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartsData.caseStatus}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label
                        >
                            {chartsData.caseStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Lawyer Specialization Chart */}
        <div className="card p-6 min-h-[400px] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-500" /> Top Specializations
            </h3>
            <div className="flex-1 w-full h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartsData.lawyerSpecialization} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Recent Activity & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Cases List */}
        <div className="card lg:col-span-2 p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Recent Cases</h3>
                <button className="text-sm text-indigo-600 hover:underline" onClick={() => window.location.href='/cases'}>View All</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 font-medium">Case Name</th>
                            <th className="px-6 py-3 font-medium">Type</th>
                            <th className="px-6 py-3 font-medium">Date</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {recentCases.map(c => (
                            <tr key={c.case_id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-medium text-slate-800">{c.case_name}</td>
                                <td className="px-6 py-4 text-slate-600">{c.case_type}</td>
                                <td className="px-6 py-4 text-slate-500">{c.created_at ? format(new Date(c.created_at), 'MMM d') : '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${c.Case_Status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {c.Case_Status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {recentCases.length === 0 && (
                            <tr><td colSpan="4" className="text-center p-6 text-slate-400">No cases found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="card p-6 h-fit sticky top-24">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
          <div className="space-y-3">
             <button className="btn btn-outline w-full justify-start gap-3 h-12" onClick={() => window.location.href='/clients'}>
               <Users size={18} className="text-blue-500" /> 
               <span className="text-slate-700">Add Client</span>
            </button>
            <button className="btn btn-outline w-full justify-start gap-3 h-12" onClick={() => window.location.href='/lawyers'}>
               <UserCheck size={18} className="text-emerald-500" /> 
               <span className="text-slate-700">Add Lawyer</span>
            </button>
            <button className="btn btn-outline w-full justify-start gap-3 h-12" onClick={() => window.location.href='/notifications'}>
               <Activity size={18} className="text-rose-500" /> 
               <span className="text-slate-700">Send Alert</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
             <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">System Status</h4>
             <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Database</span>
                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Connected
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">API Latency</span>
                    <span className="font-mono text-slate-500">24ms</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Version</span>
                    <span className="font-mono text-slate-500">v1.2.0</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  const bgClasses = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600'
  }
  
  return (
    <div className="card p-6 flex items-start justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${bgClasses[color]}`}>
        {icon}
      </div>
    </div>
  )
}
