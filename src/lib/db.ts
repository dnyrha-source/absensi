import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { dbFirestore } from './firebase';

export type User = {
  id: string;
  nama: string;
  kategori: string;
  jenjang?: string;
  kelas?: string;
  unit?: string;
  bagian?: string;
  jabatan?: string;
  faceEmbedding?: number[];
  createdAt: string;
  updatedAt: string;
};

export type AttendanceLog = {
  id: string;
  userId: string;
  timestamp: string;
};

export type AppSettings = {
  id?: string;
  kategori: string[];
  jenjang: string[];
  kelasSMP: string[];
  kelasSMA: string[];
  unit: string[];
  bagian: string[];
  jabatan: string[];
};

export const defaultSettings: AppSettings = {
  kategori: ['Siswa', 'Guru', 'Karyawan', 'Pimpinan'],
  jenjang: ['SMP', 'SMA'],
  kelasSMP: ['7A','7B','7C','7D','7E','7F','7G','7H','8A','8B','8C','8D','8E','8F','8G','8H','9A','9B','9C','9D','9E','9F','9G','9H'],
  kelasSMA: ['10A','10B','10C','10D','10E','10F','10G','10H','11A','11B','11C','11D','11E','11F','11G','11H','12A','12B','12C','12D','12E','12F','12G','12H'],
  unit: ['KB/TK', 'SMP', 'SMA'],
  bagian: ['Tata Usaha', 'Keamanan', 'Kebersihan', 'Perlengkapan'],
  jabatan: ['Kepala Sekolah', 'Wakil Kepala Sekolah', 'Staf']
};

export const initDb = async () => {
  // Empty, no longer needed for Firebase since it auto-initializes.
  // Left for backward compatibility in App.tsx
};

export const getSettings = async (): Promise<AppSettings> => {
  const settingsCol = collection(dbFirestore, 'settings');
  const snap = await getDocs(settingsCol);
  if (snap.empty) {
    return defaultSettings;
  }
  return { ...defaultSettings, ...snap.docs[0].data(), id: snap.docs[0].id } as AppSettings;
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  const settingsCol = collection(dbFirestore, 'settings');
  const snap = await getDocs(settingsCol);
  const dataToSave = { ...settings };
  delete dataToSave.id;

  if (snap.empty) {
    await addDoc(settingsCol, dataToSave);
  } else {
    const docRef = doc(dbFirestore, 'settings', snap.docs[0].id);
    await updateDoc(docRef, dataToSave as any);
  }
};

export const getUsers = async (): Promise<User[]> => {
  const usersCol = collection(dbFirestore, 'users');
  const userSnapshot = await getDocs(usersCol);
  return userSnapshot.docs.map(doc => {
    const data = doc.data();
    return { ...data, id: doc.id } as User;
  });
};

export const saveUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const usersCol = collection(dbFirestore, 'users');
  const docRef = await addDoc(usersCol, {
    ...userData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return docRef.id;
};

export const updateUser = async (user: User): Promise<void> => {
  const userRef = doc(dbFirestore, 'users', user.id);
  const { id, ...data } = user;
  await updateDoc(userRef, { ...data, updatedAt: new Date().toISOString() });
};

export const deleteUser = async (id: string): Promise<void> => {
  const userRef = doc(dbFirestore, 'users', id);
  await deleteDoc(userRef);
};

export const getLogs = async (): Promise<AttendanceLog[]> => {
  const logsCol = collection(dbFirestore, 'logs');
  const q = query(logsCol, orderBy('timestamp', 'desc'));
  const logSnapshot = await getDocs(q);
  return logSnapshot.docs.map(doc => {
    const data = doc.data();
    return { ...data, id: doc.id } as AttendanceLog;
  });
};

export const addLog = async (userId: string): Promise<void> => {
  const logsCol = collection(dbFirestore, 'logs');
  await addDoc(logsCol, {
    userId,
    timestamp: new Date().toISOString(),
  });
};
