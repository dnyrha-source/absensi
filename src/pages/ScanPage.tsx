import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';
import { loadModels, getFaceEmbedding } from '../lib/faceApi';
import { getUsers, addLog } from '../lib/db';
import type { User } from '../lib/db';
import * as faceapi from '@vladmandic/face-api';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  
  // Status states
  const [scanStatus, setScanStatus] = useState<'idle' | 'active' | 'cooldown' | 'unregistered'>('idle');
  const [unregisteredFace, setUnregisteredFace] = useState<Float32Array | null>(null);
  
  const isScanningRef = useRef(false);
  const successDataRef = useRef<{name: string, time: string} | null>(null);
  const unregisteredFaceRef = useRef<Float32Array | null>(null);
  const cooldowns = useRef(new Map<string, number>());
  
  // State for success modal
  const [successData, setSuccessData] = useState<{name: string, time: string} | null>(null);
  
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState<User[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadModels();
        setIsModelsLoaded(true);
        startVideo();
        
        // Fetch users in advance for faster scanning comparison
        const users = await getUsers();
        setUsersList(users);
      } catch (e: any) {
        alert("Gagal memuat model AI atau Database: " + e.message);
      }
    };
    init();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Error accessing webcam:", err));
  };

  const playSuccessSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      // Nice positive chime (C5 -> E5)
      playNote(523.25, 0, 0.3);
      playNote(659.25, 0.15, 0.5);
    } catch (e) {
      console.log("Audio not supported or blocked", e);
    }
  };

  // Sync refs
  useEffect(() => { successDataRef.current = successData; }, [successData]);
  useEffect(() => { unregisteredFaceRef.current = unregisteredFace; }, [unregisteredFace]);

  useEffect(() => {
    if (!isModelsLoaded) return;
    
    let active = true;
    const scanLoop = async () => {
      if (!active) return;
      
      // Only scan if not currently scanning, showing success, or showing unregistered modal
      if (!isScanningRef.current && !successDataRef.current && !unregisteredFaceRef.current) {
        await handleAutoScan();
      }
      
      // Wait 1 second before next poll
      setTimeout(scanLoop, 1000);
    };
    
    scanLoop();
    
    return () => { active = false; };
  }, [isModelsLoaded, usersList]);

  const handleAutoScan = async () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return;
    
    try {
      // 1. Lightweight detection first (Idle mode)
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
      const detection = await faceapi.detectSingleFace(videoRef.current, options);
      
      if (!detection) {
        setScanStatus('idle');
        return; // No face found, go back to idle
      }
      
      // Face found! Switch to active mode
      setScanStatus('active');
      isScanningRef.current = true;
      
      // 2. Heavy extraction
      const descriptor = await getFaceEmbedding(videoRef.current);
      if (descriptor) {
        let foundUser: User | null = null;
        let minDistance = 0.5; 

        for (const user of usersList) {
          if (user.faceEmbedding) {
            const distance = faceapi.euclideanDistance(
              descriptor, 
              new Float32Array(user.faceEmbedding)
            );
            if (distance < minDistance) {
              minDistance = distance;
              foundUser = user;
            }
          }
        }

        if (!foundUser) {
          setUnregisteredFace(new Float32Array(descriptor));
          setScanStatus('unregistered');
        } else {
          // Check cooldown (60 seconds)
          const lastScanTime = cooldowns.current.get(foundUser.id);
          if (lastScanTime && Date.now() - lastScanTime < 60000) {
            setScanStatus('cooldown');
            isScanningRef.current = false;
            return; // Skip logging
          }
          
          cooldowns.current.set(foundUser.id, Date.now());
          await addLog(foundUser.id);
          playSuccessSound();
          setSuccessData({
            name: foundUser.nama,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          
          setTimeout(() => {
            setSuccessData(null);
            setScanStatus('idle');
          }, 3000);
        }
      }
    } catch (error: any) {
      console.error("Terjadi kesalahan saat mendeteksi wajah: ", error);
    } finally {
      isScanningRef.current = false;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 md:p-8">
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes popup {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-popup {
          animation: popup 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      <div className="text-center space-y-3 mb-8 mt-4">
        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 dark:from-blue-400 dark:to-cyan-300">
          Face ID Absensi
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm md:text-base leading-relaxed">
          Posisikan wajah Anda di dalam bingkai untuk melakukan absensi otomatis atau registrasi pengguna baru.
        </p>
      </div>

      {/* Main Camera Container */}
      <div className="relative w-full max-w-md aspect-[4/5] md:aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-slate-100 dark:ring-slate-800/50 flex items-center justify-center mb-10 group">
        
        {!isModelsLoaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md text-white">
            <RefreshCw className="w-10 h-10 animate-spin mb-4 text-primary dark:text-blue-400" />
            <span className="font-medium tracking-wide">Memuat Sistem AI...</span>
          </div>
        )}
        
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500 opacity-90 group-hover:opacity-100"
        />

        {/* Futuristic Corners */}
        <div className="absolute top-0 left-0 w-12 h-12 md:w-16 md:h-16 border-t-4 border-l-4 border-primary dark:border-blue-400 rounded-tl-2xl z-20 m-6 opacity-80 transition-all duration-300 group-hover:scale-110"></div>
        <div className="absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 border-t-4 border-r-4 border-primary dark:border-blue-400 rounded-tr-2xl z-20 m-6 opacity-80 transition-all duration-300 group-hover:scale-110"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 md:w-16 md:h-16 border-b-4 border-l-4 border-primary dark:border-blue-400 rounded-bl-2xl z-20 m-6 opacity-80 transition-all duration-300 group-hover:scale-110"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 md:w-16 md:h-16 border-b-4 border-r-4 border-primary dark:border-blue-400 rounded-br-2xl z-20 m-6 opacity-80 transition-all duration-300 group-hover:scale-110"></div>

        {/* Laser Scanner Effect */}
        {(scanStatus === 'active') && (
          <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
            <div className="w-full h-1 bg-blue-500 shadow-[0_0_20px_5px_rgba(59,130,246,0.8)] absolute animate-scan-line"></div>
          </div>
        )}

        {/* Unregistered Face Overlay */}
        {unregisteredFace && (
          <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-popup">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <span className="text-3xl">🤔</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Wajah Belum Terdaftar</h3>
            <p className="text-slate-300 text-sm mb-6">Sistem tidak mengenali wajah ini. Apakah Anda ingin mendaftar?</p>
            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={() => navigate('/register', { state: { faceEmbedding: Array.from(unregisteredFace) } })}
                className="w-full py-3 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
              >
                Klik Untuk Registrasi
              </button>
              <button 
                onClick={() => { setUnregisteredFace(null); setScanStatus('idle'); }}
                className="w-full py-3 border border-slate-500 text-slate-300 hover:bg-slate-800 rounded-xl font-bold transition-all active:scale-95"
              >
                Batal / Lewati
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-3 px-8 py-3 font-bold rounded-full text-base shadow-lg transition-all ${scanStatus === 'active' ? 'bg-blue-500 text-white animate-pulse' : scanStatus === 'cooldown' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
        {scanStatus === 'active' ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Menganalisa Wajah...</span>
          </>
        ) : scanStatus === 'cooldown' ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>Menunggu antrean berikutnya...</span>
          </>
        ) : (
          <>
            <Camera className="w-5 h-5" />
            <span>Auto Scan Aktif (Idle)</span>
          </>
        )}
      </div>

      {/* Modern Success Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-popup">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            
            <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-2">Absensi Berhasil!</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Selamat datang kembali,</p>
            
            <div className="bg-blue-50 dark:bg-slate-900/50 w-full py-5 rounded-2xl border border-blue-100 dark:border-slate-700 mb-6 shadow-sm">
              <p className="text-xl md:text-2xl font-bold text-primary dark:text-blue-400 truncate px-4">
                {successData.name}
              </p>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Waktu Masuk: {successData.time}
              </p>
            </div>
            
            <button 
              onClick={() => setSuccessData(null)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-xl font-bold transition-all active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
