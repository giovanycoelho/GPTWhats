import React, { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'

const SettingsSelect = ({ 
  label, 
  value, 
  onChange, 
  options = [],
  hint,
  showDescriptions = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const selectedOption = options.find(option => option.value === value) || options[0]

  const handleSelect = (option) => {
    onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div className="space-y-2 relative">
      <label className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      
      {/* Select Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="input-glass w-full text-left flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <span className="text-white">{selectedOption?.label}</span>
            {selectedOption?.description && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowInfo(!showInfo)
                }}
                className="text-gray-400 hover:text-white transition-colors"
                title="Ver descrição"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-gray-800/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors ${
                  option.value === value ? 'bg-primary-500/20 text-primary-300' : 'text-white'
                } ${option === options[0] ? 'rounded-t-lg' : ''} ${
                  option === options[options.length - 1] ? 'rounded-b-lg' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-400">{option.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info Panel */}
      {showInfo && selectedOption?.description && (
        <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <div className="font-medium text-primary-300 mb-1">{selectedOption.label}</div>
              <div>{selectedOption.description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Descriptions */}
      {showDescriptions && (
        <div className="space-y-3 bg-gray-800/50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Níveis de Reflexão:</h4>
          {options.map((option) => (
            <div 
              key={option.value}
              className={`p-3 rounded-lg border transition-all ${
                option.value === value 
                  ? 'border-primary-500/50 bg-primary-500/10' 
                  : 'border-gray-600/50 bg-gray-700/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">{option.label}</span>
                <span className="text-xs px-2 py-1 rounded bg-gray-600 text-gray-300">
                  {option.value}
                </span>
              </div>
              <p className="text-xs text-gray-400">{option.description}</p>
            </div>
          ))}
        </div>
      )}
      
      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default SettingsSelect