import React, { useState, useEffect } from 'react';
import { AttendanceLog } from '../types.ts';
import { subscribeToLogs, getAllLogsForExport } from '../services/attendanceService.ts';
import { exportLogsToExcel } from '../lib/excelExport.ts';
import { FileSpreadsheet, Clock, ArrowDownLeft, ArrowUpRight, Search, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AdminDashboardProps {
  userId: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ userId }) => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const unsubscribe = subscribeToLogs(null, true, (newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const allLogs = await getAllLogsForExport();
      await exportLogsToExcel(allLogs);
    } catch (error) {
      console.error('Export failed', error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const logDate = log.dateStr; // YYYY-MM-DD
    const matchesStartDate = !startDate || logDate >= startDate;
    const matchesEndDate = !endDate || logDate <= endDate;
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Attendance Logs</h2>
          <p className="text-gray-500">Real-time monitoring and reporting</p>
        </div>
        
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>{isExporting ? 'Generating...' : 'Export to Excel'}</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by student name or ID..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-2">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">From</label>
            <input 
              type="date" 
              className="bg-transparent outline-none text-sm font-medium text-gray-700"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="h-8 w-px bg-gray-100 mx-2" />
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">To</label>
            <input 
              type="date" 
              className="bg-transparent outline-none text-sm font-medium text-gray-700"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(searchTerm || startDate || endDate) && (
            <button 
              onClick={clearFilters}
              className="ml-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear Filters"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-bottom border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Purpose</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{log.userName}</span>
                      <span className="text-xs text-gray-500 font-mono">{log.userId.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2 opacity-50" />
                      {format(log.timestamp.toDate(), 'HH:mm:ss')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      log.type === 'IN' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {log.type === 'IN' ? <ArrowDownLeft className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.purpose ? (
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                        {log.purpose}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {format(log.timestamp.toDate(), 'MMM dd, yyyy')}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No logs found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
