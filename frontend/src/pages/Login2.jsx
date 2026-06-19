import React, { useState } from 'react';
import { Mail, Lock, LogIn, Zap, Globe, Fingerprint, ArrowRight } from 'lucide-react';
import { basePath } from '../utils/env.js';

const Login2 = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hovered, setHovered] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      fontFamily: '"Outfit", "Inter", sans-serif',
      background: '#09090b', // Zinc 950
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Left Side: Aurora & Grid Branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        position: 'relative',
        zIndex: 1,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        background: '#09090b',
        overflow: 'hidden'
      }}>
        {/* Subtle grid background */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          zIndex: 0
        }}></div>

        {/* Aurora Orbs */}
        <div style={{
          position: 'absolute',
          top: '-20%', left: '-10%', width: '70vw', height: '70vw',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 60%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'drift 20s infinite alternate ease-in-out',
          zIndex: 0
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30%', right: '10%', width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, rgba(0,0,0,0) 60%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'drift2 25s infinite alternate ease-in-out',
          zIndex: 0
        }}></div>
        <div style={{
          position: 'absolute',
          top: '40%', left: '30%', width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, rgba(0,0,0,0) 60%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'drift3 22s infinite alternate ease-in-out',
          zIndex: 0
        }}></div>

        {/* Content Container */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 'auto', animation: 'fadeInDown 0.8s ease-out' }}>
            <div style={{
              background: 'rgba(24, 24, 27, 0.4)', // Zinc 900 translucent
              padding: '12px 20px',
              borderRadius: '16px',
              display: 'inline-block',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <img src={`${basePath}/sarlogoremovebg.png`} alt="SAR Logo" style={{ height: '36px', objectFit: 'contain' }} />
            </div>
          </div>

          <div style={{ margin: 'auto 0', animation: 'fadeInUp 0.8s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <span style={{ 
                padding: '6px 14px', 
                background: 'rgba(99,102,241,0.1)', 
                color: '#818cf8', 
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: '1px solid rgba(99,102,241,0.2)'
              }}>
                Enterprise Portal
              </span>
            </div>
            
            <h1 className="shimmer-text" style={{ 
              fontSize: '64px', 
              fontWeight: 800, 
              lineHeight: 1.1,
              marginBottom: '24px',
              letterSpacing: '-0.03em',
            }}>
              Dhurandhar Setu
            </h1>
            <p style={{ 
              fontSize: '18px', 
              color: '#a1a1aa', 
              fontWeight: 400, 
              maxWidth: '480px',
              lineHeight: 1.7,
              marginBottom: '48px'
            }}>
              Unified operations for the modern enterprise. Secure, seamless, and built for scale.
            </p>

            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#e4e4e7' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Zap size={22} style={{ color: '#38bdf8' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>High Performance</div>
                  <div style={{ fontSize: '13px', color: '#71717a' }}>Zero latency operations</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#e4e4e7' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Globe size={22} style={{ color: '#c084fc' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>Global Access</div>
                  <div style={{ fontSize: '13px', color: '#71717a' }}>Scale anywhere seamlessly</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', color: '#52525b', fontSize: '13px', animation: 'fadeInUp 0.8s ease-out 0.2s' }}>
            &copy; {new Date().getFullYear()} SAR Software Solutions. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side: Deep Dark Glass Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
        padding: '40px',
        background: '#09090b'
      }}>
        <div style={{
          position: 'absolute',
          top: '10%', right: '10%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%', filter: 'blur(60px)', zIndex: 0
        }}></div>

        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(24, 24, 27, 0.6)', // Zinc 900
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '24px',
          padding: '48px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          animation: 'fadeInUp 0.6s ease-out 0.2s both',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <Fingerprint size={30} color="#e4e4e7" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f4f4f5', marginBottom: '8px' }}>
              Welcome Back
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0 }}>
              Sign in to your unified workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#a1a1aa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 46px',
                    background: '#09090b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: '#f4f4f5',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.background = '#09090b';
                    e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Password
                </label>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#818cf8', fontSize: '13px', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}>
                  Forgot Password?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 46px',
                    background: '#09090b',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: '#f4f4f5',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.background = '#09090b';
                    e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                width: '100%',
                padding: '16px',
                background: '#e4e4e7', // Zinc 200
                color: '#09090b', // Zinc 950
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '16px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: hovered ? '0 10px 25px -5px rgba(255,255,255,0.2)' : '0 4px 15px -3px rgba(0,0,0,0.5)',
                transform: hovered ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: hovered ? '100%' : '-100%',
                width: '50%',
                height: '100%',
                background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)',
                transform: 'skewX(-20deg)',
                transition: hovered ? 'left 0.7s ease' : 'none'
              }}></div>
              
              <span style={{ position: 'relative', zIndex: 1 }}>Authenticate</span>
              <ArrowRight size={18} style={{ position: 'relative', zIndex: 1, transform: hovered ? 'translateX(4px)' : 'none', transition: 'transform 0.3s' }} />
            </button>
          </form>

          <div style={{ marginTop: '36px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#52525b', fontWeight: 500 }}>
              Powered by SAR Cryptographic Engine
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
          
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes drift {
            0% { transform: translate(0, 0); }
            100% { transform: translate(100px, 50px); }
          }
          @keyframes drift2 {
            0% { transform: translate(0, 0); }
            100% { transform: translate(-100px, -80px); }
          }
          @keyframes drift3 {
            0% { transform: translate(0, 0); }
            100% { transform: translate(-50px, 100px); }
          }

          @keyframes shimmer {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .shimmer-text {
            background: linear-gradient(to right, #ffffff 20%, #a5b4fc 40%, #a5b4fc 60%, #ffffff 80%);
            background-size: 200% auto;
            color: transparent;
            -webkit-background-clip: text;
            background-clip: text;
            animation: shimmer 4s linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default Login2;
