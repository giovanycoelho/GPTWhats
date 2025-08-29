import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Save, Clock, MessageCircle, TrendingUp, CheckCircle, AlertCircle, 
  Play, Pause, BarChart3, History, Zap, Brain, Shield, Target,
  Timer, Settings, Users, MessageSquare, Activity, Sparkles
} from 'lucide-react'
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* Header Modernizado */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-3xl" />
        
        <div className="relative flex items-center justify-between p-6 card-glass border border-white/10">
          <div className="flex items-center space-x-6">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="p-4 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl shadow-lg"
            >
              <Brain className="w-8 h-8 text-white" />
            </motion.div>
            
            <div>
              <motion.h1 
                className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2"
                animate={{ backgroundPosition: ['0%', '100%'] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                Follow-up Inteligente
              </motion.h1>
              <div className="flex items-center space-x-3 text-gray-400">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <p>Sistema avançado de follow-up baseado em análise de IA</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Status Badge */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl ${
                settings.enabled 
                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                  : 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border border-gray-500/30'
              }`}
            >
              <motion.div 
                animate={settings.enabled ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-3 h-3 rounded-full ${settings.enabled ? 'bg-green-400 shadow-green-400/50 shadow-lg' : 'bg-gray-500'}`}
              />
              <div className="text-center">
                <div className={`text-sm font-semibold ${settings.enabled ? 'text-green-400' : 'text-gray-400'}`}>
                  {settings.enabled ? 'ATIVO' : 'INATIVO'}
                </div>
                <div className="text-xs text-gray-500">Sistema</div>
              </div>
            </motion.div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              {saving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span className="font-medium">
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Status Cards Modernizados */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              title: 'Na Fila',
              value: stats.queue?.pending || 0,
              icon: Timer,
              gradient: 'from-blue-500 to-cyan-600',
              bgGradient: 'from-blue-500/10 to-cyan-500/10',
              description: 'Aguardando processamento',
              delay: 0
            },
            {
              title: 'Enviados (30d)',
              value: stats.history?.total_sent || 0,
              icon: MessageSquare,
              gradient: 'from-green-500 to-emerald-600',
              bgGradient: 'from-green-500/10 to-emerald-500/10',
              description: 'Follow-ups enviados',
              delay: 0.1
            },
            {
              title: 'Taxa de Resposta',
              value: `${stats.history?.total_sent > 0 
                ? Math.round((stats.history.responses / stats.history.total_sent) * 100) 
                : 0}%`,
              icon: TrendingUp,
              gradient: 'from-purple-500 to-pink-600',
              bgGradient: 'from-purple-500/10 to-pink-500/10',
              description: 'Clientes que responderam',
              delay: 0.2
            },
            {
              title: 'Processados',
              value: stats.queue?.completed || 0,
              icon: CheckCircle,
              gradient: 'from-orange-500 to-red-600',
              bgGradient: 'from-orange-500/10 to-red-500/10',
              description: 'Análises concluídas',
              delay: 0.3
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + stat.delay }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`card-glass relative overflow-hidden p-6 bg-gradient-to-br ${stat.bgGradient} border border-white/10 cursor-pointer group`}
            >
              {/* Background pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <motion.div 
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className={`w-full h-full bg-gradient-to-br ${stat.gradient} rounded-full transform rotate-12 translate-x-8 -translate-y-8`}
                />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </motion.div>
                  
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
                    className="w-2 h-2 bg-gradient-to-r from-white to-gray-300 rounded-full opacity-70"
                  />
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-2 group-hover:text-gray-300 transition-colors">
                    {stat.title}
                  </p>
                  <motion.p 
                    key={stat.value}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-3xl font-bold text-white mb-2 group-hover:text-white/90 transition-colors"
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                    {stat.description}
                  </p>
                </div>
              </div>
              
              {/* Hover effect border */}
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary-500/30 transition-colors duration-300"
                whileHover={{ 
                  boxShadow: `0 0 30px ${index % 4 === 0 ? 'rgba(59, 130, 246, 0.3)' : 
                                       index % 4 === 1 ? 'rgba(34, 197, 94, 0.3)' :
                                       index % 4 === 2 ? 'rgba(168, 85, 247, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`
                }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs Modernizados */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="relative"
      >
        <div className="flex space-x-2 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-xl p-2 backdrop-blur-sm border border-white/10">
          {[
            { key: 'settings', label: 'Configurações', icon: Settings, gradient: 'from-cyan-500 to-blue-600' },
            { key: 'stats', label: 'Estatísticas', icon: BarChart3, gradient: 'from-purple-500 to-pink-600' }
          ].map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative flex items-center space-x-3 px-6 py-3 rounded-lg transition-all duration-300 font-medium
                ${activeTab === tab.key 
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg shadow-primary-500/25` 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <motion.div
                whileHover={{ rotate: 5 }}
                className="relative z-10"
              >
                <tab.icon className="w-5 h-5" />
              </motion.div>
              <span className="relative z-10">{tab.label}</span>
              
              {activeTab === tab.key && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-white rounded-full ml-auto"
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Enable/Disable Modernizado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            className="card-glass relative overflow-hidden p-8 bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/20"
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-40 h-40 opacity-5">
              <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-600 rounded-full transform rotate-45 translate-x-10 -translate-y-10" />
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg"
                >
                  <Activity className="w-7 h-7 text-white" />
                </motion.div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
                    <span>Status do Follow-up</span>
                    {settings.enabled && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30"
                      >
                        ATIVO
                      </motion.div>
                    )}
                  </h3>
                  <p className="text-gray-400">
                    {settings.enabled 
                      ? 'Sistema funcionando e processando conversas automaticamente' 
                      : 'Sistema pausado - nenhum follow-up será enviado'
                    }
                  </p>
                </div>
              </div>
              
              <motion.button
                onClick={handleToggleEnabled}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 shadow-lg
                  ${settings.enabled 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30' 
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 shadow-gray-500/30'
                  }
                `}
              >
                <motion.span
                  animate={{
                    x: settings.enabled ? 32 : 4,
                    backgroundColor: settings.enabled ? '#ffffff' : '#d1d5db'
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="inline-block h-6 w-6 transform rounded-full shadow-lg"
                />
                
                {/* Icons inside toggle */}
                <motion.div
                  animate={{ opacity: settings.enabled ? 1 : 0 }}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                </motion.div>
                <motion.div
                  animate={{ opacity: settings.enabled ? 0 : 1 }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                >
                  <Pause className="w-4 h-4 text-gray-400" />
                </motion.div>
              </motion.button>
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
        </motion.div>
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
    </motion.div>
  )
}

export default FollowUp