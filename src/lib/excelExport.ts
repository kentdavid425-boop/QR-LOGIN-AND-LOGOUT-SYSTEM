import ExcelJS from 'exceljs';
import { AttendanceLog } from '../types.ts';
import { format } from 'date-fns';

export const exportLogsToExcel = async (logs: AttendanceLog[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Logs');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Student Name', key: 'name', width: 25 },
    { header: 'User ID', key: 'userId', width: 30 },
    { header: 'Time', key: 'time', width: 15 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Purpose', key: 'purpose', width: 20 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  logs.forEach(log => {
    const date = log.timestamp.toDate();
    worksheet.addRow({
      date: format(date, 'yyyy-MM-dd'),
      name: log.userName,
      userId: log.userId,
      time: format(date, 'HH:mm:ss'),
      type: log.type,
      purpose: log.purpose || '-'
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Attendance_Logs_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
