import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Activity
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useSocket } from '../contexts/SocketContext'
import StatsCard from '../components/Dashboard/StatsCard'
import ActivityChart from '../components/Dashboard/ActivityChart'
import RecentContacts from '../components/Dashboard/RecentContacts'

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
      color: 'text-primary-500',
      bgColor: 'bg-primary-500/10'
    },
    {
      title: 'Conversas Ativas',
      value: overview?.conversations?.totalConversations || 0,
      change: `${overview?.conversations?.activeToday || 0} hoje`,
      icon: Users,
      color: 'text-success-500',
      bgColor: 'bg-success-500/10'
    },
    {
      title: 'Tempo Online',
      value: formatOnlineTime(overview?.messages?.totalOnlineTime || 0),
      change: `${formatOnlineTime(overview?.messages?.today?.onlineTime || 0)} hoje`,
      icon: Clock,
      color: 'text-warning-500',
      bgColor: 'bg-warning-500/10'
    },
    {
      title: 'Contatos',
      value: overview?.contacts?.totalContacts || 0,
      change: `+${overview?.contacts?.activeToday || 0} ativos`,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glass bg-warning-500/10 border-warning-500/30"
        >
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-warning-500 rounded-full animate-pulse" />
            <div>
              <p className="text-warning-400 font-medium">WhatsApp não conectado</p>
              <p className="text-sm text-gray-400">
                Acesse a página do WhatsApp para conectar seu dispositivo
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <ActivityChart />
        </motion.div>

        {/* Recent Contacts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <RecentContacts />
        </motion.div>
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