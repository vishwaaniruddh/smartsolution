import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Maximize2, Minimize2, Lock } from 'lucide-react';
import { apiBaseUrl } from '../../utils/env';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const CallWidget = ({
  socket,
  callState,       // 'idle' | 'dialing' | 'ringing' | 'connected'
  setCallState,
  callData,        // { peerId, peerName, isVideo, isIncoming, offer }
  setCallData
}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);         // RTCPeerConnection reference
  const streamRef = useRef(null);     // Local Stream reference (for cleanup)
  const timerRef = useRef(null);

  // Tone Generator Refs
  const toneCtxRef = useRef(null);
  const toneOscsRef = useRef([]);
  const toneGainRef = useRef(null);
  const toneIntervalRef = useRef(null);

  const startTone = () => {
    stopTone();
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      toneCtxRef.current = ctx;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      // Standard North American Ringback frequencies
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.value = 0;
      osc1.start();
      osc2.start();

      toneOscsRef.current = [osc1, osc2];
      toneGainRef.current = gain;

      let isOn = false;
      const toggleTone = () => {
        isOn = !isOn;
        // Smooth transition to avoid clicking
        gain.gain.setTargetAtTime(isOn ? 0.08 : 0, ctx.currentTime, 0.05);
        toneIntervalRef.current = setTimeout(toggleTone, isOn ? 2000 : 4000);
      };
      toggleTone();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked for ringtones', e);
    }
  };

  const stopTone = () => {
    if (toneIntervalRef.current) {
      clearTimeout(toneIntervalRef.current);
      toneIntervalRef.current = null;
    }
    if (toneGainRef.current && toneCtxRef.current) {
      toneGainRef.current.gain.setTargetAtTime(0, toneCtxRef.current.currentTime, 0.1);
    }
    if (toneOscsRef.current.length > 0) {
      setTimeout(() => {
        try {
          toneOscsRef.current.forEach(osc => osc.stop());
        } catch(e) {}
        toneOscsRef.current = [];
      }, 200);
    }
  };

  // Manage tone lifecycle based on call state
  useEffect(() => {
    if (callState === 'dialing' || callState === 'ringing') {
      startTone();
    } else {
      stopTone();
    }
    return () => stopTone();
  }, [callState]);

  // Clean up WebRTC on end
  const cleanupCall = () => {
    console.log('[WebRTC] Cleaning up call resources');
    
    // Stop local media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    // Close PeerConnection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop duration timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setCallDuration(0);
    setErrorMsg('');
    setIsMuted(false);
    setIsCameraOff(false);
  };

  // Timer for active call duration
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Proximity Sensor Auto-lock (Experimental API, works on limited browsers)
  useEffect(() => {
    if (callState === 'idle') return;
    if ('ProximitySensor' in window) {
      try {
        const sensor = new window.ProximitySensor();
        sensor.start();
        sensor.onreading = () => {
          setIsScreenLocked(sensor.near);
        };
        return () => {
          sensor.stop();
        };
      } catch (e) {
        console.log('Proximity sensor not available', e);
      }
    }
  }, [callState]);

  // Handle incoming call signaling events
  useEffect(() => {
    if (!socket) return;

    // Listen for WebRTC answer (Caller side)
    const handleAnswerMade = async (data) => {
      console.log('[WebRTC] Answer received from remote peer');
      if (pcRef.current && callState === 'dialing') {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallState('connected');
        } catch (err) {
          console.error('Failed to set remote description (answer):', err);
          setErrorMsg('Failed to connect call.');
        }
      }
    };

    // Listen for ICE candidates from peer
    const handleIceCandidate = async (data) => {
      if (pcRef.current) {
        try {
          console.log('[WebRTC] Adding ICE candidate from peer');
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    };

    // Listen for rejection (Caller side)
    const handleCallRejected = () => {
      console.log('[Call] Call was rejected');
      setErrorMsg('Call rejected by user.');
      setTimeout(() => {
        cleanupCall();
        setCallState('idle');
        setCallData(null);
      }, 2000);
    };

    // Listen for ended call
    const handleCallEnded = () => {
      console.log('[Call] Call ended by peer');
      cleanupCall();
      setCallState('idle');
      setCallData(null);
    };

    // Listen for calling failure
    const handleCallFailed = (data) => {
      console.log('[Call] Call failed:', data.reason);
      setErrorMsg(data.reason);
      setTimeout(() => {
        cleanupCall();
        setCallState('idle');
        setCallData(null);
      }, 2000);
    };

    socket.on('answer-made', handleAnswerMade);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-failed', handleCallFailed);

    return () => {
      socket.off('answer-made', handleAnswerMade);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-failed', handleCallFailed);
    };
  }, [callState, socket]);

  // Set up local video stream element when localStream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set up remote video stream element when remoteStream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Start Call (Dialing Mode)
  const startCall = async () => {
    try {
      console.log('[WebRTC] Requesting local camera/mic stream');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.isVideo ? { facingMode: 'user' } : false
      });
      
      streamRef.current = stream;
      setLocalStream(stream);

      // Create Peer Connection
      const pc = new RTCPeerConnection(STUN_SERVERS);
      pcRef.current = pc;

      // Add tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle remote track
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote stream track');
        setRemoteStream(event.streams[0]);
      };

      // Handle ICE Candidate creation
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            to: callData.peerId,
            candidate: event.candidate
          });
        }
      };

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Emit calling event to target user
      socket.emit('call-user', {
        userToCall: callData.peerId,
        offer,
        isVideo: callData.isVideo,
        callerName: callData.callerName
      });

    } catch (err) {
      console.error('Failed to access media devices:', err);
      setErrorMsg('Could not access Camera/Microphone.');
      setTimeout(() => {
        cleanupCall();
        setCallState('idle');
        setCallData(null);
      }, 3000);
    }
  };

  // Accept Call (Ringing Mode)
  const acceptCall = async () => {
    try {
      console.log('[WebRTC] Accepting call and requesting media devices');
      setCallState('connected');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.isVideo ? { facingMode: 'user' } : false
      });
      
      streamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(STUN_SERVERS);
      pcRef.current = pc;

      // Add tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Handle remote track
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote stream track');
        setRemoteStream(event.streams[0]);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            to: callData.peerId,
            candidate: event.candidate
          });
        }
      };

      // Set Remote Description (the offer received)
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

      // Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send Answer
      socket.emit('make-answer', {
        to: callData.peerId,
        answer
      });

    } catch (err) {
      console.error('Failed to accept call:', err);
      setErrorMsg('Failed to initialize call audio/video.');
      // Reject automatically on error
      socket.emit('reject-call', { to: callData.peerId });
      setTimeout(() => {
        cleanupCall();
        setCallState('idle');
        setCallData(null);
      }, 3000);
    }
  };

  // Reject Incoming Call
  const rejectCall = () => {
    if (socket && callData) {
      socket.emit('reject-call', { to: callData.peerId });
    }
    cleanupCall();
    setCallState('idle');
    setCallData(null);
  };

  // End Call Manually
  const endCall = () => {
    if (socket && callData) {
      socket.emit('end-call', { to: callData.peerId });
    }
    cleanupCall();
    setCallState('idle');
    setCallData(null);
  };

  // Trigger call startup when dial mode is entered
  useEffect(() => {
    if (callState === 'dialing' && !callData.isIncoming) {
      startCall();
    }
  }, [callState]);

  // Toggle Mute / Mic
  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  // Toggle Speaker
  const toggleSpeaker = async () => {
    const newState = !isSpeaker;
    setIsSpeaker(newState);
    if (remoteVideoRef.current && typeof remoteVideoRef.current.setSinkId === 'function') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        if (audioOutputs.length > 1) {
          // Attempt to find a speaker output vs earpiece output
          const speakerDev = audioOutputs.find(d => d.label.toLowerCase().includes('speaker')) || audioOutputs[audioOutputs.length - 1];
          const earDev = audioOutputs.find(d => d.label.toLowerCase().includes('earpiece')) || audioOutputs[0];
          await remoteVideoRef.current.setSinkId(newState ? speakerDev.deviceId : earDev.deviceId);
        }
      } catch (e) {
        console.warn('Could not set sink id', e);
      }
    }
  };

  // Format Duration Time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState === 'idle') return null;

  return (
    <div style={styles.overlay}>
      {isScreenLocked && (
        <div 
          style={styles.lockedScreenOverlay} 
          onDoubleClick={() => setIsScreenLocked(false)}
          title="Double tap to unlock"
        >
          <Lock size={32} color="rgba(255,255,255,0.3)" style={{ marginBottom: '16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Screen Locked<br/>Double tap to unlock</p>
        </div>
      )}
      <div style={styles.container}>
        
        {/* Ringing/Dialing Visuals */}
        {(callState === 'dialing' || callState === 'ringing') && (
          <div style={styles.statusPanel}>
            <div style={styles.avatarGlow}>
              <div style={styles.avatar}>
                {callData.peerName?.charAt(0).toUpperCase()}
              </div>
            </div>
            <h3 style={styles.peerName}>{callData.peerName}</h3>
            <p style={styles.statusText}>
              {errorMsg ? (
                <span style={{ color: 'var(--accent-red)' }}>{errorMsg}</span>
              ) : callState === 'dialing' ? (
                'Dialing...'
              ) : (
                `Incoming ${callData.isVideo ? 'Video' : 'Voice'} Call...`
              )}
            </p>

            {/* Answer / Reject Controls for incoming calls */}
            {callState === 'ringing' && (
              <div style={styles.actionButtonsRow}>
                <button onClick={acceptCall} style={{ ...styles.btnRound, background: '#10b981' }} title="Accept">
                  <Phone size={24} color="#fff" />
                </button>
                <button onClick={rejectCall} style={{ ...styles.btnRound, background: '#ef4444' }} title="Reject">
                  <PhoneOff size={24} color="#fff" />
                </button>
              </div>
            )}

            {/* Cancel Call for dialing caller */}
            {callState === 'dialing' && (
              <div style={styles.actionButtonsRow}>
                <button onClick={endCall} style={{ ...styles.btnRound, background: '#ef4444' }} title="Cancel">
                  <PhoneOff size={24} color="#fff" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active Connected Call Screen */}
        {callState === 'connected' && (
          <div style={styles.connectedPanel}>
            {/* Video Streams */}
            <div style={styles.videoWorkspace}>
              {callData.isVideo ? (
                <>
                  {/* Remote Video (Full Size) */}
                  <div style={styles.remoteVideoWrapper}>
                    {remoteStream ? (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={styles.remoteVideo}
                      />
                    ) : (
                      <div style={styles.videoPlaceholder}>
                        Waiting for remote video stream...
                      </div>
                    )}
                  </div>
                  
                  {/* Local Video (Floating Thumbnail) */}
                  <div style={styles.localVideoWrapper}>
                    {isCameraOff ? (
                      <div style={styles.localCameraOffIcon}>
                        <VideoOff size={16} color="var(--text-muted)" />
                      </div>
                    ) : (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={styles.localVideo}
                      />
                    )}
                  </div>
                </>
              ) : (
                /* Voice Call Visual Placeholder */
                <div style={styles.voicePlaceholder}>
                  {remoteStream && (
                    <audio
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{ display: 'none' }}
                    />
                  )}
                  <div style={{ ...styles.avatar, width: '90px', height: '90px', fontSize: '32px' }}>
                    {callData.peerName?.charAt(0).toUpperCase()}
                  </div>
                  <h4 style={{ margin: '16px 0 4px 0', fontSize: '18px', color: '#fff' }}>{callData.peerName}</h4>
                  <div style={styles.durationBadge}>{formatTime(callDuration)}</div>
                </div>
              )}
            </div>

            {/* Error notifications */}
            {errorMsg && <div style={styles.errorNotification}>{errorMsg}</div>}

            {/* Control Bar Overlay */}
            <div style={styles.controlBar}>
              {callData.isVideo && (
                <button 
                  onClick={toggleCamera} 
                  style={{ ...styles.controlBtn, background: isCameraOff ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.08)' }}
                  title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isCameraOff ? <VideoOff size={18} color="#ef4444" /> : <Video size={18} color="#fff" />}
                </button>
              )}

              <button 
                onClick={() => setIsScreenLocked(true)} 
                style={{ ...styles.controlBtn, background: 'rgba(255,255,255,0.08)' }}
                title="Lock Screen"
              >
                <Lock size={18} color="#fff" />
              </button>
              
              <button 
                onClick={toggleSpeaker} 
                style={{ ...styles.controlBtn, background: isSpeaker ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)' }}
                title={isSpeaker ? "Speakerphone On" : "Speakerphone Off"}
              >
                {isSpeaker ? <Volume2 size={18} color="#fff" /> : <VolumeX size={18} color="#fff" />}
              </button>
              
              <button 
                onClick={toggleMute} 
                style={{ ...styles.controlBtn, background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.08)' }}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff size={18} color="#ef4444" /> : <Mic size={18} color="#fff" />}
              </button>

              <button 
                onClick={endCall} 
                style={{ ...styles.controlBtn, background: '#ef4444', borderRadius: '12px', padding: '10px 20px', width: 'auto' }}
                title="End Call"
              >
                <PhoneOff size={18} color="#fff" style={{ marginRight: '6px' }} />
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>End</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Styling tokens for clean, glassmorphic layout
const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(7, 10, 19, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11000,
    backdropFilter: 'blur(8px)'
  },
  lockedScreenOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: '#000',
    zIndex: 12000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    userSelect: 'none'
  },
  container: {
    width: '420px',
    height: '560px',
    background: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  },
  statusPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px'
  },
  avatarGlow: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'rgba(34, 197, 94, 0.1)',
    marginBottom: '24px',
    animation: 'pulse 2s infinite'
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    color: '#fff',
    fontSize: '28px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
  },
  peerName: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#fff',
    margin: '0 0 8px 0'
  },
  statusText: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: '0 0 40px 0'
  },
  actionButtonsRow: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center'
  },
  btnRound: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.1s',
    outline: 'none'
  },
  connectedPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%'
  },
  videoWorkspace: {
    flex: 1,
    position: 'relative',
    background: '#030712',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  remoteVideoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  localVideoWrapper: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '100px',
    height: '135px',
    background: '#1f2937',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    zIndex: 10
  },
  localVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  localCameraOffIcon: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoPlaceholder: {
    color: '#9ca3af',
    fontSize: '13px',
    textAlign: 'center',
    padding: '20px'
  },
  voicePlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  durationBadge: {
    fontSize: '13px',
    color: '#9ca3af',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '4px 10px',
    borderRadius: '12px',
    marginTop: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  controlBar: {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    right: '24px',
    height: '60px',
    borderRadius: '16px',
    background: 'rgba(17, 24, 39, 0.85)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    zIndex: 100
  },
  controlBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none'
  },
  errorNotification: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    right: '16px',
    background: 'rgba(239, 68, 68, 0.9)',
    color: '#fff',
    fontSize: '12px',
    padding: '8px 12px',
    borderRadius: '8px',
    textAlign: 'center',
    zIndex: 20
  }
};

export default CallWidget;
