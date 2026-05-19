import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Goals from './pages/Goals'
import CheckIn from './pages/CheckIn'
import Reports from './pages/Reports'
import Assignments from './pages/Assignments'

function Guard({ children }) {
  return localStorage.getItem('aq_token') ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <Toaster position="top-right" toastOptions={{
      style: { background: '#FFFFFF', color: '#1C1917', border: '1.5px solid #FDE68A', borderRadius: '10px', fontSize: '13px', boxShadow: '0 4px 16px rgba(234,179,8,0.15)' },
      success: { iconTheme: { primary: '#EAB308', secondary: '#FFFFFF' } }
    }} />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/goals" element={<Guard><Goals /></Guard>} />
        <Route path="/checkin" element={<Guard><CheckIn /></Guard>} />
        <Route path="/reports" element={<Guard><Reports /></Guard>} />
        <Route path="/assignments" element={<Guard><Assignments /></Guard>} />
      </Routes>
    </BrowserRouter>
  </>
)
