import axios from 'axios'
import toast from 'react-hot-toast'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error)
    
    let message = 'Erro de conexão com o servidor'
    
    if (error.response) {
      // Server responded with error status
      switch (error.response.status) {
        case 400:
          message = error.response.data.message || 'Dados inválidos'
          break
        case 401:
          message = 'Não autorizado'
          break
        case 403:
          message = 'Acesso negado'
          break
        case 404:
          message = 'Não encontrado'
          break
        case 429:
          message = 'Muitas requisições. Tente novamente em alguns minutos.'
          break
        case 500:
          message = 'Erro interno do servidor'
          break
        default:
          message = error.response.data.message || 'Erro desconhecido'
      }
    } else if (error.request) {
      // Request made but no response
      message = 'Servidor não está respondendo'
    }
    
    // Don't show toast for certain endpoints
    const silentEndpoints = ['/dashboard/overview', '/whatsapp/status']
    const shouldShowToast = !silentEndpoints.some(endpoint => 
      error.config?.url?.includes(endpoint)
    )
    
    if (shouldShowToast) {
      toast.error(message)
    }
    
    return Promise.reject(error)
  }
)

export default api