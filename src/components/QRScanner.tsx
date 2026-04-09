import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getUserByQR, createAttendanceLog } from '../services/attendanceService.ts';
import { UserProfile, LogType, LogPurpose } from '../types.ts';
import { CheckCircle2, XCircle, Loader2, Camera, BookOpen, Waves, Users, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const QRScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<{ user: UserProfile; type: LogType } | null>(null);
  const [pendingScan, setPendingScan] = useState<{ user: UserProfile; type: LogType } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const purposes: { id: LogPurpose; icon: any; color: string }[] = [
    { id: 'Study Purposes', icon: BookOpen, color: 'bg-blue-500' },
    { id: 'Fluid Simulator', icon: Waves, color: 'bg-cyan-500' },
    { id: 'Batch Meeting', icon: Users, color: 'bg-purple-500' },
  ];

  const startScanner = async (cameraIndex?: number) => {
    try {
      setCameraError(null);
      setIsScanning(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));

      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const html5QrCode = html5QrCodeRef.current || new Html5Qrcode("reader");
      html5QrCodeRef.current = html5QrCode;

      const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setAvailableCameras([]);
        throw new Error("No cameras found. Please ensure camera permissions are granted.");
      }
      
      setAvailableCameras(cameras);

      // Determine which camera to use
      let cameraId: string | null = null;
      let selectedIndex = 0;

      if (cameraIndex !== undefined && cameras[cameraIndex]) {
        cameraId = cameras[cameraIndex].id;
        selectedIndex = cameraIndex;
      } else {
        // Default logic: try to find back camera
        const backCamera = cameras.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        );
        
        if (backCamera) {
          cameraId = backCamera.id;
          selectedIndex = cameras.indexOf(backCamera);
        } else if (cameras.length > 0) {
          // Fallback to the last camera (often the back one on mobile)
          const lastIndex = cameras.length - 1;
          if (cameras[lastIndex]) {
            cameraId = cameras[lastIndex].id;
            selectedIndex = lastIndex;
          }
        }
      }

      if (!cameraId) {
        throw new Error("Could not identify a valid camera device.");
      }

      setCurrentCameraIndex(selectedIndex);
      await html5QrCode.start(cameraId, config, onScanSuccess, onScanFailure);
    } catch (err: any) {
      console.error("Failed to start scanner", err);
      setCameraError(err.message || "Camera access failed.");
      setIsScanning(false);
    }
  };

  const switchCamera = () => {
    if (availableCameras.length < 2) return;
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    startScanner(nextIndex);
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Cleanup failed", err));
      }
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    if (isProcessing || pendingScan || scanResult) return;
    
    try {
      setIsProcessing(true);
      await stopScanner(); // Stop scanning while processing
      
      const result = await getUserByQR(decodedText);
      setPendingScan({ user: result.user, type: result.nextType });
    } catch (err: any) {
      setError(err.message || "Scan failed");
      setTimeout(() => {
        setError(null);
        startScanner();
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  }

  const handleLogOut = async () => {
    if (!pendingScan || pendingScan.type !== 'OUT' || isProcessing) return;
    
    try {
      setIsProcessing(true);
      await createAttendanceLog(pendingScan.user, 'OUT');
      setScanResult({ user: pendingScan.user, type: 'OUT' });
      setPendingScan(null);
      
      setTimeout(() => {
        setScanResult(null);
        startScanner();
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to log out");
      setPendingScan(null);
      setTimeout(() => {
        setError(null);
        startScanner();
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPurpose = async (purpose: LogPurpose) => {
    if (!pendingScan || isProcessing) return;
    
    try {
      setIsProcessing(true);
      await createAttendanceLog(pendingScan.user, 'IN', purpose);
      setScanResult({ user: pendingScan.user, type: 'IN' });
      setPendingScan(null);
      
      setTimeout(() => {
        setScanResult(null);
        startScanner();
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to log attendance");
      setPendingScan(null);
      setTimeout(() => {
        setError(null);
        startScanner();
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  function onScanFailure(error: any) {
    // Silent fail for continuous scanning
  }

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Admin Scanner</h2>
        <p className="text-gray-500">Scan student QR codes to log attendance</p>
      </div>

      <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border-4 border-gray-100 shadow-xl">
        <style>
          {`
            #reader video {
              object-fit: cover !important;
              width: 100% !important;
              height: 100% !important;
            }
          `}
        </style>
        {!isScanning && !scanResult && !pendingScan && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
            {cameraError ? (
              <div className="space-y-4">
                <XCircle className="w-16 h-16 mb-4 text-red-500 mx-auto" />
                <p className="text-sm text-red-200">{cameraError}</p>
                <button 
                  onClick={() => startScanner()}
                  className="bg-white text-gray-900 px-8 py-3 rounded-full font-semibold transition-all flex items-center justify-center mx-auto space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              </div>
            ) : (
              <>
                <Camera className="w-16 h-16 mb-4 opacity-50" />
                <button 
                  onClick={() => startScanner()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition-all transform hover:scale-105"
                >
                  Start Camera
                </button>
              </>
            )}
          </div>
        )}

      <div id="reader" className={`w-full h-full min-h-[300px] ${isScanning ? "block" : "hidden"}`}></div>

        <AnimatePresence>
          {isScanning && !scanResult && !pendingScan && !error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              {/* Bounding Box Corners */}
              <div className="relative w-[250px] h-[250px]">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                
                {/* Scanning Line */}
                <motion.div 
                  animate={{ 
                    top: ["10%", "90%", "10%"],
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="absolute left-4 right-4 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)] z-10"
                />
              </div>
              
              {/* Overlay darkening */}
              <div className="absolute inset-0 bg-black/20" />
            </motion.div>
          )}

          {pendingScan && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 z-20"
            >
              <div className="mb-6 text-center">
                <h3 className="text-xl font-bold mb-1">{pendingScan.user.name}</h3>
                <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">
                  {pendingScan.type === 'IN' ? 'Select Purpose' : 'Already Logged In'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3 w-full">
                {pendingScan.type === 'IN' ? (
                  purposes.map((p) => (
                    <button
                      key={p.id}
                      disabled={isProcessing}
                      onClick={() => handleSelectPurpose(p.id)}
                      className="flex items-center space-x-4 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-left group"
                    >
                      <div className={`w-12 h-12 ${p.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <p.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="font-bold text-lg">{p.id}</span>
                    </button>
                  ))
                ) : (
                  <button
                    disabled={isProcessing}
                    onClick={handleLogOut}
                    className="flex items-center space-x-4 p-6 bg-red-500 hover:bg-red-600 rounded-2xl transition-all text-left group justify-center"
                  >
                    <XCircle className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-2xl">Log Out</span>
                  </button>
                )}
              </div>
              
              <button 
                onClick={() => {
                  setPendingScan(null);
                  startScanner();
                }}
                className="mt-6 text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {scanResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-green-500 text-white p-6 text-center z-20"
            >
              <CheckCircle2 className="w-20 h-20 mb-4" />
              <h3 className="text-2xl font-bold">{scanResult.user.name}</h3>
              <p className="text-sm opacity-90 font-mono">ID: {scanResult.user.uid.slice(0, 8)}</p>
              <p className="text-xl mt-2 font-semibold">Logged {scanResult.type}</p>
              <p className="text-sm mt-4 opacity-75">Resuming in 3s...</p>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-red-500 text-white p-6 text-center z-20"
            >
              <XCircle className="w-20 h-20 mb-4" />
              <h3 className="text-xl font-bold">Error</h3>
              <p className="mt-2">{error}</p>
              <p className="text-sm mt-4 opacity-75">Retrying in 3s...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isScanning && (
        <div className="flex space-x-4">
          {availableCameras.length > 1 && (
            <button 
              onClick={switchCamera}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Switch Camera</span>
            </button>
          )}
          <button 
            onClick={stopScanner}
            className="text-gray-500 hover:text-red-600 font-medium transition-colors"
          >
            Stop Scanner
          </button>
        </div>
      )}
    </div>
  );
};
