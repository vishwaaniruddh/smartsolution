import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, Fingerprint, ArrowRight, ArrowLeft } from 'lucide-react';
import { basePath, apiBaseUrl } from '../utils/env.js';
import { useSettings } from '../components/SettingsContext';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { settings, refetchSettings } = useSettings();
  const { login: authLogin, user: existingUser } = useAuth();
  
  const [showLoader, setShowLoader] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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
        if (data.success && data.token) {
          authLogin(data.token).then(() => {
            // Need to read the decoded token role/apps from the endpoint response, 
            // but `authLogin` fetches it async into Context.
            // Let's manually fetch /me here just to do the redirect, or just redirect to '/' 
            // and let App.jsx's RootRedirect handle all the logic!
            refetchSettings().then(() => {
              setShowLoader(true);
              setTimeout(() => {
                navigate('/');
              }, 1500);
            });
          });
        } else {
          setError(data.error || 'Login failed.');
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Login error:', err);
        setError('Unable to connect to the authentication server.');
        setLoading(false);
      });
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
          
          :root {
            --bg-dark: #020617;
            --glass-bg: rgba(15, 23, 42, 0.6);
            --glass-border: rgba(255, 255, 255, 0.08);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #6366f1;
            --accent-hover: #818cf8;
          }

          .login-wrapper {
            min-height: 100vh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Outfit', 'Inter', sans-serif;
            background: var(--bg-dark);
            position: relative;
            overflow: hidden;
            padding: 24px;
            box-sizing: border-box;
          }

          /* --- Background Animations --- */
          .mesh-bg {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            overflow: hidden;
            z-index: 0;
          }
          .mesh-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.5;
            animation: float 20s infinite alternate ease-in-out;
          }
          .orb-1 {
            top: -10%; left: -10%; width: 50vw; height: 50vw;
            background: radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 60%);
          }
          .orb-2 {
            bottom: -20%; right: -10%; width: 60vw; height: 60vw;
            background: radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 60%);
            animation-duration: 25s;
            animation-direction: alternate-reverse;
          }
          .orb-3 {
            top: 30%; left: 40%; width: 40vw; height: 40vw;
            background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 60%);
            animation-duration: 22s;
          }
          .grid-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 40px 40px;
            z-index: 1;
            pointer-events: none;
          }

          /* --- Main Card --- */
          .glass-card {
            width: 100%;
            max-width: 480px;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 32px;
            padding: 48px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            position: relative;
            z-index: 2;
            animation: fadeInUp 0.6s ease-out;
            display: flex;
            flex-direction: column;
            gap: 40px;
            box-sizing: border-box;
          }

          /* --- Header --- */
          .card-header {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .logo-container {
            background: rgba(255, 255, 255, 0.03);
            padding: 12px 20px;
            border-radius: 16px;
            border: 1px solid var(--glass-border);
            margin-bottom: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          }
          .logo-container img {
            height: 32px;
            object-fit: contain;
          }
          .badge {
            padding: 4px 12px;
            background: rgba(99,102,241,0.1);
            color: var(--accent-hover);
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            border: 1px solid rgba(99,102,241,0.2);
            margin-bottom: 16px;
          }
          .shimmer-title {
            font-size: 36px;
            font-weight: 800;
            line-height: 1.1;
            margin: 0 0 12px 0;
            letter-spacing: -0.02em;
            background: linear-gradient(to right, #ffffff 20%, #a5b4fc 40%, #a5b4fc 60%, #ffffff 80%);
            background-size: 200% auto;
            color: transparent;
            -webkit-background-clip: text;
            background-clip: text;
            animation: shimmer 4s linear infinite;
          }
          .subtitle {
            font-size: 14px;
            color: var(--text-secondary);
            font-weight: 400;
            line-height: 1.6;
            margin: 0;
            padding: 0 10px;
          }

          /* --- Alerts --- */
          .alert-box {
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 24px;
            font-weight: 500;
          }
          .alert-box.error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
          }
          .alert-box.success {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #86efac;
          }

          /* --- Forms --- */
          .login-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .input-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            text-align: left;
          }
          .label-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .input-group label {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .btn-link {
            background: none;
            border: none;
            color: var(--accent-hover);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            padding: 0;
            transition: color 0.2s;
            font-family: inherit;
          }
          .btn-link:hover {
            color: #ffffff;
          }
          .input-wrapper {
            position: relative;
          }
          .input-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
            pointer-events: none;
          }
          .input-wrapper input {
            width: 100%;
            padding: 14px 16px 14px 46px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            color: var(--text-primary);
            font-size: 15px;
            outline: none;
            transition: all 0.3s ease;
            box-sizing: border-box;
            font-family: inherit;
          }
          .input-wrapper input:focus {
            border-color: var(--accent);
            background: rgba(0, 0, 0, 0.4);
            box-shadow: 0 0 0 4px rgba(99,102,241,0.15);
          }

          /* --- Buttons --- */
          .btn-primary {
            width: 100%;
            padding: 16px;
            background: var(--text-primary);
            color: var(--bg-dark);
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 8px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 15px -3px rgba(0,0,0,0.5);
            transition: all 0.3s ease;
            font-family: inherit;
          }
          .btn-primary:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }
          .btn-primary.hovered {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -5px rgba(255,255,255,0.2);
          }
          .btn-shimmer {
            position: absolute;
            top: 0; left: -100%;
            width: 50%; height: 100%;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent);
            transform: skewX(-20deg);
            transition: left 0.7s ease;
          }
          .btn-primary.hovered .btn-shimmer {
            left: 100%;
          }
          .btn-text {
            position: relative;
            z-index: 1;
          }
          .btn-arrow {
            position: relative;
            z-index: 1;
            transition: transform 0.3s;
          }
          .btn-primary.hovered .btn-arrow {
            transform: translateX(4px);
          }
          .back-link {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-top: 16px;
            color: var(--text-secondary);
          }

          /* --- Footer --- */
          .card-footer {
            text-align: center;
            font-size: 13px;
            color: #475569;
            font-weight: 500;
          }

          /* --- Full Screen Loader --- */
          .loader-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: var(--bg-dark);
            position: relative;
            animation: fadeIn 0.5s ease-out;
            overflow: hidden;
            font-family: 'Outfit', 'Inter', sans-serif;
          }
          .loader-content {
            position: relative;
            width: 100px;
            height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
          }
          .pulse-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: var(--accent);
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          }
          .logo-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
            box-shadow: 0 0 30px rgba(0,0,0,0.8);
            backdrop-filter: blur(10px);
          }
          .logo-circle img {
            width: 50px;
            height: 50px;
            object-fit: contain;
          }
          .loader-text {
            margin-top: 30px;
            text-align: center;
            animation: fadeInUp 0.5s ease-out 0.3s both;
            z-index: 1;
          }
          .loader-text h2 {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 8px 0;
          }
          .loader-text p {
            color: var(--text-secondary);
            margin: 0;
            font-size: 14px;
          }

          /* --- Keyframes --- */
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes float {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 30px); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            80% { transform: scale(1.5); opacity: 0; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          @keyframes shimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          /* --- Responsive Overrides --- */
          @media (max-width: 600px) {
            .login-wrapper {
              padding: 16px;
            }
            .glass-card {
              padding: 40px 24px;
              gap: 32px;
              border-radius: 24px;
            }
            .shimmer-title {
              font-size: 28px;
            }
            .subtitle {
              font-size: 13px;
            }
          }
        `}
      </style>

      {showLoader ? (
        <div className="loader-container">
          <div className="mesh-bg">
            <div className="mesh-orb orb-1"></div>
            <div className="mesh-orb orb-2"></div>
            <div className="mesh-orb orb-3"></div>
          </div>
          <div className="loader-content">
            <div className="pulse-ring"></div>
            <div className="logo-circle">
               <img src={settings?.logo_url ? `${apiBaseUrl}/${settings.logo_url.replace(/^\/?api\//, '')}` : `${basePath}/sarlogoremovebg.png`} alt="Logo" />
            </div>
          </div>
          <div className="loader-text">
            <h2>{settings?.software_name || 'Loading Workspace...'}</h2>
            <p>{settings?.title || 'Preparing your dashboard'}</p>
          </div>
        </div>
      ) : (
        <div className="login-wrapper">
      {/* Animated Mesh Background */}
      <div className="mesh-bg">
        <div className="mesh-orb orb-1"></div>
        <div className="mesh-orb orb-2"></div>
        <div className="mesh-orb orb-3"></div>
      </div>

      {/* Grid Overlay */}
      <div className="grid-overlay"></div>

      {/* Main Glass Card */}
      <div className="glass-card">
        
        {/* Branding Header */}
        <div className="card-header">
          <div className="logo-container">
            <img src={`${basePath}/sarlogoremovebg.png`} alt="SAR Logo" />
          </div>
          <span className="badge">Enterprise Portal</span>
          <h1 className="shimmer-title">Dhurandhar Setu</h1>
          <p className="subtitle">
            Unified operations for the modern enterprise. Secure, seamless, and built for scale.
          </p>
        </div>

        {/* Form Section */}
        <div className="card-body">
          {error && (
            <div className="alert-box error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="alert-box success">
              <span>{forgotSuccess}</span>
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleForgotSubmit} className="login-form">
              <div className="input-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '8px' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              
              <button type="button" onClick={() => { setIsForgotPassword(false); setError(''); setForgotSuccess(''); }} className="btn-link back-link">
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="label-row">
                  <label>Password</label>
                  <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); setForgotSuccess(''); }} className="btn-link">
                    Forgot Password?
                  </button>
                </div>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`btn-primary ${hovered && !loading ? 'hovered' : ''}`}
              >
                {!loading && <div className="btn-shimmer"></div>}
                <span className="btn-text">{loading ? 'Authenticating...' : 'Authenticate'}</span>
                {!loading && <ArrowRight size={18} className="btn-arrow" />}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer">
          Powered by SAR Cryptographic Engine
        </div>
      </div>
      </div>
      )}
    </>
  );
};

export default Login;
