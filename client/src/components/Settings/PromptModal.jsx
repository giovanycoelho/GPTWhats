import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Maximize2 } from 'lucide-react'

const PromptModal = ({ isOpen, onClose, value, onChange, onSave, title = "Editar Prompt" }) => {
  const [localValue, setLocalValue] = useState(value || '')
  const [saving, setSaving] = useState(false)
  
  const MAX_CHARACTERS = 50000

  useEffect(() => {
    setLocalValue(value || '')
  }, [value])

  const handleChange = (e) => {
    const newValue = e.target.value
    if (newValue.length <= MAX_CHARACTERS) {
      setLocalValue(newValue)
    }
  }

  const getCharacterCountColor = () => {
    const percentage = localValue.length / MAX_CHARACTERS
    if (percentage >= 0.9) return 'text-red-400'
    if (percentage >= 0.75) return 'text-yellow-400'
    return 'text-gray-400'
  }

  const handleSave = async () => {
    if (onSave) {
      setSaving(true)
      onChange(localValue)
      await onSave()
      setSaving(false)
      onClose()
    }
  }

  const handleClose = () => {
    setLocalValue(value || '') // Reset to original value
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl h-[80vh] bg-dark-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <Maximize2 className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 p-6 flex flex-col">
            <textarea
              value={localValue}
              onChange={handleChange}
              placeholder="Digite seu prompt aqui..."
              className="flex-1 w-full p-4 glass-dark text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors rounded-xl"
              style={{ minHeight: '400px' }}
            />
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className={getCharacterCountColor()}>
                  Caracteres: {localValue.length} / {MAX_CHARACTERS}
                </div>
                <div className="text-gray-500">
                  Aproximadamente {Math.ceil(localValue.length / 3.5)} tokens
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    localValue.length / MAX_CHARACTERS >= 0.9 ? 'bg-red-400' :
                    localValue.length / MAX_CHARACTERS >= 0.75 ? 'bg-yellow-400' : 
                    'bg-primary-500'
                  }`}
                  style={{ width: `${(localValue.length / MAX_CHARACTERS) * 100}%` }}
                />
              </div>
              
              {localValue.length / MAX_CHARACTERS >= 0.9 && (
                <p className="text-xs text-red-400">
                  ⚠️ Você está próximo do limite de 50.000 caracteres.
                </p>
              )}
              
              {localValue.length >= 20000 && localValue.length / MAX_CHARACTERS < 0.9 && (
                <p className="text-xs text-yellow-400">
                  💡 Prompt extenso detectado. Perfeito para configurações detalhadas!
                </p>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-white/10">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default PromptModal