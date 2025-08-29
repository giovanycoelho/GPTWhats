import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  MessageCircle, 
  Users, 
  Settings, 
  Bot,
  Activity,
  Volume2,
  Bell,
  UserPlus
} from 'lucide-react'
import { useSocket } from '../../contexts/SocketContext'
import clsx from 'clsx'

const Sidebar = () => {
  const { whatsappStatus } = useSocket()

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: 'WhatsApp',
      path: '/whatsapp',
      icon: MessageCircle,
      status: whatsappStatus
    },
    {
      name: 'Contatos',
      path: '/contacts',
      icon: Users
    },
    {
      name: 'Respostas em Áudio',
      path: '/audio-responses',
      icon: Volume2
    },
    {
      name: 'Notificações Externas',
      path: '/external-notifications',
      icon: Bell
    },
    {
      name: 'Follow-up Inteligente',
      path: '/followup',
      icon: UserPlus
    },
    {
      name: 'Configurações',
      path: '/settings',
      icon: Settings
    }
  ]

  return (
    <aside className="w-64 glass-dark border-r border-white/10 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-600 rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">GPTWhats</h1>
            <p className="text-sm text-gray-400">AI WhatsApp Bot</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              clsx(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
                
                {/* Status indicator for WhatsApp */}
                {item.status && (
                  <div className="ml-auto flex items-center">
                    <div className={clsx(
                      'w-2 h-2 rounded-full',
                      {
                        'status-online': item.status === 'connected',
                        'status-offline': item.status === 'disconnected',
                        'status-connecting': item.status === 'qr' || item.status === 'connecting',
                        'status-error': item.status === 'error'
                      }
                    )} />
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status Bar */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center space-x-3 text-sm">
          <div className={clsx(
            'w-2 h-2 rounded-full',
            {
              'status-online': whatsappStatus === 'connected',
              'status-offline': whatsappStatus === 'disconnected',
              'status-connecting': whatsappStatus === 'qr' || whatsappStatus === 'connecting',
              'status-error': whatsappStatus === 'error'
            }
          )} />
          <span className="text-gray-400">
            {whatsappStatus === 'connected' && 'Online'}
            {whatsappStatus === 'disconnected' && 'Desconectado'}
            {whatsappStatus === 'qr' && 'Aguardando QR Code'}
            {whatsappStatus === 'connecting' && 'Conectando...'}
            {whatsappStatus === 'error' && 'Erro de conexão'}
          </span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar