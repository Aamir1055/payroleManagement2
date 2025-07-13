import React, { useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Upload, Download, FileSpreadsheet, Users, Calendar, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface AttendanceRecord {
  employeeId: string;
  punchInTime: string;
  punchOutTime: string;
  date: string;
}

interface PreviewData {
  headers: string[];
  rows: any[][];
  fileName: string;
}

export const Payroll: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const generatePayrollReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/payroll/report?month=${selectedMonth}&year=${selectedYear}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payroll');
      }

      const data = await response.json();
      setPayrollData(data);
    } catch (error) {
      console.error('Payroll fetch error:', error);
      alert('Failed to generate payroll report');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Reading file...');
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const headers = jsonData[0];
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

      setPreviewData({
        headers,
        rows: rows.slice(0, 10),
        fileName: file.name
      });

      setUploadStatus('File loaded. Click Upload Data to continue.');
    } catch (error: any) {
      console.error('File error:', error);
      setUploadStatus('Error reading file');
    }
  };

  const processUpload = async () => {
    if (!previewData) return;

    const attendanceRecords: AttendanceRecord[] = [];

    for (const row of previewData.rows) {
      if (row[0] && row[1] && row[2] && row[3]) {
        attendanceRecords.push({
          employeeId: row[0],
          punchInTime: row[1],
          punchOutTime: row[2],
          date: row[3]
        });
      }
    }

    if (attendanceRecords.length === 0) {
      alert('No valid records found');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/attendance/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceData: attendanceRecords })
      });

      if (!response.ok) throw new Error('Upload failed');

      setUploadStatus(`Uploaded ${attendanceRecords.length} records`);
      setPreviewData(null);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Upload failed');
    }
  };

  const downloadSampleExcel = () => {
    const sample = [
      { EmployeeID: 'EMP001', PunchInTime: '09:00', PunchOutTime: '17:30', Date: '2025-07-01' },
      { EmployeeID: 'EMP002', PunchInTime: '09:15', PunchOutTime: '17:00', Date: '2025-07-01' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer]), 'attendance_template.xlsx');
  };

  const exportPayrollToExcel = () => {
    if (payrollData.length === 0) return alert('No data to export');

    const exportData = payrollData.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Office': emp.office,
      'Present Days': emp.presentDays,
      'Late Days': emp.lateDays,
      'Deductions': emp.deductions,
      'Net Salary': emp.netSalary
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer]), `payroll_${selectedYear}_${selectedMonth}.xlsx`);
  };

  return (
    <MainLayout title="Payroll Management" subtitle="Upload attendance and generate payroll reports">
      <div className="space-y-6">

        {/* Period Selection */}
        <div className="bg-white p-4 rounded border shadow-sm">
          <div className="flex gap-4 items-center">
            <Calendar className="text-blue-500" />
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            <button onClick={generatePayrollReport} className="bg-blue-600 text-white px-4 py-2 rounded">
              {loading ? 'Loading...' : 'Generate Payroll'}
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white p-4 rounded border shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-700">Upload Excel file (EmployeeID, PunchInTime, PunchOutTime, Date)</div>
            <button onClick={downloadSampleExcel} className="text-blue-600 underline text-sm">Download Sample</button>
          </div>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
          {uploadStatus && <p className="text-sm text-gray-600">{uploadStatus}</p>}
          {previewData && (
            <>
              <button onClick={processUpload} className="bg-green-600 text-white px-4 py-2 rounded">
                Upload Data ({previewData.rows.length} records)
              </button>
              <table className="mt-4 w-full text-sm border">
                <thead>
                  <tr>{previewData.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => <td key={j} className="border px-2 py-1">{cell || '-'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Payroll Table */}
        {payrollData.length > 0 && (
          <div className="bg-white p-4 rounded border shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Payroll Report</h3>
              <button onClick={exportPayrollToExcel} className="bg-green-600 text-white px-3 py-1 rounded">
                Export to Excel
              </button>
            </div>
            <table className="w-full text-sm border">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Office</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.map((emp, i) => (
                  <tr key={i}>
                    <td>{emp.name} ({emp.employeeId})</td>
                    <td>{emp.office}</td>
                    <td>{emp.presentDays}</td>
                    <td>{emp.lateDays}</td>
                    <td>AED {emp.deductions}</td>
                    <td className="text-green-700 font-semibold">AED {emp.netSalary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
