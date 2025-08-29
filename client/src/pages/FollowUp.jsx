import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Clock, MessageCircle, TrendingUp, CheckCircle, AlertCircle, Play, Pause, BarChart3, History } from 'lucide-react'
import toast from 'react-hot-toast'

const FollowUp = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    generate_prompt: '',
    no_generate_prompt: '',
    inactivity_hours: 24,
    delay_hours: 2,
    max_followups_per_conversation: 2,
    followup_interval_hours: 168
  })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('settings')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [settingsRes, statsRes] = await Promise.all([
        fetch('/api/followup/settings'),
        fetch('/api/followup/stats')
      ])

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error loading followup data:', error)
      toast.error('Erro ao carregar dados do follow-up')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const response = await fetch('/api/followup/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Configurações de follow-up salvas com sucesso!')
        await loadData() // Reload stats
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Error saving followup settings:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }))
  }

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Follow-up Inteligente</h1>
          <p className="text-gray-400">
            Configure mensagens automáticas de follow-up baseadas em análise de IA
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${settings.enabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-sm text-gray-400">
              {settings.enabled ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
          </button>
        </div>
      </div>

      {/* Status Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Na Fila</p>
                <p className="text-2xl font-bold text-white">{stats.queue?.pending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Enviados (30d)</p>
                <p className="text-2xl font-bold text-white">{stats.history?.total_sent || 0}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Taxa de Resposta</p>
                <p className="text-2xl font-bold text-white">
                  {stats.history?.total_sent > 0 
                    ? Math.round((stats.history.responses / stats.history.total_sent) * 100) 
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Processados</p>
                <p className="text-2xl font-bold text-white">{stats.queue?.completed || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-primary-500" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
        {[
          { key: 'settings', label: 'Configurações', icon: AlertCircle },
          { key: 'stats', label: 'Estatísticas', icon: BarChart3 }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200
              ${activeTab === tab.key 
                ? 'bg-primary-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Enable/Disable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Status do Follow-up</h3>
                <p className="text-gray-400 text-sm">
                  Ativar ou desativar o sistema de follow-up automático
                </p>
              </div>
              
              <button
                onClick={handleToggleEnabled}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                  ${settings.enabled ? 'bg-primary-600' : 'bg-gray-600'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
                    ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </motion.div>

          {/* Timing Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-primary-500" />
              <span>Configurações de Tempo</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Horas de Inatividade
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={settings.inactivity_hours}
                  onChange={(e) => handleInputChange('inactivity_hours', parseInt(e.target.value))}
                  className="input-glass w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tempo sem atividade antes de analisar para follow-up (1-168 horas)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Atraso do Envio (horas)
                </label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.delay_hours}
                  onChange={(e) => handleInputChange('delay_hours', parseInt(e.target.value))}
                  className="input-glass w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tempo de espera após análise positiva para enviar (1-72 horas)
                </p>
              </div>
            </div>
          </motion.div>

          {/* Limits Settings - Destacado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6 border-l-4 border-yellow-500"
          >
            <div className="flex items-start space-x-3 mb-6">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Controles Anti-Spam</h3>
                <p className="text-gray-400 text-sm">
                  Configure limites para evitar incomodar os clientes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                  <span>Máximo por Conversa</span>
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                    IMPORTANTE
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.max_followups_per_conversation}
                  onChange={(e) => handleInputChange('max_followups_per_conversation', parseInt(e.target.value))}
                  className="input-glass w-full border-yellow-500/30"
                />
                <div className="flex items-start space-x-2 mt-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-200">
                    <strong>Evita spam:</strong> Máximo de {settings.max_followups_per_conversation} follow-up{settings.max_followups_per_conversation > 1 ? 's' : ''} por conversa no período definido abaixo
                  </p>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                  <span>Intervalo Entre Follow-ups</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    PERÍODO
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="24"
                    max="720"
                    value={settings.followup_interval_hours}
                    onChange={(e) => handleInputChange('followup_interval_hours', parseInt(e.target.value))}
                    className="input-glass w-full pr-16"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                    horas
                  </span>
                </div>
                <p className="text-xs text-blue-200 mt-2">
                  <strong>Janela de tempo:</strong> {Math.round(settings.followup_interval_hours / 24)} dia{Math.round(settings.followup_interval_hours / 24) !== 1 ? 's' : ''} para contar o limite acima
                </p>
              </div>
            </div>

            {/* Resumo Visual */}
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2">📊 Resumo da Configuração:</h4>
              <p className="text-xs text-gray-300">
                Cada cliente receberá no <strong>máximo {settings.max_followups_per_conversation} follow-up{settings.max_followups_per_conversation > 1 ? 's' : ''}</strong> 
                a cada <strong>{Math.round(settings.followup_interval_hours / 24)} dia{Math.round(settings.followup_interval_hours / 24) !== 1 ? 's' : ''}</strong>. 
                Após esse limite, o sistema para de gerar follow-ups automaticamente para aquela conversa.
              </p>
            </div>
          </motion.div>

          {/* AI Response Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 border-l-4 border-green-500"
          >
            <div className="flex items-start space-x-3 mb-6">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Análise Inteligente de Respostas</h3>
                <p className="text-gray-400 text-sm">
                  Sistema avançado que analisa as respostas dos clientes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <h4 className="font-medium text-green-400 mb-2">🛑 Para Follow-ups Quando Cliente:</h4>
                <ul className="text-sm text-green-100 space-y-1">
                  <li>• Demonstra desinteresse claro</li>
                  <li>• Pede para não ser mais contatado</li>
                  <li>• Já resolveu em outro lugar</li>
                  <li>• Mostra irritação</li>
                  <li>• Dá resposta definitiva "não"</li>
                  <li>• Finaliza satisfatoriamente</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <h4 className="font-medium text-blue-400 mb-2">✅ Continua Follow-ups Quando Cliente:</h4>
                <ul className="text-sm text-blue-100 space-y-1">
                  <li>• Mostra interesse mas não pode agora</li>
                  <li>• Faz perguntas de interesse</li>
                  <li>• Diz "talvez mais tarde"</li>
                  <li>• Conversa sem conclusão clara</li>
                  <li>• Pede mais tempo para decidir</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-start space-x-2">
                <TrendingUp className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="text-purple-400 font-medium">Reset Automático:</span>
                  <span className="text-purple-100 ml-1">
                    Se o cliente voltar após 3+ dias de silêncio, o sistema considera uma "nova conversa" e reseta todos os limites
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Prompts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-primary-500" />
              <span>Configurações de IA</span>
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prompt para GERAR Follow-up
                </label>
                <textarea
                  value={settings.generate_prompt}
                  onChange={(e) => handleInputChange('generate_prompt', e.target.value)}
                  className="input-glass w-full h-24 resize-none"
                  placeholder="Descreva quando a IA deve gerar um follow-up..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Critérios que a IA usará para decidir quando gerar um follow-up
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Prompt para NÃO GERAR Follow-up
                </label>
                <textarea
                  value={settings.no_generate_prompt}
                  onChange={(e) => handleInputChange('no_generate_prompt', e.target.value)}
                  className="input-glass w-full h-24 resize-none"
                  placeholder="Descreva quando a IA NÃO deve gerar um follow-up..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Critérios que a IA usará para decidir quando NÃO gerar um follow-up
                </p>
              </div>
            </div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white mb-2">Como Funciona o Follow-up Inteligente</h4>
                <ul className="text-gray-400 text-sm space-y-2">
                  <li>• <strong>Análise automática:</strong> Após o tempo de inatividade, a IA analisa a conversa usando seus critérios</li>
                  <li>• <strong>Mensagem personalizada:</strong> Se a análise for positiva, uma mensagem contextualizada é gerada</li>
                  <li>• <strong>Envio programado:</strong> A mensagem é enviada após o atraso configurado</li>
                  <li>• <strong>Contexto preservado:</strong> Tudo é mantido no histórico da conversa para continuidade natural</li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span><strong className="text-yellow-400">Proteção anti-spam:</strong> O sistema para automaticamente após atingir o limite configurado por conversa</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span><strong className="text-green-400">Análise de resposta:</strong> Quando o cliente responde, a IA analisa se ele quer parar de receber follow-ups ou pode continuar</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span><strong className="text-purple-400">Nova conversa:</strong> Se o cliente iniciar uma conversa após 3+ dias, os limites são resetados automaticamente</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            <span>Estatísticas Detalhadas</span>
          </h3>
          
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Estatísticas detalhadas em desenvolvimento</p>
            <p className="text-gray-500 text-sm mt-2">
              Em breve você poderá visualizar gráficos e relatórios detalhados
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default FollowUp