import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Download, Users, MessageCircle, Filter, MoreVertical } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

const Contacts = () => {
  const { state, loadContacts } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadContacts(currentPage, searchTerm)
  }, [currentPage])

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      setCurrentPage(1)
      loadContacts(1, searchTerm)
    }, 500)

    return () => clearTimeout(debounceTimeout)
  }, [searchTerm])

  const handleExport = async () => {
    try {
      const response = await fetch('/api/contacts/export/csv')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contacts.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting contacts:', error)
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
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500'
    ]
    return colors[index % colors.length]
  }

  const { list: contacts, total, loading } = state.contacts

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Contatos</h1>
          <p className="text-gray-400">
            Gerencie todos os contatos do seu bot
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="btn-glass flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-glass flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-glass p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-600/20 rounded-lg">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{total}</p>
              <p className="text-gray-400 text-sm">Total de contatos</p>
            </div>
          </div>
        </div>

        <div className="card-glass p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success-600/20 rounded-lg">
              <MessageCircle className="w-5 h-5 text-success-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {contacts.filter(c => {
                  const lastMessage = new Date(c.lastMessageAt)
                  const oneDayAgo = new Date()
                  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
                  return lastMessage > oneDayAgo
                }).length}
              </p>
              <p className="text-gray-400 text-sm">Ativos hoje</p>
            </div>
          </div>
        </div>

        <div className="card-glass p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning-600/20 rounded-lg">
              <MessageCircle className="w-5 h-5 text-warning-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {Math.round(contacts.reduce((acc, c) => acc + c.messageCount, 0) / (contacts.length || 1))}
              </p>
              <p className="text-gray-400 text-sm">Msg por contato</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar contatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-glass w-full pl-10"
          />
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card-glass p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Atividade
                </label>
                <select className="input-glass w-full">
                  <option value="">Todos</option>
                  <option value="today">Ativos hoje</option>
                  <option value="week">Ativos esta semana</option>
                  <option value="month">Ativos este mês</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mensagens
                </label>
                <select className="input-glass w-full">
                  <option value="">Todas</option>
                  <option value="high">Muitas mensagens (50+)</option>
                  <option value="medium">Médias mensagens (10-49)</option>
                  <option value="low">Poucas mensagens (1-9)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button className="btn-primary w-full">
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Contacts List */}
      <div className="card-glass">
        {loading ? (
          <div className="space-y-4 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-600 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-600 rounded w-1/4" />
                  <div className="h-3 bg-gray-600 rounded w-1/6" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-600 rounded w-16" />
                  <div className="h-3 bg-gray-600 rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : contacts.length > 0 ? (
          <div className="divide-y divide-white/10">
            {contacts.map((contact, index) => (
              <motion.div
                key={contact.phone}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center space-x-4 p-6 hover:bg-white/5 transition-colors"
              >
                <div className={`w-12 h-12 ${getContactColor(index)} rounded-full flex items-center justify-center text-white font-bold`}>
                  {getInitials(contact.name)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{contact.name}</h3>
                  <p className="text-gray-400 text-sm truncate">{contact.phone}</p>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-400">
                  <div className="text-center">
                    <p className="text-white font-medium">{contact.messageCount}</p>
                    <p className="text-xs">Mensagens</p>
                  </div>
                  
                  <div className="text-center min-w-0">
                    <p className="text-white font-medium truncate">
                      {formatLastMessage(contact.lastMessageAt)}
                    </p>
                    <p className="text-xs">Última msg</p>
                  </div>
                  
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhum contato encontrado</h3>
            <p className="text-gray-400">
              {searchTerm 
                ? 'Tente ajustar sua busca ou filtros'
                : 'Os contatos aparecerão aqui quando alguém enviar uma mensagem'
              }
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && contacts.length > 0 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn-glass px-3 py-2 disabled:opacity-50"
          >
            Anterior
          </button>
          
          <span className="text-gray-400 px-4">
            Página {currentPage}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={contacts.length < 50}
            className="btn-glass px-3 py-2 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}

export default Contacts