import React, { useEffect, useState, Suspense, lazy } from 'react'
import { 
  MessageSquare, 
  Users, 
  Clock, 
  RefreshCw,
  Activity
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useSocket } from '../contexts/SocketContext'
import useLazyLoad from '../hooks/useLazyLoad'

// Lazy load heavy components
const StatsCard = lazy(() => import('../components/Dashboard/StatsCard'))
const ActivityChart = lazy(() => import('../components/Dashboard/ActivityChart'))
const RecentContacts = lazy(() => import('../components/Dashboard/RecentContacts'))

// Lightweight loading component
const ComponentLoader = () => (
  <div className="card-glass animate-pulse">
    <div className="h-24 bg-gray-700 rounded"></div>
  </div>
)

const Dashboard = () => {
  const { state, loadDashboard } = useApp()
  const { whatsappStatus } = useSocket()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboard()
    
    // Auto refresh every 30 seconds
    const interval = setInterval(loadDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboard()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const overview = state.dashboard.overview

  const statsData = [
    {
      title: 'Total de Mensagens',
      value: overview?.messages?.totalSent || 0,
      change: `+${overview?.messages?.today?.sent || 0} hoje`,
      icon: MessageSquare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Conversas Ativas',
      value: overview?.conversations?.totalConversations || 0,
      change: `${overview?.conversations?.activeToday || 0} hoje`,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Tempo Online',
      value: formatOnlineTime(overview?.messages?.totalOnlineTime || 0),
      change: `${formatOnlineTime(overview?.messages?.today?.onlineTime || 0)} hoje`,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    {
      title: 'Contatos',
      value: overview?.contacts?.totalContacts || 0,
      change: `+${overview?.contacts?.activeToday || 0} ativos`,
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            Visão geral do seu bot WhatsApp com GPT-5 Mini
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing || state.dashboard.loading}
          className="btn-glass flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Status Banner */}
      {whatsappStatus !== 'connected' && (
        <div className="card-glass bg-amber-500/10 border-amber-500/30 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
            <div>
              <p className="text-amber-400 font-medium">WhatsApp não conectado</p>
              <p className="text-sm text-gray-400">
                Acesse a página do WhatsApp para conectar seu dispositivo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <Suspense key={stat.title} fallback={<ComponentLoader />}>
            <div className="animate-fade-in">
              <StatsCard {...stat} />
            </div>
          </Suspense>
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2">
          <Suspense fallback={<ComponentLoader />}>
            <div className="animate-fade-in">
              <ActivityChart />
            </div>
          </Suspense>
        </div>

        {/* Recent Contacts */}
        <div>
          <Suspense fallback={<ComponentLoader />}>
            <div className="animate-fade-in">
              <RecentContacts />
            </div>
          </Suspense>
        </div>
      </div>

      {/* Loading State */}
      {state.dashboard.loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      )}
    </div>
  )
}

// Helper function to format online time
const formatOnlineTime = (seconds) => {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
}

export default Dashboard