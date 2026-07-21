import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { saveUser, addLog, getSettings, defaultSettings, AppSettings } from '../lib/db';
import { Loader2, Camera, CheckCircle2 } from 'lucide-react';
import { loadRegistrationModels, getHighQualityFaceEmbedding } from '../lib/faceApi';

export type RegistrationForm = {
  nama: string;
  kategori: 'Siswa' | 'Guru' | 'Karyawan' | 'Pimpinan' | '';
  jenjang?: 'SMP' | 'SMA' | '';
  kelas?: string;
  unit?: 'KB/TK' | 'SMP' | 'SMA' | '';
  bagian?: string;
  jabatan?: string;
};

export default function RegistrationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegistrationForm>({
    defaultValues: {
      kategori: '',
      jenjang: '',
      kelas: '',
      unit: '',
      bagian: '',
      jabatan: ''
    }
  });

  const kategori = watch('kategori');
  const jenjang = watch('jenjang');

  useEffect(() => {
    const init = async () => {
      try {
        const fetchedSettings = await getSettings();
        setSettings(fetchedSettings);
      } catch (e: any) {
        console.error("Gagal memuat pengaturan: ", e);
      }

      try {
        await loadRegistrationModels();
        setIsModelsLoaded(true);
        startVideo();
      } catch (e: any) {
        alert("Gagal memuat model AI Registration: " + e.message);
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
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user'
      } 
    })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
        alert("Kamera tidak dapat diakses atau diblokir oleh browser. (" + err.message + ")");
      });
  };

  const handleCaptureFace = async () => {
    if (!videoRef.current || !isModelsLoaded) return;
    
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      alert("Kamera belum siap, silakan tunggu sebentar.");
      return;
    }
    
    setIsCapturing(true);
    try {
      const descriptor = await getHighQualityFaceEmbedding(videoRef.current);
      if (descriptor) {
        setFaceEmbedding(descriptor);
        // Stop camera after successful capture
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      } else {
        alert('Wajah tidak terdeteksi. Pastikan pencahayaan cukup dan wajah terlihat jelas.');
      }
    } catch (error: any) {
      alert("Terjadi kesalahan saat mendeteksi wajah: " + error.message);
    } finally {
      setIsCapturing(false);
    }
  };

  const onSubmit = async (data: RegistrationForm) => {
    if (!faceEmbedding) {
      alert("Silakan ambil foto wajah terlebih dahulu!");
      return;
    }

    try {
      setIsSubmitting(true);
      const visitorData = {
        ...data,
        faceEmbedding,
      };
      
      const newUserId = await saveUser(visitorData as any);
      await addLog(newUserId);
      
      alert('Registrasi dan absensi berhasil!');
      navigate('/');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Terjadi kesalahan saat menyimpan data. Periksa koneksi internet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Registrasi Pengunjung Baru</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Lengkapi data Anda dan ambil foto wajah untuk Foto Master (Resolusi Tinggi).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Camera Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Foto Wajah (SSDMobileNetV1 HD)</label>
          <div className="relative w-full h-[350px] md:h-[450px] bg-black rounded-2xl overflow-hidden shadow-xl border border-slate-700/50">
            {!faceEmbedding ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-contain mirror"
                />
                {!isModelsLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10 text-white">
                    <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                    <p className="font-medium">Memuat AI Resolusi Tinggi (5MB)...</p>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/10 text-green-500 border-2 border-green-500 rounded-2xl">
                <CheckCircle2 className="w-16 h-16 mb-2" />
                <p className="font-bold text-lg">Foto Master Tersimpan!</p>
              </div>
            )}
          </div>

          {!faceEmbedding && (
            <button 
              type="button"
              onClick={handleCaptureFace}
              disabled={!isModelsLoaded || isCapturing}
              className={`w-full flex items-center justify-center gap-3 py-4 font-bold rounded-xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                ${isCapturing ? 'bg-slate-700 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500'}
              `}
            >
              {isCapturing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memindai Wajah HD...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span>Ambil Foto Wajah</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
              <input 
                type="text" 
                {...register('nama', { required: true })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                placeholder="Masukkan nama lengkap"
              />
              {errors.nama && <span className="text-red-500 text-sm mt-1">Nama wajib diisi</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
              <select 
                {...register('kategori', { required: true })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
              >
                <option value="" disabled>Pilih Kategori</option>
                {settings.kategori.map((k, idx) => (
                  <option key={idx} value={k}>{k}</option>
                ))}
              </select>
              {errors.kategori && <span className="text-red-500 text-sm mt-1">Kategori wajib dipilih</span>}
            </div>

            {/* Conditional Fields */}
            {kategori === 'Siswa' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenjang</label>
                  <select 
                    {...register('jenjang', { required: true })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                  >
                    <option value="" disabled>Pilih</option>
                    {settings.jenjang.map((j, idx) => (
                      <option key={idx} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kelas</label>
                  <select 
                    {...register('kelas', { required: true })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                  >
                    <option value="" disabled>Pilih Kelas</option>
                    {jenjang === 'SMP' && (
                      settings.kelasSMP.map(s => <option key={s} value={s}>{s}</option>)
                    )}
                    {jenjang === 'SMA' && (
                      settings.kelasSMA.map(s => <option key={s} value={s}>{s}</option>)
                    )}
                  </select>
                  {errors.kelas && <span className="text-red-500 text-sm mt-1">Kelas wajib dipilih</span>}
                </div>
              </div>
            )}

            {kategori === 'Guru' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                <select 
                  {...register('unit', { required: true })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                >
                  <option value="" disabled>Pilih Unit</option>
                  {settings.unit.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            )}

            {kategori === 'Karyawan' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bagian</label>
                <select 
                  {...register('bagian', { required: true })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                >
                  <option value="" disabled>Pilih Bagian</option>
                  {settings.bagian.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}

            {kategori === 'Pimpinan' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jabatan</label>
                <select 
                  {...register('jabatan', { required: true })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                >
                  <option value="" disabled>Pilih Jabatan</option>
                  {settings.jabatan.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !faceEmbedding}
              className="flex-1 flex justify-center items-center gap-2 py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Hadir'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
