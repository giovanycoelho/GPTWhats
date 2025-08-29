import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Save, 
  Key, 
  Bot, 
  Volume2, 
  Smile, 
  Phone, 
  Clock, 
  Brain, 
  User, 
  Contact, 
  RefreshCw, 
  Inbox,
  Settings as SettingsIcon,
  Zap,
  MessageSquare,
  Shield,
  Sparkles,
  Palette,
  ChevronRight,
  Check,
  X
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import toast from 'react-hot-toast'
import PromptModal from '../components/Settings/PromptModal'

const Settings = () => {
  const { state, updateConfig, updateMultipleConfigs } = useApp()
  const [saving, setSaving] = useState(false)
  const [localConfigs, setLocalConfigs] = useState(state.configs)
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('ai')

  // Reasoning effort options
  const reasoningEffortOptions = [
    { 
      value: 'minimal', 
      label: 'Mínimo', 
      description: 'Respostas rápidas e diretas. Ideal para conversas casuais e respostas simples.',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      value: 'low', 
      label: 'Baixo', 
      description: 'Pensamento básico, ainda rápido. Bom equilíbrio entre velocidade e qualidade.',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      value: 'medium', 
      label: 'Médio', 
      description: 'Bem elaborado, mais tempo. Para respostas mais detalhadas e reflexivas.',
      color: 'from-purple-500 to-violet-500'
    },
    { 
      value: 'high', 
      label: 'Alto', 
      description: 'Máxima reflexão, mais lento. Para questões complexas que exigem análise profunda.',
      color: 'from-orange-500 to-red-500'
    }
  ]

  // Voice options
  const voiceOptions = [
    { value: 'alloy', label: 'Alloy - Neutra e equilibrada', emoji: '🤖' },
    { value: 'echo', label: 'Echo - Masculina e clara', emoji: '👨' },
    { value: 'fable', label: 'Fable - Britânica elegante', emoji: '🎩' },
    { value: 'onyx', label: 'Onyx - Profunda e grave', emoji: '🎭' },
    { value: 'nova', label: 'Nova - Jovem e energética', emoji: '⚡' },
    { value: 'shimmer', label: 'Shimmer - Suave e calorosa', emoji: '✨' }
  ]

  // Update local state when global state changes, but preserve non-masked API key
  React.useEffect(() => {
    setLocalConfigs(prev => {
      const newConfigs = { ...state.configs }
      
      if (newConfigs.openai_api_key && newConfigs.openai_api_key.includes('*') && 
          prev.openai_api_key && !prev.openai_api_key.includes('*')) {
        newConfigs.openai_api_key = prev.openai_api_key
      }
      
      return newConfigs
    })
  }, [state.configs])

  const handleInputChange = (key, value) => {
    setLocalConfigs(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleBooleanChange = (key, value) => {
    setLocalConfigs(prev => ({
      ...prev,
      [key]: value ? 'true' : 'false'
    }))
  }

  const getBooleanValue = (key) => {
    return localConfigs[key] === 'true'
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateMultipleConfigs(localConfigs)
      toast.success('✅ Configurações salvas com sucesso!')
    } catch (error) {
      toast.error('❌ Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPrompt = () => {
    const defaultPrompt = "Você é um assistente de atendimento ao cliente profissional e amigável de uma empresa de materiais de construção..."
    handleInputChange('system_prompt', defaultPrompt)
    toast.success('Prompt resetado para o padrão')
  }

  // Navigation sections
  const sections = [
    {
      id: 'ai',
      title: 'Inteligência Artificial',
      icon: Bot,
      color: 'from-blue-500 to-purple-600',
      description: 'Configurações da IA e comportamento'
    },
    {
      id: 'audio',
      title: 'Áudio & Voz',
      icon: Volume2,
      color: 'from-green-500 to-teal-600',
      description: 'Configurações de áudio e TTS'
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      icon: MessageSquare,
      color: 'from-emerald-500 to-cyan-600',
      description: 'Configurações do WhatsApp'
    },
    {
      id: 'advanced',
      title: 'Avançado',
      icon: Shield,
      color: 'from-purple-500 to-pink-600',
      description: 'Configurações avançadas'
    }
  ]

  const ModernToggle = ({ checked, onChange, label, description, icon: Icon, disabled = false }) => (
    <motion.div 
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {Icon && (
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl">
              <Icon className="w-5 h-5 text-blue-400" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{label}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="ml-6">
          <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              checked
                ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                : 'bg-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
                checked ? 'translate-x-7' : 'translate-x-1'
              }`}
            >
              {checked ? (
                <Check className="w-4 h-4 text-green-600 m-1" />
              ) : (
                <X className="w-4 h-4 text-red-600 m-1" />
              )}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  )

  const ModernInput = ({ label, value, onChange, placeholder, type = "text", icon: Icon, description }) => (
    <motion.div 
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start space-x-4">
        {Icon && (
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
        )}
        <div className="flex-1">
          <label className="block text-lg font-semibold text-white mb-2">{label}</label>
          {description && (
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">{description}</p>
          )}
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </div>
    </motion.div>
  )

  const ModernSelect = ({ label, value, onChange, options, icon: Icon, description }) => (
    <motion.div 
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start space-x-4">
        {Icon && (
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
        )}
        <div className="flex-1">
          <label className="block text-lg font-semibold text-white mb-2">{label}</label>
          {description && (
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">{description}</p>
          )}
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-gray-900">
                {option.emoji && `${option.emoji} `}{option.label}
              </option>
            ))}
          </select>
          {value && options.find(opt => opt.value === value)?.description && (
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
              {options.find(opt => opt.value === value).description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )

  const renderAISection = () => (
    <div className="space-y-6">
      <ModernInput
        label="Chave API OpenAI"
        value={localConfigs.openai_api_key}
        onChange={(value) => handleInputChange('openai_api_key', value)}
        placeholder="sk-..."
        type="password"
        icon={Key}
        description="Sua chave da API OpenAI para GPT-5 Mini e outras funcionalidades de IA"
      />

      <motion.div 
        className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300"
        whileHover={{ y: -2 }}
      >
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-xl">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Prompt do Sistema</h3>
                <p className="text-gray-400 text-sm">Defina a personalidade e comportamento da IA</p>
              </div>
              <div className="flex space-x-3">
                <motion.button
                  onClick={() => setPromptModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✏️ Editar
                </motion.button>
                <motion.button
                  onClick={handleResetPrompt}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🔄 Resetar
                </motion.button>
              </div>
            </div>
            <div className="bg-gray-900/50 border border-gray-600 rounded-xl p-4 max-h-24 overflow-y-auto">
              <p className="text-gray-300 text-sm leading-relaxed">
                {localConfigs.system_prompt?.substring(0, 200)}
                {localConfigs.system_prompt?.length > 200 && '...'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <ModernSelect
        label="Nível de Raciocínio"
        value={localConfigs.reasoning_effort}
        onChange={(value) => handleInputChange('reasoning_effort', value)}
        options={reasoningEffortOptions}
        icon={Brain}
        description="Controla a profundidade de análise da IA nas respostas"
      />

      <ModernInput
        label="Comprimento Máximo da Resposta"
        value={localConfigs.max_response_length}
        onChange={(value) => handleInputChange('max_response_length', value)}
        placeholder="200"
        type="number"
        icon={MessageSquare}
        description="Limite de caracteres para as respostas da IA (recomendado: 200-500)"
      />

      <ModernToggle
        label="Usar Nome do Cliente"
        description="Personalizar respostas usando o nome do WhatsApp do cliente"
        checked={getBooleanValue('use_client_name')}
        onChange={(value) => handleBooleanChange('use_client_name', value)}
        icon={User}
      />

      <ModernToggle
        label="Validação Rigorosa de Respostas"
        description="Ativar sistema avançado de validação para garantir que a IA siga o prompt configurado"
        checked={getBooleanValue('strict_response_validation')}
        onChange={(value) => handleBooleanChange('strict_response_validation', value)}
        icon={Shield}
      />
    </div>
  )

  const renderAudioSection = () => (
    <div className="space-y-6">
      <ModernToggle
        label="Respostas em Áudio"
        description="Enviar respostas como mensagens de voz quando o cliente enviar áudio"
        checked={getBooleanValue('audio_enabled')}
        onChange={(value) => handleBooleanChange('audio_enabled', value)}
        icon={Volume2}
      />

      <ModernSelect
        label="Voz para Áudio"
        value={localConfigs.tts_voice}
        onChange={(value) => handleInputChange('tts_voice', value)}
        options={voiceOptions}
        icon={Sparkles}
        description="Escolha a voz que será usada nas respostas em áudio"
      />
    </div>
  )

  const renderWhatsAppSection = () => (
    <div className="space-y-6">
      <ModernToggle
        label="Cards para Links WhatsApp"
        description="Enviar links do WhatsApp (wa.me/xxxxx) como cartões de contato. Números normais sempre são enviados como texto."
        checked={getBooleanValue('contact_card_enabled')}
        onChange={(value) => handleBooleanChange('contact_card_enabled', value)}
        icon={Contact}
      />

      <ModernToggle
        label="Recuperação Inteligente"
        description="Ativar recuperação inteligente de conversas perdidas na conexão"
        checked={getBooleanValue('smart_recovery_enabled')}
        onChange={(value) => handleBooleanChange('smart_recovery_enabled', value)}
        icon={RefreshCw}
      />

      <ModernToggle
        label="Mensagens Pendentes"
        description="Reenviar mensagens que falharam durante desconexões"
        checked={getBooleanValue('pending_messages_enabled')}
        onChange={(value) => handleBooleanChange('pending_messages_enabled', value)}
        icon={Inbox}
      />
    </div>
  )

  const renderAdvancedSection = () => (
    <div className="space-y-6">
      <ModernInput
        label="Delay entre Mensagens (segundos)"
        value={localConfigs.message_delay ? Math.round(localConfigs.message_delay / 1000) : ''}
        onChange={(value) => handleInputChange('message_delay', value * 1000)}
        placeholder="1"
        type="number"
        min="0"
        step="0.1"
        icon={Clock}
        description="Tempo que a IA aguarda para processar todas as mensagens recebidas juntas antes de responder"
      />

      <ModernToggle
        label="Emojis Automáticos"
        description="Permitir que a IA adicione emojis automaticamente às respostas"
        checked={getBooleanValue('emoji_enabled')}
        onChange={(value) => handleBooleanChange('emoji_enabled', value)}
        icon={Smile}
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-3xl"></div>
        <div className="relative px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                <SettingsIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Configurações</h1>
                <p className="text-xl text-gray-300">Personalize o comportamento da IA e funcionalidades</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 pb-12">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-80 space-y-4">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              
              return (
                <motion.button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? 'bg-gray-800/80 border-gray-600 shadow-lg'
                      : 'bg-gray-800/40 border-gray-700 hover:bg-gray-800/60 hover:border-gray-600'
                  }`}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${section.color}/20`}>
                        <Icon className={`w-5 h-5 text-white`} />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-lg">{section.title}</h3>
                        <p className="text-gray-400 text-sm">{section.description}</p>
                      </div>
                    </div>
                    <ChevronRight 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        isActive ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>
                </motion.button>
              )
            })}

            {/* Save Button */}
            <motion.button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-8 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center space-x-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Salvar Configurações</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {activeSection === 'ai' && renderAISection()}
              {activeSection === 'audio' && renderAudioSection()}
              {activeSection === 'whatsapp' && renderWhatsAppSection()}
              {activeSection === 'advanced' && renderAdvancedSection()}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Prompt Modal */}
      <PromptModal
        isOpen={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        value={localConfigs.system_prompt || ''}
        onSave={() => {
          setPromptModalOpen(false)
          toast.success('✅ Prompt atualizado!')
        }}
        onChange={(newPrompt) => handleInputChange('system_prompt', newPrompt)}
        title="Editar Prompt do Sistema"
      />
    </div>
  )
}

export default Settings