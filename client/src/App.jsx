import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { SocketProvider } from './contexts/SocketContext'
import { AppProvider } from './contexts/AppContext'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import WhatsApp from './pages/WhatsApp' 
import Settings from './pages/Settings'
import Contacts from './pages/Contacts'
import AudioResponses from './pages/AudioResponses'

function App() {
  return (
    <Router>
      <AppProvider>
        <SocketProvider>
          <div className="min-h-screen bg-dark-gradient text-white">
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/whatsapp" element={<WhatsApp />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/audio-responses" element={<AudioResponses />} />
              </Routes>
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