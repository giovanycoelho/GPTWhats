import React, { useEffect, useState, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageSquare, 
  Users, 
  Clock, 
  RefreshCw,
  Activity,
  Zap,
  TrendingUp,
  Bot,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  MessageCircle,
  Phone
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
  const { whatsappStatus, connected } = useSocket()
  const [refreshing, setRefreshing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadDashboard()
    
    // Auto refresh every 30 seconds
    const interval = setInterval(loadDashboard, 30000)
    
    // Update time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)
    
    return () => {
      clearInterval(interval)
      clearInterval(timeInterval)
    }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboard()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const overview = state.dashboard.overview

  const getStatusInfo = () => {
    if (!connected) {
      return {
        status: 'Servidor Desconectado',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        icon: WifiOff,
        description: 'Sem conexão com o servidor'
      }
    }
    
    switch (whatsappStatus) {
      case 'connected':
        return {
          status: 'WhatsApp Online',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          icon: CheckCircle2,
          description: 'Bot funcionando normalmente'
        }
      case 'connecting':
        return {
          status: 'Conectando',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          icon: RefreshCw,
          description: 'Estabelecendo conexão'
        }
      case 'qr':
        return {
          status: 'Aguardando QR',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          icon: Phone,
          description: 'Escaneie o QR Code'
        }
      case 'disconnected':
        return {
          status: 'Desconectado',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10',
          icon: WifiOff,
          description: 'WhatsApp offline'
        }
      default:
        return {
          status: 'Status Desconhecido',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          icon: AlertTriangle,
          description: 'Verificando status'
        }
    }
  }

  const statusInfo = getStatusInfo()

  const statsData = [
    {
      title: 'Mensagens Enviadas',
      value: overview?.messages?.totalSent || 0,
      change: `+${overview?.messages?.today?.sent || 0} hoje`,
      trend: '+12%',
      icon: MessageSquare,
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-500/10 to-cyan-500/10'
    },
    {
      title: 'Conversas Ativas',
      value: overview?.conversations?.totalConversations || 0,
      change: `${overview?.conversations?.activeToday || 0} hoje`,
      trend: '+8%',
      icon: MessageCircle,
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-500/10 to-emerald-500/10'
    },
    {
      title: 'Tempo Online',
      value: formatOnlineTime(overview?.messages?.totalOnlineTime || 0),
      change: `${formatOnlineTime(overview?.messages?.today?.onlineTime || 0)} hoje`,
      trend: '+15%',
      icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-500/10 to-orange-500/10'
    },
    {
      title: 'Contatos Ativos',
      value: overview?.contacts?.totalContacts || 0,
      change: `+${overview?.contacts?.activeToday || 0} novos`,
      trend: '+5%',
      icon: Users,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-500/10 to-pink-500/10'
    }
  ]

  const quickActions = [
    {
      title: 'Configurar IA',
      description: 'Ajustar prompts e comportamento',
      icon: Bot,
      gradient: 'from-primary-500 to-purple-600',
      href: '/settings'
    },
    {
      title: 'Ver Contatos',
      description: 'Gerenciar lista de contatos',
      icon: Users,
      gradient: 'from-green-500 to-teal-600',
      href: '/contacts'
    },
    {
      title: 'WhatsApp',
      description: 'Status e conexão',
      icon: Phone,
      gradient: 'from-blue-500 to-indigo-600',
      href: '/whatsapp'
    }
  ]

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* Header com Relógio */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-6">
          <div>
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-2"
              animate={{ backgroundPosition: ['0%', '100%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              Dashboard
            </motion.h1>
            <div className="flex items-center space-x-2 text-gray-400">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <p>Centro de controle do GPTWhats</p>
            </div>
          </div>
          
          {/* Live Clock */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="glass-dark px-4 py-2 rounded-xl border border-white/10"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-primary-400" />
              <span className="text-white font-mono text-sm">
                {currentTime.toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </motion.div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={refreshing || state.dashboard.loading}
          className="btn-glass flex items-center space-x-3 px-6 py-3"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="font-medium">Atualizar</span>
        </motion.button>
      </motion.div>

      {/* Status Banner Melhorado */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`card-glass relative overflow-hidden ${statusInfo.bgColor} border-opacity-30`}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-600" />
        
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-4">
            <motion.div 
              animate={{ rotate: whatsappStatus === 'connecting' ? 360 : 0 }}
              transition={{ duration: 2, repeat: whatsappStatus === 'connecting' ? Infinity : 0, ease: "linear" }}
              className={`p-3 rounded-xl ${statusInfo.bgColor}`}
            >
              <statusInfo.icon className={`w-6 h-6 ${statusInfo.color}`} />
            </motion.div>
            <div>
              <h3 className={`text-lg font-semibold ${statusInfo.color} mb-1`}>
                {statusInfo.status}
              </h3>
              <p className="text-gray-400 text-sm">{statusInfo.description}</p>
            </div>
          </div>
          
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`w-4 h-4 rounded-full ${statusInfo.color.replace('text-', 'bg-')}`}
          />
        </div>
      </motion.div>

      {/* Stats Grid Modernizado */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ y: -5 }}
            className={`card-glass relative overflow-hidden p-6 bg-gradient-to-br ${stat.bgGradient} border border-white/10`}
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
              <div className={`w-full h-full bg-gradient-to-br ${stat.gradient} rounded-full transform rotate-12 translate-x-8 -translate-y-8`} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </motion.div>
                
                <div className="flex items-center space-x-1 text-xs font-medium text-green-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>{stat.trend}</span>
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm font-medium mb-2">{stat.title}</p>
                <motion.p 
                  key={stat.value}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-bold text-white mb-2"
                >
                  {stat.value}
                </motion.p>
                <p className="text-xs text-gray-500">{stat.change}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {quickActions.map((action, index) => (
          <motion.a
            key={action.title}
            href={action.href}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="card-glass p-6 relative overflow-hidden cursor-pointer group"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
            
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-4">
                <motion.div 
                  whileHover={{ rotate: 10 }}
                  className={`p-3 rounded-xl bg-gradient-to-r ${action.gradient} shadow-lg`}
                >
                  <action.icon className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{action.title}</h3>
                  <p className="text-gray-400 text-sm">{action.description}</p>
                </div>
              </div>
              
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                whileHover={{ x: 0, opacity: 1 }}
                className="flex items-center text-primary-400 text-sm font-medium"
              >
                <span>Acessar</span>
                <motion.div whileHover={{ x: 5 }}>
                  <Zap className="w-4 h-4 ml-2" />
                </motion.div>
              </motion.div>
            </div>
          </motion.a>
        ))}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="lg:col-span-2"
        >
          <Suspense fallback={<ComponentLoader />}>
            <ActivityChart />
          </Suspense>
        </motion.div>

        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <Suspense fallback={<ComponentLoader />}>
            <RecentContacts />
          </Suspense>
        </motion.div>
      </div>

      {/* Loading Overlay */}
      {state.dashboard.loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full"
          />
        </motion.div>
      )}
    </motion.div>
  )
}

// Helper function to format online time
const formatOnlineTime = (seconds) => {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
}

export default Dashboard