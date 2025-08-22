import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, MessageCircle, Clock } from 'lucide-react'
import { api } from '../../utils/api'
import { Link } from 'react-router-dom'

const RecentContacts = () => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentContacts()
  }, [])

  const loadRecentContacts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/contacts/stats/top', { params: { limit: 5 } })
      setContacts(response.data.contacts || [])
    } catch (error) {
      console.error('Error loading recent contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLastMessage = (timestamp) => {
    if (!timestamp) return 'Nunca'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Agora há pouco'
    if (diffHours < 24) return `${diffHours}h atrás`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d atrás`
    
    return date.toLocaleDateString('pt-BR')
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const getContactColor = (index) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-yellow-500',
      'bg-pink-500'
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="card-glass">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-success-600/20 rounded-lg">
            <Users className="w-5 h-5 text-success-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Contatos Ativos</h3>
            <p className="text-gray-400 text-sm">Top contatos por mensagens</p>
          </div>
        </div>

        <Link to="/contacts" className="text-primary-400 hover:text-primary-300 text-sm">
          Ver todos
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-600 rounded w-3/4" />
                <div className="h-3 bg-gray-600 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : contacts.length > 0 ? (
        <div className="space-y-4">
          {contacts.map((contact, index) => (
            <motion.div
              key={contact.phone}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className={`w-10 h-10 ${getContactColor(index)} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                {getInitials(contact.name)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{contact.name}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <MessageCircle className="w-3 h-3" />
                  <span>{contact.messageCount} mensagens</span>
                  <Clock className="w-3 h-3 ml-2" />
                  <span>{formatLastMessage(contact.lastMessageAt)}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum contato encontrado</p>
          <p className="text-gray-500 text-sm mt-1">
            Os contatos aparecerão aqui quando começarem a conversar
          </p>
        </div>
      )}
    </div>
  )
}

export default RecentContacts