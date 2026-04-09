import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile, AttendanceLog } from '../types.ts';
import { Download, User, Mail, Calendar, Clock, BookOpen, Waves, Users, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { subscribeToLogs } from '../services/attendanceService.ts';
import { motion, AnimatePresence } from 'motion/react';

interface StudentDashboardProps {
  user: UserProfile;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToLogs(user.uid, false, setLogs);
    return () => unsubscribe();
  }, [user.uid]);

  const downloadQR = () => {
    const svg = document.getElementById('student-qr');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${user.name}_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-blue-600 p-8 text-white text-center">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <User className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold">{user.name}</h2>
          <p className="opacity-80">Student ID: {user.uid.slice(0, 8)}</p>
        </div>
        
        <div className="p-8 flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-gray-50 mb-6">
            <QRCodeSVG 
              id="student-qr"
              value={user.qrCodeUuid} 
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <button 
            onClick={downloadQR}
            className="flex items-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all active:scale-95"
          >
            <Download className="w-5 h-5" />
            <span>Download QR Code</span>
          </button>
          
          <div className="w-full mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Email</p>
                <p className="text-gray-900 font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Joined</p>
                <p className="text-gray-900 font-medium">{format(new Date(user.createdAt), 'MMM dd, yyyy')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Attendance History</h3>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
            {logs.length} Logs
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {logs.length > 0 ? (
              logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      log.type === 'IN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {log.type === 'IN' ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-gray-900">{log.type}</p>
                        {log.purpose && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                            {log.purpose}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {format(log.timestamp.toDate(), 'MMM dd, yyyy • hh:mm a')}
                      </p>
                    </div>
                  </div>

                  {log.purpose && (
                    <div className="hidden sm:flex items-center text-gray-400">
                      {log.purpose === 'Study Purposes' && <BookOpen className="w-4 h-4" />}
                      {log.purpose === 'Fluid Simulator' && <Waves className="w-4 h-4" />}
                      {log.purpose === 'Batch Meeting' && <Users className="w-4 h-4" />}
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No attendance logs found yet.</p>
                <p className="text-xs text-gray-400">Your history will appear here once scanned.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
