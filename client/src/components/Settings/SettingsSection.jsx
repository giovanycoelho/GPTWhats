import React from 'react'
import clsx from 'clsx'

const SettingsSection = ({ title, description, icon: Icon, iconColor, children }) => {
  return (
    <div className="card-glass">
      <div className="flex items-start space-x-4 mb-6">
        <div className={clsx('p-3 rounded-xl bg-white/5', iconColor)}>
          <Icon className={clsx('w-6 h-6', iconColor)} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

export default SettingsSection