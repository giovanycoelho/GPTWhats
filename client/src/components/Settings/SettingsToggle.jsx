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
      
      <button
        onClick={() => onChange(!value)}
        className={clsx(
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900',
          value ? 'bg-primary-600' : 'bg-gray-600'
        )}
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
          className="inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
        />
      </button>
    </div>
  )
}

export default SettingsToggle