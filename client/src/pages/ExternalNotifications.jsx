import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Bell, 
  Link, 
  UserCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Save,
  X,
  Activity,
  Phone,
  MessageSquare,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import SettingsToggle from '../components/Settings/SettingsToggle'

// Componente de toggle simples para uso inline
const SimpleToggle = ({ checked, onChange, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6'
  }
  
  const circleClasses = {
    sm: 'h-3 w-3 after:top-[1px] after:left-[1px]',
    md: 'h-5 w-5 after:top-[2px] after:left-[2px]'
  }

  return (
    <div className="flex items-center space-x-2">
      <span className={`text-xs font-medium transition-colors duration-200 ${
        checked ? 'text-gray-400' : 'text-gray-300'
      }`}>
        OFF
      </span>
      
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={`${sizeClasses[size]} bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute ${circleClasses[size]} after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all ${
          checked 
            ? 'bg-green-500 border-green-400' 
            : 'bg-gray-700 border-gray-600'
        }`} />
      </label>
      
      <span className={`text-xs font-medium transition-colors duration-200 ${
        checked ? 'text-green-400' : 'text-gray-400'
      }`}>
        ON
      </span>
    </div>
  )
}

const ExternalNotifications = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    whatsapp_links_enabled: false,
    custom_rules_enabled: false
  })
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState(null)
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger_prompt: '',
    target_phone: ''
  })
  const [showAddRule, setShowAddRule] = useState(false)

  useEffect(() => {
    loadSettings()
    loadRules()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/external-notifications/settings')
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const loadRules = async () => {
    try {
      const response = await fetch('/api/external-notifications/rules')
      const data = await response.json()
      if (data.success) {
        setRules(data.rules)
      }
    } catch (error) {
      console.error('Error loading rules:', error)
    }
  }

  const updateSettings = async (newSettings) => {
    try {
      const response = await fetch('/api/external-notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings)
      })
      
      const data = await response.json()
      if (data.success) {
        setSettings(newSettings)
        toast.success('Configurações atualizadas')
      } else {
        toast.error('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('Erro ao salvar configurações')
    }
  }

  const saveRule = async (rule) => {
    try {
      const url = rule.id 
        ? `/api/external-notifications/rules/${rule.id}`
        : '/api/external-notifications/rules'
      
      const response = await fetch(url, {
        method: rule.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rule)
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success(rule.id ? 'Regra atualizada' : 'Regra criada')
        loadRules()
        setEditingRule(null)
        setShowAddRule(false)
        setNewRule({ name: '', description: '', trigger_prompt: '', target_phone: '' })
      } else {
        toast.error('Erro ao salvar regra')
      }
    } catch (error) {
      console.error('Error saving rule:', error)
      toast.error('Erro ao salvar regra')
    }
  }

  const deleteRule = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return
    
    try {
      const response = await fetch(`/api/external-notifications/rules/${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success('Regra excluída')
        loadRules()
      } else {
        toast.error('Erro ao excluir regra')
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast.error('Erro ao excluir regra')
    }
  }

  const toggleRuleEnabled = async (id, enabled) => {
    try {
      const response = await fetch(`/api/external-notifications/rules/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled })
      })
      
      const data = await response.json()
      if (data.success) {
        loadRules()
        toast.success(enabled ? 'Regra ativada' : 'Regra desativada')
      }
    } catch (error) {
      console.error('Error toggling rule:', error)
      toast.error('Erro ao alterar regra')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Bell className="w-8 h-8 text-primary-400" />
            <span>Notificações Externas</span>
          </h1>
          <p className="text-gray-400 mt-2">
            Configure notificações automáticas para contatos externos
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            settings.enabled 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {settings.enabled ? 'Ativo' : 'Inativo'}
          </div>
        </div>
      </motion.div>

      {/* Main Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-glass"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-6">Configurações Gerais</h2>
          
          <div className="space-y-6">
            {/* Master Enable */}
            <SettingsToggle
              label="Ativar Notificações Externas"
              description="Habilita todo o sistema de notificações"
              value={settings.enabled}
              onChange={(value) => updateSettings({ ...settings, enabled: value })}
              icon={Bell}
            />

            {/* WhatsApp Links */}
            <div className={`${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <SettingsToggle
                label="Notificar Links WhatsApp"
                description="Envia notificação quando a IA compartilha um link do WhatsApp"
                value={settings.whatsapp_links_enabled}
                onChange={(value) => updateSettings({ ...settings, whatsapp_links_enabled: value })}
                icon={ExternalLink}
              />
            </div>

            {/* Custom Rules */}
            <div className={`${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <SettingsToggle
                label="Regras Personalizadas"
                description="Detecta situações específicas e notifica contatos definidos"
                value={settings.custom_rules_enabled}
                onChange={(value) => updateSettings({ ...settings, custom_rules_enabled: value })}
                icon={UserCheck}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Custom Rules Section */}
      {settings.enabled && settings.custom_rules_enabled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-glass"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Regras Personalizadas</h2>
              <button
                onClick={() => setShowAddRule(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Regra</span>
              </button>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Nenhuma regra configurada</p>
                <p className="text-gray-500 text-sm">Clique em "Nova Regra" para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-white font-medium">{rule.name}</h3>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            rule.enabled 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {rule.enabled ? 'Ativa' : 'Inativa'}
                          </div>
                        </div>
                        
                        {rule.description && (
                          <p className="text-gray-400 text-sm mb-2">{rule.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{rule.target_phone}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <SimpleToggle
                          checked={rule.enabled}
                          onChange={(checked) => toggleRuleEnabled(rule.id, checked)}
                          size="sm"
                        />
                        
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Add/Edit Rule Modal */}
      {(showAddRule || editingRule) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setShowAddRule(false)
            setEditingRule(null)
          }} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg bg-dark-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingRule ? 'Editar Regra' : 'Nova Regra'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddRule(false)
                    setEditingRule(null)
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome da Regra
                  </label>
                  <input
                    type="text"
                    value={editingRule ? editingRule.name : newRule.name}
                    onChange={(e) => {
                      if (editingRule) {
                        setEditingRule({ ...editingRule, name: e.target.value })
                      } else {
                        setNewRule({ ...newRule, name: e.target.value })
                      }
                    }}
                    className="input-glass w-full"
                    placeholder="Ex: Orçamento Alto Valor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição (opcional)
                  </label>
                  <input
                    type="text"
                    value={editingRule ? editingRule.description : newRule.description}
                    onChange={(e) => {
                      if (editingRule) {
                        setEditingRule({ ...editingRule, description: e.target.value })
                      } else {
                        setNewRule({ ...newRule, description: e.target.value })
                      }
                    }}
                    className="input-glass w-full"
                    placeholder="Breve descrição da regra"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Situação a Detectar
                  </label>
                  <textarea
                    value={editingRule ? editingRule.trigger_prompt : newRule.trigger_prompt}
                    onChange={(e) => {
                      if (editingRule) {
                        setEditingRule({ ...editingRule, trigger_prompt: e.target.value })
                      } else {
                        setNewRule({ ...newRule, trigger_prompt: e.target.value })
                      }
                    }}
                    className="input-glass w-full"
                    rows={3}
                    placeholder="Descreva quando esta notificação deve ser enviada. Ex: Quando o cliente solicitar um orçamento acima de R$ 50.000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefone para Notificar
                  </label>
                  <input
                    type="text"
                    value={editingRule ? editingRule.target_phone : newRule.target_phone}
                    onChange={(e) => {
                      if (editingRule) {
                        setEditingRule({ ...editingRule, target_phone: e.target.value })
                      } else {
                        setNewRule({ ...newRule, target_phone: e.target.value })
                      }
                    }}
                    className="input-glass w-full"
                    placeholder="5547999999999"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: código do país + DDD + número (sem espaços ou símbolos)
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddRule(false)
                    setEditingRule(null)
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const ruleToSave = editingRule || newRule
                    if (ruleToSave.name && ruleToSave.trigger_prompt && ruleToSave.target_phone) {
                      saveRule(ruleToSave)
                    } else {
                      toast.error('Preencha todos os campos obrigatórios')
                    }
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ExternalNotifications