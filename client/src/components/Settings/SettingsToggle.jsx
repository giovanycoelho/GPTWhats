import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

const SettingsToggle = ({ label, description, value, onChange, icon: Icon }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center space-x-3">
        {Icon && (
          <div className="p-2 bg-white/10 rounded-lg">
            <Icon className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div>
          <h4 className="text-white font-medium">{label}</h4>
          {description && (
            <p className="text-gray-400 text-sm">{description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={clsx(
          'text-xs font-medium transition-colors duration-200',
          value ? 'text-gray-400' : 'text-gray-300'
        )}>
          OFF
        </span>
        
        <button
          onClick={() => onChange(!value)}
          className={clsx(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
            value 
              ? 'bg-green-500 border-green-400 focus:ring-green-500' 
              : 'bg-gray-700 border-gray-600 focus:ring-gray-500'
          )}
          title={value ? 'Clique para desativar' : 'Clique para ativar'}
        >
          <motion.span
            initial={false}
            animate={{
              x: value ? 20 : 2
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30
            }}
            className={clsx(
              'inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out',
              value ? 'bg-white' : 'bg-gray-300'
            )}
          />
        </button>
        
        <span className={clsx(
          'text-xs font-medium transition-colors duration-200',
          value ? 'text-green-400' : 'text-gray-400'
        )}>
          ON
        </span>
      </div>
    </div>
  )
}

export default SettingsToggle