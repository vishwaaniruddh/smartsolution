import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { basePath, apiBaseUrl } from '../utils/env.js';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setForgotSuccess('');
    setLoading(true);

    fetch(`${apiBaseUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_reset', email: forgotEmail })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setForgotSuccess(data.message);
          setForgotEmail('');
        } else {
          setError(data.error || 'Failed to request reset.');
        }
      })
      .catch(err => setError('Network error.'))
      .finally(() => setLoading(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    fetch(`${apiBaseUrl}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          // Save login context
          localStorage.setItem('crm_user', JSON.stringify(data.user));
          localStorage.setItem('crm_tenant_id', data.user.tenant_id ? data.user.tenant_id.toString() : '1');
          localStorage.setItem('crm_active_role', data.user.role);
          
          if (data.user.role === 'Superadmin') {
            navigate('/superadmin/tenants');
          } else {
            const apps = data.user.apps || [];
            if (apps.length === 1) {
              localStorage.setItem('crm_active_app', apps[0]);
              if (apps[0] === 'hrms') {
                navigate('/feature/hrms');
              } else if (apps[0] === 'crm') {
                if (data.user.role === 'Sales Associate') {
                  localStorage.setItem('crm_active_agent', `${data.user.first_name} ${data.user.last_name}`);
                  navigate('/feature/leads/sa/dashboard');
                } else {
                  navigate('/feature/leads');
                }
              } else {
                navigate('/select-app');
              }
            } else {
              // If 0 or multiple apps, let the SelectApp component handle it
              navigate('/select-app');
            }
          }
        } else {
          setError(data.error || 'Invalid credentials.');
        }
      })
      .catch((err) => {
        console.error('Login error:', err);
        setError('Unable to connect to the authentication server.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1e293b, #0f172a, #020617)',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(20, 27, 45, 0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-xl)',
        width: '100%',
        maxWidth: '400px',
        padding: '36px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        animation: 'fadeInUp 0.5s ease-out'
      }}>
        {/* Logo */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <img src={`${basePath}/sarlogoremovebg.png`} alt="SAR Workforce Logo" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '8px' }}>
          SAR Workforce Login
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Enter your credentials to access your tenant space
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--accent-red)',
            color: 'var(--accent-red)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        
        {forgotSuccess && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid var(--accent-green)',
            color: 'var(--accent-green)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <span>{forgotSuccess}</span>
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'left', margin: 0 }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <div style={{ position: 'relative', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px',
                background: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '8px'
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button
              type="button"
              onClick={() => { setIsForgotPassword(false); setError(''); setForgotSuccess(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Back to Login
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          <div style={{ position: 'relative', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>
          
          <div style={{ textAlign: 'right', marginTop: '-8px' }}>
            <button
              type="button"
              onClick={() => { setIsForgotPassword(true); setError(''); setForgotSuccess(''); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-blue)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              background: 'var(--accent-blue)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Logging in...' : (
              <>
                <span>Log In</span>
                <LogIn size={16} />
              </>
            )}
          </button>
        </form>
        )}
      </div>
    </div>
  );
};

export default Login;
