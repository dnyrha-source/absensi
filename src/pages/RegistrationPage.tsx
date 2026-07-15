import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { saveUser, addLog } from '../lib/db';
import { Loader2 } from 'lucide-react';

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
  const location = useLocation();
  const navigate = useNavigate();
  const faceEmbedding = location.state?.faceEmbedding;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegistrationForm>({
    defaultValues: {
      kategori: ''
    }
  });

  const kategori = watch('kategori');
  const jenjang = watch('jenjang');

  useEffect(() => {
    if (!faceEmbedding) {
      alert('Akses ditolak. Silakan scan wajah terlebih dahulu.');
      navigate('/');
    }
  }, [faceEmbedding, navigate]);

  const onSubmit = async (data: RegistrationForm) => {
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

  if (!faceEmbedding) return null;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Registrasi Pengunjung Baru</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Wajah Anda belum terdaftar. Silakan lengkapi data berikut.</p>
      </div>

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
              <option value="Siswa">Siswa</option>
              <option value="Guru">Guru</option>
              <option value="Karyawan">Karyawan</option>
              <option value="Pimpinan">Pimpinan</option>
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
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
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
                    ['7','8','9'].flatMap(g => ['A','B','C','D','E','F','G'].map(s => <option key={g+s} value={g+s}>{g}{s}</option>))
                  )}
                  {jenjang === 'SMA' && (
                    ['10','11','12'].flatMap(g => ['A','B','C','D','E','F','G'].map(s => <option key={g+s} value={g+s}>{g}{s}</option>))
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
                <option value="KB/TK">KB/TK</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            </div>
          )}

          {kategori === 'Karyawan' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bagian</label>
              <input 
                type="text" 
                {...register('bagian', { required: true })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                placeholder="Misal: Tata Usaha"
              />
            </div>
          )}

          {kategori === 'Pimpinan' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jabatan</label>
              <input 
                type="text" 
                {...register('jabatan', { required: true })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                placeholder="Misal: Kepala Sekolah"
              />
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
            disabled={isSubmitting}
            className="flex-1 flex justify-center items-center gap-2 py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Hadir'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
