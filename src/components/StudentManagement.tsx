import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types.ts';
import { createUser, subscribeToAllUsers, updateUserRole } from '../services/attendanceService.ts';
import { UserPlus, Search, GraduationCap, Mail, QrCode, X, CheckCircle2, AlertCircle, Download, Shield, ShieldCheck, Printer, FileArchive, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const StudentManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [loading, setLoading] = useState(false);
  const [isExportingBatch, setIsExportingBatch] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const downloadQR = async (svgId: string, studentName: string) => {
    const svg = document.getElementById(svgId);
    if (!svg) return null;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise<string | null>((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    });
  };

  const handleDownloadSingle = async (svgId: string, studentName: string) => {
    const pngData = await downloadQR(svgId, studentName);
    if (pngData) {
      const downloadLink = document.createElement('a');
      downloadLink.download = `${studentName}_QR.png`;
      downloadLink.href = pngData;
      downloadLink.click();
    }
  };

  const handleBatchDownload = async () => {
    if (filteredUsers.length === 0) return;
    setIsExportingBatch(true);
    const zip = new JSZip();
    
    try {
      for (const user of filteredUsers) {
        const svgId = `qr-${user.uid}`;
        const pngData = await downloadQR(svgId, user.name);
        if (pngData) {
          const base64Data = pngData.split(',')[1];
          zip.file(`${user.name}_${user.batchNumber || 'NoBatch'}_QR.png`, base64Data, { base64: true });
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Batch_QR_Codes_${new Date().getTime()}.zip`);
    } catch (err) {
      console.error('Batch download failed', err);
      alert('Failed to generate batch ZIP');
    } finally {
      setIsExportingBatch(false);
    }
  };

  const handlePrintBatch = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrCodesHtml = filteredUsers.map(user => {
      const svg = document.getElementById(`qr-${user.uid}`);
      return `
        <div style="display: inline-block; margin: 20px; text-align: center; border: 1px solid #eee; padding: 20px; border-radius: 10px; width: 200px;">
          <div style="margin-bottom: 10px;">${svg?.outerHTML}</div>
          <div style="font-family: sans-serif; font-weight: bold; font-size: 14px;">${user.name}</div>
          <div style="font-family: sans-serif; font-size: 12px; color: #666;">${user.role === 'admin' ? 'Admin' : 'Batch ' + (user.batchNumber || 'N/A')}</div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Codes</title>
          <style>
            @media print {
              .no-print { display: none; }
              body { margin: 0; padding: 20px; }
            }
            body { display: flex; flex-wrap: wrap; justify-content: center; }
          </style>
        </head>
        <body>
          ${qrCodesHtml}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    const unsubscribe = subscribeToAllUsers(setUsers);
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      await createUser({ name, email, batchNumber: role === 'student' ? batchNumber : undefined, role });
      setMessage({ type: 'success', text: 'User added successfully!' });
      setName('');
      setEmail('');
      setBatchNumber('');
      setRole('student');
      setTimeout(() => {
        setIsAdding(false);
        setMessage(null);
      }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add user' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    try {
      await updateUserRole(user.uid, newRole);
      if (selectedUser?.uid === user.uid) {
        setSelectedUser({ ...user, role: newRole });
      }
    } catch (err: any) {
      alert('Failed to update role: ' + err.message);
    }
  };

  const uniqueBatches = Array.from(new Set(users.map(u => u.batchNumber).filter(Boolean))).sort();

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBatch = batchFilter === 'all' || u.batchNumber === batchFilter;
    
    return matchesSearch && matchesBatch;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-500">Add and manage student and admin profiles</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handlePrintBatch}
            disabled={filteredUsers.length === 0}
            className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
            title="Print all filtered QR codes"
          >
            <Printer className="w-5 h-5" />
            <span className="hidden sm:inline">Print Batch</span>
          </button>
          
          <button 
            onClick={handleBatchDownload}
            disabled={filteredUsers.length === 0 || isExportingBatch}
            className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
            title="Download all filtered QR codes as ZIP"
          >
            {isExportingBatch ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileArchive className="w-5 h-5" />}
            <span className="hidden sm:inline">Download ZIP</span>
          </button>

          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by name, email, or batch..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-2 min-w-[180px]">
          <div className="flex flex-col w-full">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filter by Batch</label>
            <select 
              className="bg-transparent outline-none text-sm font-medium text-gray-700 cursor-pointer"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
            >
              <option value="all">All Batches</option>
              {uniqueBatches.map(batch => (
                <option key={batch} value={batch}>Batch {batch}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <motion.div 
            layoutId={user.uid}
            key={user.uid}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative"
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                onClick={() => setSelectedUser(user)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
                  user.role === 'admin' ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                }`}
              >
                {user.role === 'admin' ? <ShieldCheck className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-500'
              }`}>
                {user.role === 'admin' ? 'Admin' : `Batch ${user.batchNumber || 'N/A'}`}
              </div>
            </div>
            
            <div onClick={() => setSelectedUser(user)} className="cursor-pointer">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h3>
              <p className="text-sm text-gray-500 mb-4 flex items-center">
                <Mail className="w-3 h-3 mr-1" />
                {user.email}
              </p>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
              <div className="bg-white p-2 rounded-lg border border-gray-100">
                <QRCodeSVG 
                  id={`qr-${user.uid}`}
                  value={user.qrCodeUuid} 
                  size={60}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleDownloadSingle(`qr-${user.uid}`, user.name)}
                  className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-900 hover:text-white transition-all"
                  title="Download QR"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setSelectedUser(user)}
                  className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                  title="View Profile"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Add User</h3>
                  <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${role === 'admin' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      Admin
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                    <input 
                      required
                      type="email"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {role === 'student' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Batch Number</label>
                      <input 
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="2024-A"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                      />
                    </div>
                  )}

                  {message && (
                    <div className={`p-4 rounded-xl flex items-center space-x-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      <span className="text-sm font-medium">{message.text}</span>
                    </div>
                  )}

                  <button 
                    disabled={loading}
                    type="submit"
                    className={`w-full py-4 rounded-xl font-bold transition-all disabled:opacity-50 text-white ${role === 'admin' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {loading ? 'Adding...' : `Create ${role === 'admin' ? 'Admin' : 'Student'} Profile`}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              layoutId={selectedUser.uid}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className={`${selectedUser.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'} p-8 text-white text-center relative`}>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  {selectedUser.role === 'admin' ? <ShieldCheck className="w-10 h-10" /> : <GraduationCap className="w-10 h-10" />}
                </div>
                <h3 className="text-2xl font-bold">{selectedUser.name}</h3>
                <p className="opacity-80">{selectedUser.role === 'admin' ? 'Administrator' : `Batch ${selectedUser.batchNumber || 'N/A'}`}</p>
              </div>
              
              <div className="p-8 flex flex-col items-center">
                <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-gray-50 mb-6">
                  <QRCodeSVG 
                    id="student-qr-modal"
                    value={selectedUser.qrCodeUuid} 
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <button 
                  onClick={() => handleDownloadSingle('student-qr-modal', selectedUser.name)}
                  className="flex items-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all active:scale-95 mb-6"
                >
                  <Download className="w-5 h-5" />
                  <span>Download QR Code</span>
                </button>

                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase">Email</span>
                    <span className="text-sm font-medium text-gray-900">{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase">Role</span>
                    <button 
                      onClick={() => handleToggleRole(selectedUser)}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {selectedUser.role === 'admin' ? <Shield className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                      <span>{selectedUser.role === 'admin' ? 'Admin' : 'Student'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase">Registration</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${selectedUser.uid.length > 30 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {selectedUser.uid.length > 30 ? 'Completed' : 'Pending Login'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
