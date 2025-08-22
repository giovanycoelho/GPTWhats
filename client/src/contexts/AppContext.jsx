import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { api } from '../utils/api'

const AppContext = createContext()

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// Initial state
const initialState = {
  configs: {
    openai_api_key: '',
    system_prompt: '',
    response_delay: '10000',
    audio_enabled: 'false',
    emoji_enabled: 'true',
    call_rejection_enabled: 'true',
    call_rejection_message: '',
    max_response_length: '200',
    use_client_name: 'true',
    contact_card_enabled: 'true'
  },
  dashboard: {
    overview: null,
    loading: false,
    error: null
  },
  contacts: {
    list: [],
    total: 0,
    loading: false,
    error: null
  },
  loading: false,
  error: null
}

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    
    case 'SET_CONFIGS':
      return { 
        ...state, 
        configs: { ...state.configs, ...action.payload },
        loading: false 
      }
    
    case 'UPDATE_CONFIG':
      return {
        ...state,
        configs: { ...state.configs, [action.payload.key]: action.payload.value }
      }
    
    case 'SET_DASHBOARD_LOADING':
      return {
        ...state,
        dashboard: { ...state.dashboard, loading: action.payload }
      }
    
    case 'SET_DASHBOARD_DATA':
      return {
        ...state,
        dashboard: { ...state.dashboard, overview: action.payload, loading: false, error: null }
      }
    
    case 'SET_DASHBOARD_ERROR':
      return {
        ...state,
        dashboard: { ...state.dashboard, error: action.payload, loading: false }
      }
    
    case 'SET_CONTACTS_LOADING':
      return {
        ...state,
        contacts: { ...state.contacts, loading: action.payload }
      }
    
    case 'SET_CONTACTS':
      return {
        ...state,
        contacts: { 
          ...state.contacts, 
          list: action.payload.contacts,
          total: action.payload.total,
          loading: false,
          error: null
        }
      }
    
    case 'SET_CONTACTS_ERROR':
      return {
        ...state,
        contacts: { ...state.contacts, error: action.payload, loading: false }
      }
    
    default:
      return state
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Load initial data
  useEffect(() => {
    const timer = setTimeout(() => {
      loadConfigs()
      loadDashboard()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  const loadConfigs = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await api.get('/config')
      dispatch({ type: 'SET_CONFIGS', payload: response.data.configs })
    } catch (error) {
      console.error('Error loading configs:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar configurações' })
    }
  }

  const updateConfig = async (key, value) => {
    try {
      await api.put(`/config/${key}`, { value })
      dispatch({ type: 'UPDATE_CONFIG', payload: { key, value } })
      return true
    } catch (error) {
      console.error('Error updating config:', error)
      return false
    }
  }

  const updateMultipleConfigs = async (configs) => {
    try {
      await api.put('/config', { configs })
      dispatch({ type: 'SET_CONFIGS', payload: configs })
      return true
    } catch (error) {
      console.error('Error updating configs:', error)
      return false
    }
  }

  const loadDashboard = async () => {
    try {
      dispatch({ type: 'SET_DASHBOARD_LOADING', payload: true })
      const response = await api.get('/dashboard/overview')
      dispatch({ type: 'SET_DASHBOARD_DATA', payload: response.data.overview })
    } catch (error) {
      console.error('Error loading dashboard:', error)
      dispatch({ type: 'SET_DASHBOARD_ERROR', payload: 'Erro ao carregar dashboard' })
    }
  }

  const loadContacts = async (page = 1, search = '') => {
    try {
      dispatch({ type: 'SET_CONTACTS_LOADING', payload: true })
      const response = await api.get('/contacts', { params: { page, search } })
      dispatch({ type: 'SET_CONTACTS', payload: response.data })
    } catch (error) {
      console.error('Error loading contacts:', error)
      dispatch({ type: 'SET_CONTACTS_ERROR', payload: 'Erro ao carregar contatos' })
    }
  }

  const value = {
    state,
    dispatch,
    // Actions
    loadConfigs,
    updateConfig,
    updateMultipleConfigs,
    loadDashboard,
    loadContacts
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}