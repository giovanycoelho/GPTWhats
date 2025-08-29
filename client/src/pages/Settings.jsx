import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Key, Bot, Volume2, Smile, Phone, Clock, Brain, User, Contact, RefreshCw, Inbox } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import toast from 'react-hot-toast'
import SettingsSection from '../components/Settings/SettingsSection'
import SettingsInput from '../components/Settings/SettingsInput'
import SettingsToggle from '../components/Settings/SettingsToggle'
import SettingsSelect from '../components/Settings/SettingsSelect'
import PromptModal from '../components/Settings/PromptModal'

const Settings = () => {
  const { state, updateConfig, updateMultipleConfigs } = useApp()
  const [saving, setSaving] = useState(false)
  const [localConfigs, setLocalConfigs] = useState(state.configs)
  const [promptModalOpen, setPromptModalOpen] = useState(false)

  // Reasoning effort options
  const reasoningEffortOptions = [
    { 
      value: 'minimal', 
      label: 'Mínimo', 
      description: 'Respostas rápidas e diretas. Ideal para conversas casuais e respostas simples.' 
    },
    { 
      value: 'low', 
      label: 'Baixo', 
      description: 'Pensamento básico, ainda rápido. Bom equilíbrio entre velocidade e qualidade.' 
    },
    { 
      value: 'medium', 
      label: 'Médio', 
      description: 'Bem elaborado, mais tempo. Para respostas mais detalhadas e reflexivas.' 
    },
    { 
      value: 'high', 
      label: 'Alto', 
      description: 'Máxima reflexão, mais lento. Para questões complexas que exigem análise profunda.' 
    }
  ]

  // Update local state when global state changes, but preserve non-masked API key
  React.useEffect(() => {
    setLocalConfigs(prev => {
      const newConfigs = { ...state.configs }
      
      // If API key is masked and we have a real value locally, keep the local value
      if (newConfigs.openai_api_key && newConfigs.openai_api_key.includes('*') && 
          prev.openai_api_key && !prev.openai_api_key.includes('*')) {
        newConfigs.openai_api_key = prev.openai_api_key
      }
      
      return newConfigs
    })
  }, [state.configs])

  const handleInputChange = (key, value) => {
    setLocalConfigs(prev => ({ ...prev, [key]: value }))
    
    // Auto-save for most settings, but avoid saving masked API keys
    if (key !== 'openai_api_key' && key !== 'system_prompt') {
      updateConfig(key, value)
    } else if (key === 'openai_api_key' && !value.includes('*')) {
      // Only update local state if it's not a masked value
      setLocalConfigs(prev => ({ ...prev, [key]: value }))
    }
  }

  // Helper function to convert string config values to boolean
  const getBooleanValue = (configKey) => {
    const value = localConfigs[configKey]
    return value === 'true' || value === true
  }

  // Helper function to handle boolean toggle changes
  const handleBooleanChange = (key, booleanValue) => {
    const stringValue = booleanValue.toString()
    handleInputChange(key, stringValue)
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      
      // Filter out masked API key to prevent it from being saved
      const configsToSave = { ...localConfigs }
      if (configsToSave.openai_api_key && configsToSave.openai_api_key.includes('*')) {
        delete configsToSave.openai_api_key
      }
      
      const success = await updateMultipleConfigs(configsToSave)
      if (success) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        toast.error('Erro ao salvar configurações')
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSingle = async (key) => {
    try {
      // Don't save masked API key
      if (key === 'openai_api_key' && localConfigs[key] && localConfigs[key].includes('*')) {
        toast.error('API key está mascarada. Digite uma nova chave válida.')
        return
      }
      
      const success = await updateConfig(key, localConfigs[key])
      if (success) {
        toast.success('Configuração salva!')
      } else {
        toast.error('Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
          <p className="text-gray-400">
            Configure seu bot de IA para WhatsApp
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn-primary flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Salvando...' : 'Salvar Tudo'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OpenAI Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SettingsSection
            title="Configuração da OpenAI"
            description="Configure sua chave API para usar o GPT-5 Mini"
            icon={Key}
            iconColor="text-primary-500"
          >
            <div className="space-y-4">
              <SettingsInput
                label="Chave API OpenAI"
                value={localConfigs.openai_api_key}
                onChange={(value) => handleInputChange('openai_api_key', value)}
                placeholder={state.configs.openai_api_key_exists ? "Chave já configurada" : "sk-..."}
                type="password"
                hint={`Sua chave API da OpenAI. Usaremos o modelo GPT-5 Mini. ${state.configs.openai_api_key_exists ? '(Já configurada)' : ''}`}
                onSave={() => handleSaveSingle('openai_api_key')}
              />
              
              <div className="text-xs text-gray-500 bg-gray-800/50 p-3 rounded-lg">
                <p className="mb-2"><strong>Como obter sua chave API:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Acesse <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">platform.openai.com/api-keys</a></li>
                  <li>Faça login em sua conta OpenAI</li>
                  <li>Clique em "Create new secret key"</li>
                  <li>Copie e cole aqui sua chave</li>
                </ol>
              </div>
            </div>
          </SettingsSection>
        </motion.div>

        {/* AI Behavior */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SettingsSection
            title="Comportamento da IA"
            description="Configure como a IA deve se comportar"
            icon={Bot}
            iconColor="text-success-500"
          >
            <div className="space-y-4">
              <SettingsInput
                label="Prompt do Sistema"
                value={localConfigs.system_prompt}
                onChange={(value) => handleInputChange('system_prompt', value)}
                placeholder="Você é um assistente útil..."
                type="textarea"
                rows={4}
                hint="Define a personalidade e comportamento da IA (máximo 50.000 caracteres)"
                onSave={() => handleSaveSingle('system_prompt')}
                onExpand={() => setPromptModalOpen(true)}
              />
              
              <SettingsInput
                label="Comprimento Máximo da Resposta"
                value={localConfigs.max_response_length}
                onChange={(value) => handleInputChange('max_response_length', value)}
                type="number"
                min="50"
                max="1000"
                hint="Número máximo de caracteres por resposta"
              />
            </div>
          </SettingsSection>
        </motion.div>

        {/* AI Quality Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SettingsSection
            title="Qualidade de Resposta"
            description="Configure a qualidade e velocidade das respostas do GPT-5 Mini"
            icon={Brain}
            iconColor="text-purple-500"
          >
            <div className="space-y-4">
              <SettingsSelect
                label="Nível de Reflexão"
                value={localConfigs.reasoning_effort || 'minimal'}
                onChange={(value) => handleInputChange('reasoning_effort', value)}
                options={reasoningEffortOptions}
                showDescriptions={true}
                hint="Controla quanta 'reflexão' o GPT-5 Mini aplica antes de responder. Níveis mais altos resultam em respostas mais elaboradas, mas levam mais tempo."
              />
              
              <SettingsToggle
                label="Validação Rigorosa de Respostas"
                description="Ativar validação automática para garantir que a IA siga o prompt configurado"
                value={getBooleanValue('response_validation_enabled')}
                onChange={(value) => handleBooleanChange('response_validation_enabled', value)}
                icon={Brain}
              />
              
              <div className="text-xs text-gray-500 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-purple-300">Como funciona o Reasoning Effort</span>
                </div>
                <p className="mb-2">O GPT-5 Mini usa um sistema de "raciocínio em cadeia" onde pode pensar antes de responder:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li><strong>Mínimo:</strong> Resposta imediata (~1-2s) - Perfeito para WhatsApp</li>
                  <li><strong>Baixo:</strong> Pensamento rápido (~3-5s) - Respostas mais contextualizadas</li>
                  <li><strong>Médio:</strong> Análise moderada (~5-10s) - Para perguntas complexas</li>
                  <li><strong>Alto:</strong> Reflexão profunda (~10-30s) - Para tarefas analíticas</li>
                </ul>
                <p className="mt-2 text-purple-300"><strong>Recomendado:</strong> Use "Mínimo" para conversas rápidas no WhatsApp ou "Baixo" para um pouco mais de qualidade.</p>
                
                <div className="mt-4 pt-3 border-t border-purple-500/20">
                  <p className="mb-2 text-purple-300 font-semibold">🛡️ Validação Rigorosa de Respostas</p>
                  <p className="text-xs text-gray-400">Quando ativada, todas as respostas passam por uma validação automática que:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-500 text-xs ml-2">
                    <li>Verifica se a IA está seguindo seu prompt configurado</li>
                    <li>Detecta quando a IA inventa informações não fornecidas</li>
                    <li>Corrige automaticamente respostas fora do contexto</li>
                    <li>Garante limite de caracteres sempre respeitado</li>
                  </ul>
                  <p className="mt-2 text-xs text-yellow-400"><strong>⚠️ Importante:</strong> Pode aumentar ligeiramente o tempo de resposta, mas garante maior fidelidade ao prompt.</p>
                </div>
              </div>
            </div>
          </SettingsSection>
        </motion.div>

        {/* Timing Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SettingsSection
            title="Configurações de Tempo"
            description="Configure delays e timing das respostas"
            icon={Clock}
            iconColor="text-warning-500"
          >
            <div className="space-y-4">
              <SettingsInput
                label="Delay de Resposta (segundos)"
                value={localConfigs.response_delay ? Math.round(localConfigs.response_delay / 1000) : 10}
                onChange={(value) => handleInputChange('response_delay', value * 1000)}
                type="number"
                min="1"
                max="60"
                step="1"
                hint="Tempo para aguardar antes de processar mensagens (recomendado: 10 segundos)"
              />
              
              <div className="text-xs text-gray-500 bg-gray-800/50 p-3 rounded-lg">
                <p><strong>Como funciona:</strong> O sistema aguarda este tempo antes de processar mensagens. Se chegarem várias mensagens neste período, elas serão processadas juntas em uma única resposta, tornando a conversa mais natural.</p>
              </div>
            </div>
          </SettingsSection>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <SettingsSection
            title="Recursos"
            description="Ative ou desative funcionalidades"
            icon={Volume2}
            iconColor="text-blue-500"
          >
            <div className="space-y-4">
              <SettingsToggle
                label="Resposta por Áudio"
                description="Responder com áudio quando receber áudio"
                value={getBooleanValue('audio_enabled')}
                onChange={(value) => handleBooleanChange('audio_enabled', value)}
                icon={Volume2}
              />
              
              <SettingsToggle
                label="Usar Emojis"
                description="Adicionar emojis naturalmente nas respostas"
                value={getBooleanValue('emoji_enabled')}
                onChange={(value) => handleBooleanChange('emoji_enabled', value)}
                icon={Smile}
              />
              
              <SettingsToggle
                label="Personalizar com Nome do Cliente"
                description="Usar o nome do WhatsApp do cliente nas respostas de forma natural"
                value={getBooleanValue('use_client_name')}
                onChange={(value) => handleBooleanChange('use_client_name', value)}
                icon={User}
              />
              
              <SettingsToggle
                label="Enviar Contatos como Cards"
                description="Enviar números de telefone no formato de cartão do WhatsApp"
                value={getBooleanValue('contact_card_enabled')}
                onChange={(value) => handleBooleanChange('contact_card_enabled', value)}
                icon={Contact}
              />

              <SettingsToggle
                label="Recuperação Inteligente"
                description="Ativar recuperação inteligente de conversas perdidas na conexão"
                value={getBooleanValue('smart_recovery_enabled')}
                onChange={(value) => handleBooleanChange('smart_recovery_enabled', value)}
                icon={RefreshCw}
              />

              <SettingsToggle
                label="Mensagens Pendentes"
                description="Processar mensagens pendentes automaticamente na conexão"
                value={getBooleanValue('pending_messages_enabled')}
                onChange={(value) => handleBooleanChange('pending_messages_enabled', value)}
                icon={Inbox}
              />
            </div>
          </SettingsSection>
        </motion.div>

        {/* Call Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <SettingsSection
            title="Gerenciamento de Chamadas"
            description="Configure como lidar com chamadas"
            icon={Phone}
            iconColor="text-error-500"
          >
            <div className="space-y-4">
              <SettingsToggle
                label="Rejeitar Chamadas"
                description="Rejeitar chamadas automaticamente após 3 segundos"
                value={getBooleanValue('call_rejection_enabled')}
                onChange={(value) => handleBooleanChange('call_rejection_enabled', value)}
                icon={Phone}
              />
              
              {localConfigs.call_rejection_enabled === 'true' && (
                <SettingsInput
                  label="Mensagem de Rejeição"
                  value={localConfigs.call_rejection_message}
                  onChange={(value) => handleInputChange('call_rejection_message', value)}
                  placeholder="Desculpe, não posso atender chamadas..."
                  type="textarea"
                  rows={2}
                  hint="Mensagem enviada após rejeitar uma chamada"
                />
              )}
            </div>
          </SettingsSection>
        </motion.div>
      </div>

      {/* Save All Button (Bottom) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="flex justify-center pt-6 border-t border-white/10"
      >
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn-primary flex items-center space-x-2 text-lg px-8 py-3"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Salvando Configurações...' : 'Salvar Todas as Configurações'}</span>
        </button>
      </motion.div>

      {/* Prompt Modal */}
      <PromptModal
        isOpen={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        value={localConfigs.system_prompt}
        onChange={(value) => handleInputChange('system_prompt', value)}
        onSave={() => handleSaveSingle('system_prompt')}
        title="Editar Prompt do Sistema"
      />
    </div>
  )
}

export default Settings