import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { SocketProvider } from './contexts/SocketContext'
import { AppProvider } from './contexts/AppContext'
import Layout from './components/Layout/Layout'

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const WhatsApp = lazy(() => import('./pages/WhatsApp'))
const Settings = lazy(() => import('./pages/Settings'))
const Contacts = lazy(() => import('./pages/Contacts'))
const AudioResponses = lazy(() => import('./pages/AudioResponses'))
const ExternalNotifications = lazy(() => import('./pages/ExternalNotifications'))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="glass rounded-2xl p-8 flex flex-col items-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
      <p className="text-sm text-gray-300">Carregando...</p>
    </div>
  </div>
)

function App() {
  return (
    <Router>
      <AppProvider>
        <SocketProvider>
          <div className="min-h-screen bg-dark-gradient text-white">
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/whatsapp" element={<WhatsApp />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/audio-responses" element={<AudioResponses />} />
                  <Route path="/external-notifications" element={<ExternalNotifications />} />
                </Routes>
              </Suspense>
            </Layout>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#fff',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </SocketProvider>
      </AppProvider>
    </Router>
  )
}

export default App