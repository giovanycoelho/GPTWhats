import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  MessageCircle, 
  Users, 
  Settings, 
  Bot,
  Activity,
  Volume2,
  Bell,
  UserPlus,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react'
import { useSocket } from '../../contexts/SocketContext'
import clsx from 'clsx'

const Sidebar = () => {
  const { whatsappStatus } = useSocket()
  const [hoveredItem, setHoveredItem] = useState(null)

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      exact: true,
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      name: 'WhatsApp',
      path: '/whatsapp',
      icon: MessageCircle,
      status: whatsappStatus,
      gradient: 'from-green-500 to-teal-600'
    },
    {
      name: 'Contatos',
      path: '/contacts',
      icon: Users,
      gradient: 'from-orange-500 to-red-600'
    },
    {
      name: 'Respostas em Áudio',
      path: '/audio-responses',
      icon: Volume2,
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      name: 'Notificações Externas',
      path: '/external-notifications',
      icon: Bell,
      gradient: 'from-yellow-500 to-orange-600'
    },
    {
      name: 'Follow-up Inteligente',
      path: '/followup',
      icon: UserPlus,
      gradient: 'from-cyan-500 to-blue-600'
    },
    {
      name: 'Configurações',
      path: '/settings',
      icon: Settings,
      gradient: 'from-gray-500 to-gray-700'
    }
  ]

  const getStatusInfo = () => {
    switch (whatsappStatus) {
      case 'connected':
        return { color: 'text-green-400', bg: 'bg-green-400/20', text: 'Online', pulse: false }
      case 'connecting':
        return { color: 'text-yellow-400', bg: 'bg-yellow-400/20', text: 'Conectando', pulse: true }
      case 'qr':
        return { color: 'text-blue-400', bg: 'bg-blue-400/20', text: 'QR Code', pulse: true }
      case 'disconnected':
        return { color: 'text-gray-400', bg: 'bg-gray-400/20', text: 'Offline', pulse: false }
      default:
        return { color: 'text-red-400', bg: 'bg-red-400/20', text: 'Erro', pulse: false }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <motion.aside 
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-64 glass-dark border-r border-white/10 flex flex-col relative overflow-hidden"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-purple-900/20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
      
      {/* Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 border-b border-white/10 relative"
      >
        <div className="flex items-center space-x-4">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-3 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl shadow-lg"
          >
            <Bot className="w-7 h-7 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              GPTWhats
            </h1>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3 h-3 text-primary-400" />
              <p className="text-sm text-gray-400 font-medium">AI WhatsApp Bot</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 relative">
        {navItems.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
            onHoverStart={() => setHoveredItem(item.path)}
            onHoverEnd={() => setHoveredItem(null)}
          >
            <NavLink
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                clsx(
                  'group relative flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 overflow-hidden',
                  isActive
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg shadow-primary-500/25 border border-white/10`
                    : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Background animation */}
                  {hoveredItem === item.path && !isActive && (
                    <motion.div
                      layoutId="sidebar-hover"
                      className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  
                  {/* Icon container */}
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={clsx(
                      'relative p-2 rounded-lg transition-all duration-300',
                      isActive 
                        ? 'bg-white/20 shadow-lg' 
                        : 'bg-white/5 group-hover:bg-white/10'
                    )}
                  >
                    <item.icon className="w-5 h-5 relative z-10" />
                    {isActive && (
                      <motion.div
                        layoutId="active-glow"
                        className="absolute inset-0 bg-white/30 rounded-lg blur-sm"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </motion.div>
                  
                  <div className="flex-1 relative z-10">
                    <span className="font-semibold text-sm">{item.name}</span>
                  </div>
                  
                  {/* Arrow indicator */}
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-auto"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.div>
                  )}
                  
                  {/* Status indicator for WhatsApp */}
                  {item.status && (
                    <div className="ml-auto flex items-center">
                      <motion.div 
                        animate={statusInfo.pulse ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={clsx(
                          'w-2.5 h-2.5 rounded-full border-2 border-white/30',
                          statusInfo.color.replace('text-', 'bg-')
                        )}
                      />
                    </div>
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Status Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="p-4 border-t border-white/10 relative"
      >
        <div className={clsx(
          'flex items-center justify-between p-3 rounded-xl transition-all duration-300',
          statusInfo.bg
        )}>
          <div className="flex items-center space-x-3">
            <motion.div 
              animate={statusInfo.pulse ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative"
            >
              <div className={clsx('w-3 h-3 rounded-full', statusInfo.color.replace('text-', 'bg-'))} />
              {statusInfo.pulse && (
                <div className={clsx(
                  'absolute inset-0 w-3 h-3 rounded-full animate-ping',
                  statusInfo.color.replace('text-', 'bg-')
                )} />
              )}
            </motion.div>
            <div>
              <span className={clsx('text-sm font-semibold', statusInfo.color)}>
                {statusInfo.text}
              </span>
              <p className="text-xs text-gray-500">Status WhatsApp</p>
            </div>
          </div>
          <Zap className={clsx('w-4 h-4', statusInfo.color)} />
        </div>
      </motion.div>
    </motion.aside>
  )
}

export default Sidebar