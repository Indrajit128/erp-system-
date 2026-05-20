'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        // Sign Up Flow via auto-confirm admin API
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to create account')
          setLoading(false)
          return
        }

        setMessage('Account created and verified! Logging you in automatically...')

        // Auto sign-in the newly registered and verified user
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setError('Account created, but automatic sign-in failed. Please switch to "Sign In" above and log in.')
          setLoading(false)
          return
        }

        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 1200)
      } else {
        // Sign In Flow
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          // Improve user feedback for general credentials mismatch
          if (error.message === 'Invalid login credentials') {
            setError('Invalid email or password. If you do not have an account, click "Create Account" above to register.')
          } else {
            setError(error.message)
          }
          setLoading(false)
          return
        }
        setMessage('Sign in successful! Redirecting...')
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: '#0a2540',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '26px',
            color: '#fff',
            boxShadow: '0 10px 20px -5px rgba(10, 37, 64, 0.3)'
          }}>
            ⚡
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#0a2540',
            letterSpacing: '-0.5px'
          }}>
            Rovo Chinasourcing
          </h1>
          <p style={{ color: '#475569', marginTop: 6, fontSize: '14px', fontWeight: 500 }}>
            Chinasourcing Billing Module
          </p>
        </div>

        {/* Card Container */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '32px 28px',
          boxShadow: '0 20px 25px -5px rgba(10, 37, 64, 0.05), 0 10px 10px -5px rgba(10, 37, 64, 0.04)'
        }}>
          {/* Tab Switcher */}
          <div style={{ 
            display: 'flex', 
            background: '#f1f5f9', 
            padding: '4px', 
            borderRadius: '10px', 
            marginBottom: 24 
          }}>
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(''); setMessage('') }}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: !isSignUp ? '#ffffff' : 'transparent',
                color: !isSignUp ? '#0a2540' : '#64748b',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s',
                boxShadow: !isSignUp ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(''); setMessage('') }}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                background: isSignUp ? '#ffffff' : 'transparent',
                color: isSignUp ? '#0a2540' : '#64748b',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s',
                boxShadow: isSignUp ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#0a2540', fontWeight: 600 }}>Email Address</label>
              <input 
                id="email" 
                type="email" 
                className="form-input" 
                placeholder="you@company.com"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={{
                  border: '1px solid #cbd5e1',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#0f172a'
                }}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#0a2540', fontWeight: 600 }}>Password</label>
              <input 
                id="password" 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{
                  border: '1px solid #cbd5e1',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#0f172a'
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                padding: '10px 12px',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '13px',
                lineHeight: 1.4
              }}>
                ⚠️ {error}
              </div>
            )}

            {message && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #dcfce7',
                padding: '10px 12px',
                borderRadius: '8px',
                color: '#15803d',
                fontSize: '13px',
                lineHeight: 1.4
              }}>
                ✅ {message}
              </div>
            )}

            <button 
              id="login-btn" 
              type="submit" 
              className="btn" 
              disabled={loading}
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '12px 16px',
                background: '#0a2540',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(10, 37, 64, 0.1)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e3a8a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0a2540'}
            >
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginTop: 24, fontWeight: 500 }}>
          Rovo Chinasourcing Gateway
        </p>
      </div>
    </div>
  )
}
