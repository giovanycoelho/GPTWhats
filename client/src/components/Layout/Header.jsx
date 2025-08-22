import React from 'react'
import { useSocket } from '../../contexts/SocketContext'
import { Bell, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const Header = () => {
  const { connected, whatsappStatus } = useSocket()

  const getStatusText = () => {
    if (!connected) return 'Desconectado do servidor'
    
    switch (whatsappStatus) {
      case 'connected':
        return 'WhatsApp Conectado'
      case 'qr':
        return 'Aguardando QR Code'
      case 'connecting':
        return 'Conectando ao WhatsApp'
      case 'disconnected':
        return 'WhatsApp Desconectado'
      default:
        return 'Verificando status...'
    }
  }

  const getStatusColor = () => {
    if (!connected) return 'text-error-500'
    
    switch (whatsappStatus) {
      case 'connected':
        return 'text-success-500'
      case 'qr':
      case 'connecting':
        return 'text-warning-500'
      case 'disconnected':
        return 'text-gray-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <header className="h-16 glass-dark border-b border-white/10 px-6 flex items-center justify-between">
      {/* Status */}
      <div className="flex items-center space-x-3">
        <div className={clsx(
          'w-2 h-2 rounded-full',
          {
            'status-online': connected && whatsappStatus === 'connected',
            'status-offline': !connected || whatsappStatus === 'disconnected',
            'status-connecting': connected && (whatsappStatus === 'qr' || whatsappStatus === 'connecting'),
            'status-error': !connected
          }
        )} />
        <span className={clsx('text-sm font-medium', getStatusColor())}>
          {getStatusText()}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4">
        {/* Refresh button */}
        <button
          onClick={() => window.location.reload()}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Atualizar página"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors relative">
          <Bell className="w-4 h-4" />
          {/* Notification badge */}
          {/* <div className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" /> */}
        </button>
      </div>
    </header>
  )
}

export default Header