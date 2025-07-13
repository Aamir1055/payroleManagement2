import React, { useState, useEffect } from 'react';
import { FileTable, FileCheck, FileDownload } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AttendanceReport: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ officeId: '', month: '', year: '' });

  const fetchAttendanceData = async (newPage: number, resetPage = false) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/attendance', {
        params: { 
          page: resetPage ? 1 : newPage,
          limit: 10,
          ...filter,
        },
      });
      setAttendanceData(response.data.data);
      setTotalPages(response.data.pagination.pages);
      setPage(resetPage ? 1 : newPage);
    } catch (error) {
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData(page);
  }, [page, filter]);

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/attendance/export/excel', {
        params: { ...filter },
        responseType: 'blob',
      });

      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.ms-excel' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Attendance_Report.xlsx');
      document.body.appendChild(link);
      link.click();
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to export attendance');
    }
  };

  const updateFilter = (field: string, value: string) => {
    setFilter((prev) => ({ ...prev, [field]: value }));
    fetchAttendanceData(1, true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
          <p className="text-gray-600">Generate and view attendance reports</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <FileDownload className="h-5 w-5 mr-2" />
          Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
          <select
            value={filter.officeId}
            onChange={(e) => updateFilter('officeId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Offices</option>
            {/* Add options dynamically here */}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={filter.month}
            onChange={(e) => updateFilter('month', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <input
            type="number"
            value={filter.year}
            onChange={(e) => updateFilter('year', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="YYYY"
            min="2000"
            max={new Date().getFullYear()}
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Office
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Punch In
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Punch Out
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours Worked
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendanceData.map((record: any) => (
              <tr key={`${record.employee_id}-${record.date}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.employee_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.employee_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.office_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.punch_in}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.punch_out}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.hours_worked.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-700">
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>
        </p>
        <div className="flex items-center space-x-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;

