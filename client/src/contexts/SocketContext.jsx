import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected')
  const [qrCode, setQrCode] = useState(null)

  useEffect(() => {
    // Connect to socket server
    const socketInstance = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001', {
      transports: ['websocket']
    })

    socketInstance.on('connect', () => {
      console.log('Socket connected')
      setConnected(true)
      setSocket(socketInstance)
    })

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected')
      setConnected(false)
    })

    // WhatsApp events
    socketInstance.on('qr-code', (qr) => {
      console.log('QR Code received')
      setQrCode(qr)
      setWhatsappStatus('qr')
    })

    socketInstance.on('connection-status', (status) => {
      console.log('WhatsApp status:', status)
      setWhatsappStatus(status.status)
      
      if (status.status === 'connected') {
        setQrCode(null)
        toast.success('WhatsApp conectado com sucesso!')
      } else if (status.status === 'disconnected') {
        if (!status.canReconnect) {
          setQrCode(null)
          toast.error('WhatsApp desconectado. Sessão expirada.')
        } else {
          toast.error('WhatsApp desconectado. Tentando reconectar...')
        }
      } else if (status.status === 'connecting') {
        toast.loading('Conectando ao WhatsApp...', { id: 'connecting' })
      }
    })

    socketInstance.on('session-cleared', () => {
      console.log('Session cleared')
      setQrCode(null)
      setWhatsappStatus('disconnected')
      toast.success('Sessão limpa com sucesso!')
    })

    socketInstance.on('message-received', (data) => {
      console.log('Message received:', data)
      toast.success(`Nova mensagem de ${data.from}`)
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const value = {
    socket,
    connected,
    whatsappStatus,
    qrCode,
    setWhatsappStatus,
    setQrCode
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}