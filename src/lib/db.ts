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

export const initDb = async () => {
  // Empty, no longer needed for Firebase since it auto-initializes.
  // Left for backward compatibility in App.tsx
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
