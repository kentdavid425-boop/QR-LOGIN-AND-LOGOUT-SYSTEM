export type LogType = 'IN' | 'OUT';
export type LogPurpose = 'Study Purposes' | 'Fluid Simulator' | 'Batch Meeting';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  qrCodeUuid: string;
  batchNumber?: string;
  createdAt: string;
}

export interface AttendanceLog {
  id?: string;
  userId: string;
  userName: string;
  timestamp: any; // Firestore Timestamp
  type: LogType;
  purpose?: LogPurpose;
  dateStr: string; // YYYY-MM-DD for easier querying
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
