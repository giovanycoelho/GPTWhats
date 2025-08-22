import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Smartphone, 
  QrCode, 
  Wifi, 
  WifiOff, 
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import { api } from '../utils/api'
import toast from 'react-hot-toast'

const WhatsApp = () => {
  const { whatsappStatus, qrCode, connected } = useSocket()
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    try {
      setLoading(true)
      await api.post('/whatsapp/connect')
      toast.success('Iniciando conexão com WhatsApp...')
    } catch (error) {
      toast.error('Erro ao iniciar conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setLoading(true)
      await api.post('/whatsapp/disconnect')
      toast.success('WhatsApp desconectado')
    } catch (error) {
      toast.error('Erro ao desconectar')
    } finally {
      setLoading(false)
    }
  }

  const handleClearSession = async () => {
    try {
      setLoading(true)
      await api.post('/whatsapp/clear-session')
      toast.success('Sessão limpa com sucesso')
      // Wait a bit and then try to reconnect
      setTimeout(() => {
        handleConnect()
      }, 2000)
    } catch (error) {
      toast.error('Erro ao limpar sessão')
    } finally {
      setLoading(false)
    }
  }

  const handleRestart = async () => {
    try {
      setLoading(true)
      toast.loading('Reiniciando serviço WhatsApp...', { id: 'restarting' })
      await api.post('/whatsapp/restart')
      toast.success('Serviço reiniciado com sucesso!', { id: 'restarting' })
    } catch (error) {
      toast.error('Erro ao reiniciar serviço', { id: 'restarting' })
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = () => {
    switch (whatsappStatus) {
      case 'connected':
        return {
          icon: CheckCircle2,
          color: 'text-success-500',
          bgColor: 'bg-success-500/10',
          title: 'WhatsApp Conectado',
          description: 'Seu bot está online e funcionando normalmente.',
          showDisconnect: true
        }
      case 'qr':
        return {
          icon: QrCode,
          color: 'text-warning-500',
          bgColor: 'bg-warning-500/10',
          title: 'Aguardando QR Code',
          description: 'Escaneie o QR Code com seu WhatsApp para conectar.',
          showQR: true
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10',
          title: 'Desconectado',
          description: 'Clique em conectar para iniciar a conexão com WhatsApp.',
          showConnect: true
        }
      default:
        return {
          icon: AlertCircle,
          color: 'text-error-500',
          bgColor: 'bg-error-500/10',
          title: 'Status Desconhecido',
          description: 'Verificando status da conexão...',
          showConnect: true
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">WhatsApp</h1>
          <p className="text-gray-400">
            Conecte seu WhatsApp para ativar o bot de IA
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`card-glass ${statusInfo.bgColor} border-opacity-30`}
      >
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl ${statusInfo.bgColor}`}>
            <statusInfo.icon className={`w-8 h-8 ${statusInfo.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-1">
              {statusInfo.title}
            </h3>
            <p className="text-gray-400">{statusInfo.description}</p>
          </div>
        </div>
      </motion.div>

      {/* QR Code Section */}
      {statusInfo.showQR && qrCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-glass text-center"
        >
          <div className="mb-6">
            <QrCode className="w-12 h-12 text-warning-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Escaneie o QR Code
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Abra o WhatsApp no seu celular, vá em <strong>Dispositivos Conectados</strong> 
              e escaneie este código QR.
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-xl inline-block">
            <img 
              src={qrCode} 
              alt="QR Code WhatsApp" 
              className="w-64 h-64 mx-auto"
            />
          </div>

          <div className="mt-6">
            <button
              onClick={handleClearSession}
              disabled={loading}
              className="btn-glass flex items-center space-x-2 mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Gerar Novo QR Code</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4"
      >
        {statusInfo.showConnect && (
          <button
            onClick={handleConnect}
            disabled={loading || !connected}
            className="btn-success flex items-center space-x-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>{loading ? 'Conectando...' : 'Conectar WhatsApp'}</span>
          </button>
        )}

        {statusInfo.showDisconnect && (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="btn-error flex items-center space-x-2"
          >
            <WifiOff className="w-4 h-4" />
            <span>{loading ? 'Desconectando...' : 'Desconectar'}</span>
          </button>
        )}

        <button
          onClick={handleClearSession}
          disabled={loading}
          className="btn-glass flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Limpar Sessão</span>
        </button>

        <button
          onClick={handleRestart}
          disabled={loading}
          className="btn-warning flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reiniciar Serviço</span>
        </button>
      </motion.div>

      {/* Connection Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-glass"
      >
        <h3 className="text-xl font-semibold text-white mb-4">
          Como conectar seu WhatsApp
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="text-white font-medium">Clique em "Conectar WhatsApp"</p>
              <p className="text-gray-400 text-sm">Isso irá iniciar o processo de conexão</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="text-white font-medium">Aguarde o QR Code aparecer</p>
              <p className="text-gray-400 text-sm">Um código QR será gerado automaticamente</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="text-white font-medium">Escaneie com seu WhatsApp</p>
              <p className="text-gray-400 text-sm">Abra WhatsApp → Dispositivos Conectados → Conectar Dispositivo</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Server Connection Warning */}
      {!connected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-glass bg-error-500/10 border-error-500/30"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-error-500" />
            <div>
              <p className="text-error-400 font-medium">Sem conexão com o servidor</p>
              <p className="text-sm text-gray-400">
                Verifique se o servidor está rodando e tente novamente
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default WhatsApp