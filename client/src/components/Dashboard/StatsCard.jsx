import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

const StatsCard = ({ title, value, change, trend, icon: Icon, gradient, bgGradient }) => {
  const isPositiveTrend = trend && trend.includes('+')
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`card-glass relative overflow-hidden p-6 bg-gradient-to-br ${bgGradient} border border-white/10 cursor-pointer group`}
    >
      {/* Animated gradient overlay */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-5 transition-all duration-500`}
        whileHover={{ scale: 1.1 }}
      />
      
      {/* Background pattern */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
        <motion.div 
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={`w-full h-full bg-gradient-to-br ${gradient} rounded-full transform rotate-12 translate-x-8 -translate-y-8`}
        />
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`p-3 rounded-xl bg-gradient-to-r ${gradient} shadow-lg`}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
          
          {trend && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`flex items-center space-x-1 text-xs font-medium ${
                isPositiveTrend ? 'text-green-400' : 'text-red-400'
              } bg-black/20 px-2 py-1 rounded-full`}
            >
              {isPositiveTrend ? 
                <TrendingUp className="w-3 h-3" /> : 
                <TrendingDown className="w-3 h-3" />
              }
              <span>{trend}</span>
            </motion.div>
          )}
        </div>
        
        {/* Content */}
        <div>
          <p className="text-gray-400 text-sm font-medium mb-2 group-hover:text-gray-300 transition-colors">
            {title}
          </p>
          <motion.div
            key={value}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <p className="text-3xl font-bold text-white mb-2 group-hover:text-white/90 transition-colors">
              {value}
            </p>
          </motion.div>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors"
          >
            {change}
          </motion.p>
        </div>
      </div>
      
      {/* Hover effect border */}
      <motion.div
        className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary-500/30 transition-colors duration-300"
        whileHover={{ 
          boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" 
        }}
      />
    </motion.div>
  )
}

export default StatsCard