import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  addDoc,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import { UserProfile, AttendanceLog, LogType } from '../types.ts';
import { handleFirestoreError } from '../lib/utils.ts';
import { format } from 'date-fns';

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user profile exists by UID
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const isDefaultAdmin = user.email === 'kentdavid425@gmail.com';
    
    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile;
      // Force admin role for default admin if not already set
      if (isDefaultAdmin && data.role !== 'admin') {
        await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
        return { ...data, role: 'admin' };
      }
      return data;
    }

    // Check if user was pre-registered by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', user.email), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const preRegDoc = querySnapshot.docs[0];
      const preRegData = preRegDoc.data() as UserProfile;
      
      // Update pre-registered user with real UID
      const updatedUser: UserProfile = {
        ...preRegData,
        uid: user.uid
      };
      
      // If the pre-reg doc ID was different from UID, we should move it or just overwrite
      // For simplicity, we'll delete the old one and create new one with UID if they differ
      if (preRegDoc.id !== user.uid) {
        // This is tricky because of Firestore rules and atomicity
        // But since admin created it, we can just create a new one with UID
        await setDoc(doc(db, 'users', user.uid), updatedUser);
        // We might leave the old one or delete it if rules allow
      } else {
        await setDoc(doc(db, 'users', user.uid), updatedUser);
      }
      
      return updatedUser;
    }
    
    // Create new profile
    const newUser: UserProfile = {
      uid: user.uid,
      name: user.displayName || 'Anonymous',
      email: user.email || '',
      role: isDefaultAdmin ? 'admin' : 'student',
      qrCodeUuid: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', user.uid), newUser);
    return newUser;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  return onSnapshot(doc(db, 'users', uid), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as UserProfile);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, 'get', `users/${uid}`);
  });
};

export const subscribeToLogs = (userId: string | null, isAdmin: boolean, callback: (logs: AttendanceLog[]) => void) => {
  let q;
  if (isAdmin) {
    q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
  } else if (userId) {
    q = query(collection(db, 'logs'), where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(50));
  } else {
    return () => {};
  }

  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
    callback(logs);
  }, (error) => {
    handleFirestoreError(error, 'list', 'logs');
  });
};

export const getUserByQR = async (qrUuid: string) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('qrCodeUuid', '==', qrUuid), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Invalid QR Code: User not found');
    }
    
    const userData = querySnapshot.docs[0].data() as UserProfile;
    
    // Get last log to determine next type
    const logsRef = collection(db, 'logs');
    const lastLogQuery = query(
      logsRef, 
      where('userId', '==', userData.uid), 
      orderBy('timestamp', 'desc'), 
      limit(1)
    );
    const lastLogSnapshot = await getDocs(lastLogQuery);
    
    let nextType: LogType = 'IN';
    if (!lastLogSnapshot.empty) {
      const lastLog = lastLogSnapshot.docs[0].data() as AttendanceLog;
      nextType = lastLog.type === 'IN' ? 'OUT' : 'IN';
    }

    return { user: userData, nextType };
  } catch (error) {
    handleFirestoreError(error, 'get', 'users');
    throw error;
  }
};

export const createAttendanceLog = async (user: UserProfile, type: LogType, purpose?: string) => {
  try {
    const newLog: AttendanceLog = {
      userId: user.uid,
      userName: user.name,
      timestamp: Timestamp.now(),
      type,
      purpose: purpose as any,
      dateStr: format(new Date(), 'yyyy-MM-dd')
    };
    
    await addDoc(collection(db, 'logs'), newLog);
    return newLog;
  } catch (error) {
    handleFirestoreError(error, 'write', 'logs');
    throw error;
  }
};

export const getAllLogsForExport = async () => {
  try {
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
  } catch (error) {
    handleFirestoreError(error, 'list', 'logs');
    throw error;
  }
};

export const createUser = async (userData: { name: string, email: string, batchNumber?: string, role: 'student' | 'admin' }) => {
  try {
    // Check if email already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', userData.email), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error('A user with this email already exists.');
    }

    const tempId = crypto.randomUUID();
    const newUser: UserProfile = {
      uid: tempId,
      name: userData.name,
      email: userData.email,
      batchNumber: userData.batchNumber,
      role: userData.role,
      qrCodeUuid: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', tempId), newUser);
    return newUser;
  } catch (error) {
    handleFirestoreError(error, 'write', 'users');
    throw error;
  }
};

export const updateUserRole = async (uid: string, newRole: 'student' | 'admin') => {
  try {
    await setDoc(doc(db, 'users', uid), { role: newRole }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'write', `users/${uid}`);
    throw error;
  }
};

export const subscribeToAllUsers = (callback: (users: UserProfile[]) => void) => {
  const q = query(collection(db, 'users'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data() as UserProfile);
    callback(users);
  }, (error) => {
    handleFirestoreError(error, 'list', 'users');
  });
};
