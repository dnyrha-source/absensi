import { useState, useEffect } from 'react';
import { Users, User as UserIcon, GraduationCap, Building2, Briefcase, FileSpreadsheet, Edit, Trash2, X, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUsers, getLogs, updateUser, deleteUser } from '../lib/db';
import type { User, AttendanceLog } from '../lib/db';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState<'logs' | 'users'>('logs');

  // Pagination States
  const [logPage, setLogPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  
  // Filter States for Logs
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(23,59,59,999);
    return d.toISOString().split('T')[0];
  });
  
  const [kategoriFilter, setKategoriFilter] = useState('Semua');
  const [kelasFilter, setKelasFilter] = useState('');
  
  // Master Data Search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [_isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getUsers();
      const fetchedLogs = await getLogs();
      setUsers(fetchedUsers);
      setLogs(fetchedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch(e) {
      console.error("Gagal memuat data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      setErrorMsg('Password salah!');
    }
  };

  const getVisitorStatus = (u: User | undefined) => {
    if (!u) return '-';
    if (u.kategori === 'Siswa' && u.jenjang) return `Siswa ${u.jenjang}`;
    return u.kategori || '-';
  };

  // --- LOGS PROCESSING ---
  const ascendingLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const visitCounts: Record<string, number> = {};
  const logsWithVisitNumber = ascendingLogs.map(log => {
    visitCounts[log.userId] = (visitCounts[log.userId] || 0) + 1;
    return { ...log, visitNumber: visitCounts[log.userId] };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let filteredLogs = logsWithVisitNumber;
  
  // Date Range Filter
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    filteredLogs = filteredLogs.filter(l => new Date(l.timestamp) >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23,59,59,999);
    filteredLogs = filteredLogs.filter(l => new Date(l.timestamp) <= end);
  }

  // Map log to user data
  const logsWithUsers = filteredLogs.map(log => {
    const user = users.find(u => u.id === log.userId);
    return { ...log, user };
  });

  // Filter Kategori & Kelas
  let finalLogs = logsWithUsers;
  if (kategoriFilter !== 'Semua') {
    finalLogs = finalLogs.filter(l => getVisitorStatus(l.user) === kategoriFilter);
  }
  if (kelasFilter.trim() !== '') {
    finalLogs = finalLogs.filter(l => l.user?.kelas?.toLowerCase().includes(kelasFilter.toLowerCase()));
  }

  // Stats
  const stats = {
    total: finalLogs.length,
    smp: finalLogs.filter(l => getVisitorStatus(l.user) === 'Siswa SMP').length,
    sma: finalLogs.filter(l => getVisitorStatus(l.user) === 'Siswa SMA').length,
    guru: finalLogs.filter(l => getVisitorStatus(l.user) === 'Guru').length,
    karyawan: finalLogs.filter(l => getVisitorStatus(l.user) === 'Karyawan').length,
    pimpinan: finalLogs.filter(l => getVisitorStatus(l.user) === 'Pimpinan').length,
  };

  const getUserVisitCount = (userId: string) => {
    return logs.filter(l => l.userId === userId).length;
  };

  // Top 10 Visitors
  const top10Visitors = [...users]
    .map(u => ({ user: u, count: getUserVisitCount(u.id) }))
    .filter(u => u.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Search filter for Users Tab
  const filteredUsers = users.filter(u => u.nama.toLowerCase().includes(searchQuery.toLowerCase()));

  // --- BUSY HOURS CALCULATION ---
  const hourlyData = Array(24).fill(0);
  finalLogs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hourlyData[hour]++;
  });
  const maxHourlyVisits = Math.max(...hourlyData, 1);
  const displayHours = [6,7,8,9,10,11,12,13,14,15,16,17,18];

  // --- PAGINATION LOGIC ---
  const totalLogPages = Math.ceil(finalLogs.length / ITEMS_PER_PAGE);
  const currentLogs = finalLogs.slice((logPage - 1) * ITEMS_PER_PAGE, logPage * ITEMS_PER_PAGE);

  const totalUserPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const currentUsers = filteredUsers.slice((userPage - 1) * ITEMS_PER_PAGE, userPage * ITEMS_PER_PAGE);

  // --- ACTIONS ---
  const handleExportCSV = () => {
    if (finalLogs.length === 0) return alert('Tidak ada data untuk diexport');
    
    const headers = ['Waktu', 'Nama', 'Kategori', 'Kelas/Bagian', 'Total Kunjungan'];
    const csvContent = [
      headers.join(','),
      ...finalLogs.map(l => {
        const u = l.user;
        if (!u) return '';
        const detail = u.kategori === 'Siswa' ? (u.kelas || '') : (u.bagian || u.unit || u.jabatan || '');
        return `"${new Date(l.timestamp).toLocaleString()}","${u.nama}","${getVisitorStatus(u)}","${detail}","${getUserVisitCount(u.id)}"`;
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Log_Kunjungan_${startDate}_to_${endDate}.csv`;
    link.click();
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus user ini? Semua data log kunjungannya juga akan terhapus.')) {
      setIsLoading(true);
      await deleteUser(id);
      await loadData();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      setIsLoading(true);
      try {
        await updateUser({ ...editingUser, updatedAt: new Date().toISOString() });
        setEditingUser(null);
        await loadData();
      } catch (err) {
        console.error("Error update user:", err);
        alert("Terjadi kesalahan saat menyimpan data. Pastikan koneksi dan permissions Firebase benar.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 w-full max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">Login Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-gray-900 dark:text-white"
                placeholder="Masukkan password admin..."
              />
              {errorMsg && <p className="text-red-500 text-sm mt-1">{errorMsg}</p>}
            </div>
            <button type="submit" className="w-full btn-primary py-2 px-4 text-center">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full max-w-6xl mx-auto">
      
      {/* Header & Tabs */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard Admin</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manajemen log kunjungan dan master data pengunjung</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'logs' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Log Kunjungan
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Master Data Siswa / Pengunjung
          </button>
        </div>
      </div>

      {activeTab === 'logs' && (
        <>
          {/* Filter Section */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dari Tanggal</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setLogPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg outline-none text-sm text-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sampai Tanggal</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setLogPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg outline-none text-sm text-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kategori</label>
              <select 
                value={kategoriFilter}
                onChange={(e) => { setKategoriFilter(e.target.value); setLogPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg outline-none text-sm text-gray-800 dark:text-gray-200"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Siswa SMP">Siswa SMP</option>
                <option value="Siswa SMA">Siswa SMA</option>
                <option value="Guru">Guru</option>
                <option value="Karyawan">Karyawan</option>
                <option value="Pimpinan">Pimpinan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cari Kelas</label>
              <select 
                value={kelasFilter}
                onChange={(e) => { setKelasFilter(e.target.value); setLogPage(1); }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg outline-none text-sm text-gray-800 dark:text-gray-200"
              >
                <option value="">Semua Kelas</option>
                <optgroup label="SMP">
                  {['7','8','9'].flatMap(g => ['A','B','C','D','E','F','G'].map(s => <option key={g+s} value={g+s}>{g}{s}</option>))}
                </optgroup>
                <optgroup label="SMA">
                  {['10','11','12'].flatMap(g => ['A','B','C','D','E','F','G'].map(s => <option key={g+s} value={g+s}>{g}{s}</option>))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard title="Total Kunjungan" value={stats.total} icon={<Users className="w-8 h-8 text-blue-500" />} color="bg-blue-500 text-blue-500" />
            <StatCard title="Siswa SMP" value={stats.smp} icon={<UserIcon className="w-8 h-8 text-indigo-500" />} color="bg-indigo-500 text-indigo-500" />
            <StatCard title="Siswa SMA" value={stats.sma} icon={<UserIcon className="w-8 h-8 text-purple-500" />} color="bg-purple-500 text-purple-500" />
            <StatCard title="Guru" value={stats.guru} icon={<GraduationCap className="w-8 h-8 text-orange-500" />} color="bg-orange-500 text-orange-500" />
            <StatCard title="Karyawan" value={stats.karyawan} icon={<Building2 className="w-8 h-8 text-teal-500" />} color="bg-teal-500 text-teal-500" />
            <StatCard title="Pimpinan" value={stats.pimpinan} icon={<Briefcase className="w-8 h-8 text-rose-500" />} color="bg-rose-500 text-rose-500" />
          </div>

          {/* Busy Hours Chart Section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Statistik Jam Sibuk (06:00 - 18:00)
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-end h-48 gap-2 w-full overflow-x-auto pb-2">
                {displayHours.map(hour => {
                  const count = hourlyData[hour];
                  const heightPercentage = (count / maxHourlyVisits) * 100;
                  return (
                    <div key={hour} className="flex-1 flex flex-col justify-end items-center min-w-[30px] group cursor-pointer">
                      <div className="text-xs font-bold text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {count > 0 ? count : ''}
                      </div>
                      <div 
                        className="w-full max-w-[40px] bg-blue-100 dark:bg-blue-900/40 hover:bg-primary dark:hover:bg-primary rounded-t-md transition-all duration-300 ease-in-out relative group-hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ height: `${heightPercentage}%`, minHeight: count > 0 ? '4px' : '0' }}
                      >
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Top 10 Pengunjung Terbanyak</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Peringkat</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nama</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Kategori</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Total Kunjungan</th>
                  </tr>
                </thead>
                <tbody>
                  {top10Visitors.length > 0 ? (
                    top10Visitors.map((item, idx) => (
                      <tr key={item.user.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">#{idx + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-primary cursor-pointer hover:underline" onClick={() => setViewingUser(item.user)}>
                          {item.user.nama}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{getVisitorStatus(item.user)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-bold">{item.count} Kali</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Belum ada pengunjung.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Log Kunjungan</h3>
              <button onClick={handleExportCSV} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
                <FileSpreadsheet className="w-4 h-4" /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Waktu</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nama</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Kategori</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Detail</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Kunjungan Ke-</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.length > 0 ? (
                    currentLogs.map((l, idx) => (
                      <tr key={idx} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(l.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{l.user?.nama || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-md text-xs font-medium">
                            {getVisitorStatus(l.user)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {l.user?.kategori === 'Siswa' ? (l.user?.kelas ? `Kelas: ${l.user?.kelas}` : '-') : (l.user?.bagian || l.user?.unit || l.user?.jabatan || '-')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-semibold text-center">
                          {l.visitNumber}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Belum ada data pengunjung yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls Logs */}
            {totalLogPages > 1 && (
              <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/30">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Menampilkan {((logPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(logPage * ITEMS_PER_PAGE, finalLogs.length)} dari {finalLogs.length} data
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setLogPage(p => Math.max(1, p - 1))} 
                    disabled={logPage === 1}
                    className="p-1 rounded-md border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button 
                    onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                    disabled={logPage === totalLogPages}
                    className="p-1 rounded-md border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Master Data Pengunjung Terdaftar ({filteredUsers.length})</h3>
            <input 
              type="text"
              placeholder="Cari nama siswa/pengunjung..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setUserPage(1); }}
              className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg outline-none text-sm text-gray-800 dark:text-gray-200 min-w-[250px]"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nama</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Kategori</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Detail</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Total Kunjungan</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Terdaftar Pada</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.length > 0 ? (
                  currentUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-primary cursor-pointer hover:underline" onClick={() => setViewingUser(u)}>
                        {u.nama}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-md text-xs font-medium">
                          {getVisitorStatus(u)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {u.kategori === 'Siswa' ? (u.kelas ? `Kelas: ${u.kelas}` : '-') : (u.bagian || u.unit || u.jabatan || '-')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-semibold">
                        {getUserVisitCount(u.id)} Kali
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2 justify-center">
                        <button onClick={() => setEditingUser(u)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Belum ada data master pengguna terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls Users */}
          {totalUserPages > 1 && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/30">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan {((userPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(userPage * ITEMS_PER_PAGE, filteredUsers.length)} dari {filteredUsers.length} data
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setUserPage(p => Math.max(1, p - 1))} 
                  disabled={userPage === 1}
                  className="p-1 rounded-md border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <button 
                  onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                  disabled={userPage === totalUserPages}
                  className="p-1 rounded-md border border-gray-300 dark:border-slate-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Edit Data: {editingUser.nama}</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama</label>
                <input 
                  type="text" required
                  value={editingUser.nama}
                  onChange={(e) => setEditingUser({...editingUser, nama: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg outline-none text-gray-800 dark:text-white"
                />
              </div>
              
              {editingUser.kategori === 'Siswa' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenjang</label>
                    <select
                      value={editingUser.jenjang || ''}
                      onChange={(e) => setEditingUser({...editingUser, jenjang: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg outline-none text-gray-800 dark:text-white"
                    >
                      <option value="SMP">SMP</option>
                      <option value="SMA">SMA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kelas Baru</label>
                    <select 
                      required
                      value={editingUser.kelas || ''}
                      onChange={(e) => setEditingUser({...editingUser, kelas: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg outline-none text-gray-800 dark:text-white"
                    >
                      <option value="" disabled>Pilih Kelas</option>
                      {editingUser.jenjang === 'SMP' ? (
                        ['7','8','9'].flatMap(g => ['A','B','C','D','E','F','G'].map(s => <option key={g+s} value={g+s}>{g}{s}</option>))
                      ) : editingUser.jenjang === 'SMA' ? (
                        ['10','11','12'].flatMap(g => ['A','B','C','D','E','F','G'].map(s => <option key={g+s} value={g+s}>{g}{s}</option>))
                      ) : null}
                    </select>
                  </div>
                </>
              )}
              
              {/* Similar fields can be added here for Guru/Karyawan if needed, for brevity keeping simple */}
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-primary" />
                Detail Pengunjung
              </h3>
              <button onClick={() => setViewingUser(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nama Lengkap</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{viewingUser.nama}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kategori</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{getVisitorStatus(viewingUser)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Detail Ekstra</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {viewingUser.kategori === 'Siswa' ? (viewingUser.kelas ? `Kelas ${viewingUser.kelas}` : '-') : (viewingUser.bagian || viewingUser.unit || viewingUser.jabatan || '-')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Kunjungan</p>
                  <p className="font-semibold text-primary">{getUserVisitCount(viewingUser.id)} Kali</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Riwayat Absensi Terakhir</h4>
                <div className="border border-gray-100 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300">Tanggal</th>
                        <th className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300">Waktu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.filter(l => l.userId === viewingUser.id).slice(0, 5).map((l) => (
                        <tr key={l.id} className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(l.timestamp).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(l.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                      {getUserVisitCount(viewingUser.id) === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            Belum ada riwayat kunjungan
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {getUserVisitCount(viewingUser.id) > 5 && (
                  <p className="text-xs text-center text-gray-500 mt-2 italic">Menampilkan 5 kunjungan terbaru dari total {getUserVisitCount(viewingUser.id)}</p>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-end">
              <button onClick={() => setViewingUser(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
