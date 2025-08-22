import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

const StatsCard = ({ title, value, change, icon: Icon, color, bgColor }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="card-glass p-6 relative overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-white mb-2">{value}</p>
          <p className="text-xs text-gray-500">{change}</p>
        </div>
        
        <div className={clsx('p-3 rounded-xl', bgColor)}>
          <Icon className={clsx('w-6 h-6', color)} />
        </div>
      </div>
      
      {/* Background decoration */}
      <div className={clsx(
        'absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-5',
        bgColor.replace('/10', '')
      )} />
    </motion.div>
  )
}

export default StatsCard