import React, { useState } from 'react'
import { Save, Eye, EyeOff, Maximize2 } from 'lucide-react'

const SettingsInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = 'text', 
  hint,
  rows,
  min,
  max,
  step,
  onSave,
  onExpand
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (onSave) {
      setSaving(true)
      await onSave()
      setSaving(false)
    }
  }

  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      
      <div className="relative">
        {type === 'textarea' ? (
          <div className="relative">
            <textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={rows || 3}
              className="input-glass w-full resize-none pr-10"
            />
            {onExpand && (
              <button
                onClick={onExpand}
                className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="Expandir para edição completa"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <input
            type={inputType}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className="input-glass w-full pr-20"
          />
        )}
        
        {/* Password toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        
        {/* Save button for specific inputs */}
        {onSave && type !== 'textarea' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Salvar"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* Save button for textarea */}
      {onSave && type === 'textarea' && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-glass text-sm flex items-center space-x-2"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Salvando...' : 'Salvar'}</span>
        </button>
      )}
      
      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  )
}

export default SettingsInput