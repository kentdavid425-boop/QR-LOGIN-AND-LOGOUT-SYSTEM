import React, { useState, useEffect } from 'react';
import { auth } from './firebase.ts';
import { onAuthStateChanged, User } from 'firebase/auth';
import { UserProfile } from './types.ts';
import { loginWithGoogle, logout, subscribeToUserProfile } from './services/attendanceService.ts';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { QRScanner } from './components/QRScanner.tsx';
import { StudentManagement } from './components/StudentManagement.tsx';
import { LogOut, QrCode, ClipboardList, LayoutDashboard, LogIn, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scanner' | 'logs' | 'students'>('dashboard');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    if (user) {
      unsubscribeProfile = subscribeToUserProfile(user.uid, (p) => {
        setProfile(p);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto transform rotate-12 shadow-lg">
            <QrCode className="w-12 h-12 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">QR Attendance</h1>
            <p className="text-gray-500 text-lg">Secure student entry and exit tracking system.</p>
          </div>
          <button 
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center space-x-3 bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all active:scale-95 shadow-xl"
          >
            <LogIn className="w-6 h-6" />
            <span>Sign in with Google</span>
          </button>
          <p className="text-xs text-gray-400">By signing in, you agree to our terms of service.</p>
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0 md:pt-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 hidden sm:block">QR Attendance</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Dashboard
              </button>
              {isAdmin && (
                <>
                  <button 
                    onClick={() => setActiveTab('scanner')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'scanner' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Scanner
                  </button>
                  <button 
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Logs
                  </button>
                  <button 
                    onClick={() => setActiveTab('students')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Students
                  </button>
                </>
              )}
            </div>
            
            <button 
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              isAdmin ? <AdminDashboard userId={user.uid} /> : <StudentDashboard user={profile} />
            )}
            {activeTab === 'scanner' && isAdmin && <QRScanner />}
            {activeTab === 'logs' && isAdmin && <AdminDashboard userId={user.uid} />}
            {activeTab === 'students' && isAdmin && <StudentManagement />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 md:hidden z-50">
        <div className="flex items-center justify-around h-20">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
          </button>
          
          {isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab('scanner')}
                className={`flex flex-col items-center space-y-1 ${activeTab === 'scanner' ? 'text-blue-600' : 'text-gray-400'}`}
              >
                <QrCode className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Scan</span>
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`flex flex-col items-center space-y-1 ${activeTab === 'logs' ? 'text-blue-600' : 'text-gray-400'}`}
              >
                <ClipboardList className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Logs</span>
              </button>
              <button 
                onClick={() => setActiveTab('students')}
                className={`flex flex-col items-center space-y-1 ${activeTab === 'students' ? 'text-blue-600' : 'text-gray-400'}`}
              >
                <Users className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Students</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
