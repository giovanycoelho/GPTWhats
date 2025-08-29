import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Volume2, Play, Pause, Download, Save, Check, AlertCircle } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import toast from 'react-hot-toast'

const AudioResponses = () => {
  const { state, updateConfig } = useApp()
  const [selectedVoice, setSelectedVoice] = useState(state.configs.tts_voice || 'alloy')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null)
  const [testText, setTestText] = useState('Olá! Esta é uma demonstração de voz da Patrícia da Premix Concreto.')
  const [isGenerating, setIsGenerating] = useState(false)
  const audioRef = useRef(null)

  // Vozes disponíveis do OpenAI TTS
  const voices = [
    {
      id: 'alloy',
      name: 'Alloy',
      description: 'Voz neutra e equilibrada',
      gender: 'Neutro'
    },
    {
      id: 'echo',
      name: 'Echo',
      description: 'Voz masculina clara',
      gender: 'Masculino'
    },
    {
      id: 'fable',
      name: 'Fable',
      description: 'Voz feminina expressiva',
      gender: 'Feminino'
    },
    {
      id: 'onyx',
      name: 'Onyx',
      description: 'Voz masculina profunda',
      gender: 'Masculino'
    },
    {
      id: 'nova',
      name: 'Nova',
      description: 'Voz feminina jovem e energética',
      gender: 'Feminino'
    },
    {
      id: 'shimmer',
      name: 'Shimmer',
      description: 'Voz feminina suave e calorosa',
      gender: 'Feminino'
    }
  ]

  const handleVoiceSelect = (voiceId) => {
    setSelectedVoice(voiceId)
  }

  const generatePreview = async (voiceId) => {
    try {
      setIsGenerating(true)
      
      const response = await fetch('/api/audio/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testText,
          voice: voiceId
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar preview de áudio')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      setCurrentAudio(audioUrl)
      playAudio(audioUrl)
      
    } catch (error) {
      console.error('Error generating audio preview:', error)
      toast.error('Erro ao gerar preview de áudio')
    } finally {
      setIsGenerating(false)
    }
  }

  const playAudio = (audioUrl) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const handleSaveVoice = async () => {
    try {
      const success = await updateConfig('tts_voice', selectedVoice)
      if (success) {
        toast.success('Voz salva com sucesso!')
      } else {
        toast.error('Erro ao salvar voz')
      }
    } catch (error) {
      toast.error('Erro ao salvar voz')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Respostas em Áudio</h1>
          <p className="text-gray-400">
            Escolha a voz para as respostas em áudio do seu bot
          </p>
        </div>

        <button
          onClick={handleSaveVoice}
          className="btn-primary flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Seleção</span>
        </button>
      </div>

      {/* Test Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-primary-500" />
          <span>Texto de Teste</span>
        </h3>
        
        <div className="space-y-2">
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="input-glass w-full h-24 resize-none"
            placeholder="Digite um texto para testar as vozes..."
            maxLength={200}
          />
          
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              {testText.length}/200 caracteres
            </p>
            <button
              onClick={() => setTestText('Olá! Esta é uma demonstração de voz da Patrícia da Premix Concreto.')}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Restaurar texto padrão
            </button>
          </div>
        </div>
      </motion.div>

      {/* Voice Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6">Vozes Disponíveis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voices.map((voice) => (
            <motion.div
              key={voice.id}
              whileHover={{ scale: 1.02 }}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${selectedVoice === voice.id 
                  ? 'border-primary-500 bg-primary-500/10' 
                  : 'border-white/10 bg-white/5 hover:border-primary-400/50'
                }
              `}
              onClick={() => handleVoiceSelect(voice.id)}
            >
              {/* Selection indicator */}
              {selectedVoice === voice.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <h4 className="font-semibold text-white">{voice.name}</h4>
                <p className="text-sm text-gray-400">{voice.description}</p>
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                  {voice.gender}
                </span>
              </div>

              {/* Preview button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  generatePreview(voice.id)
                }}
                disabled={isGenerating}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm">Gerando...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span className="text-sm">Preview</span>
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Audio Controls */}
      {currentAudio && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Player de Áudio</h3>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => isPlaying ? audioRef.current?.pause() : audioRef.current?.play()}
              className="flex items-center justify-center w-12 h-12 bg-primary-600 hover:bg-primary-700 rounded-full transition-colors duration-200"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </button>
            
            <div className="flex-1">
              <div className="text-white font-medium">Preview de Voz</div>
              <div className="text-gray-400 text-sm">
                {voices.find(v => v.id === selectedVoice)?.name || 'Voz selecionada'}
              </div>
            </div>

            {currentAudio && (
              <a
                href={currentAudio}
                download="voice_preview.mp3"
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Download</span>
              </a>
            )}
          </div>
        </motion.div>
      )}

      {/* Settings Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-white mb-2">Informações sobre Respostas em Áudio</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• As respostas em áudio são geradas apenas quando o cliente envia um áudio</li>
              <li>• A voz selecionada será usada para todas as respostas em áudio</li>
              <li>• Números de telefone e links são enviados separadamente como texto</li>
              <li>• Você pode ativar/desativar respostas em áudio nas Configurações</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        className="hidden"
      />
    </div>
  )
}

export default AudioResponses