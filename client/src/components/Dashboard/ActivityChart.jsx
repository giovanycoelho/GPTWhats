import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Calendar } from 'lucide-react'
import { api } from '../../utils/api'

const ActivityChart = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')

  useEffect(() => {
    loadChartData()
  }, [period])

  const loadChartData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/dashboard/activity/chart', {
        params: { days: period === 'week' ? 7 : period === 'month' ? 30 : 7 }
      })
      setData(response.data.chartData || [])
    } catch (error) {
      console.error('Error loading chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-3 border border-white/20 rounded-lg">
          <p className="text-white text-sm font-medium mb-2">
            {formatDate(label)}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="card-glass">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-600/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Atividade</h3>
            <p className="text-gray-400 text-sm">Mensagens e conversas ao longo do tempo</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="glass text-white text-sm px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="week">7 dias</option>
            <option value="month">30 dias</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="rgba(255,255,255,0.6)"
                fontSize={12}
              />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="messages" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Mensagens"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="conversations" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Conversas"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default ActivityChart