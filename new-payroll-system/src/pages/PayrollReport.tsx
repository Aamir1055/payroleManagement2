import React, { useState, useEffect } from 'react';
import { Calculator, FileDownload, Calendar } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Payroll, Office } from '../types';

const PayrollReport: React.FC = () => {
  const [payrollData, setPayrollData] = useState<Payroll[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedOffice, setSelectedOffice] = useState('');

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const response = await axios.get('/api/offices');
      setOffices(response.data);
    } catch (error) {
      toast.error('Failed to fetch offices');
    }
  };

  const calculatePayroll = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`/api/payroll/calculate/${selectedYear}/${selectedMonth}`, {
        officeId: selectedOffice || null
      });
      toast.success('Payroll calculated successfully');
      fetchPayrollReport();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to calculate payroll');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/payroll/report/${selectedYear}/${selectedMonth}`, {
        params: { officeId: selectedOffice || null }
      });
      setPayrollData(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch payroll report');
    } finally {
      setLoading(false);
    }
  };

  const exportPayroll = async () => {
    try {
      const response = await axios.get(`/api/payroll/export/${selectedYear}/${selectedMonth}`, {
        params: { officeId: selectedOffice || null },
        responseType: 'blob'
      });

      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.ms-excel' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payroll_${selectedMonth}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      toast.success('Export started');
    } catch (error) {
      toast.error('Failed to export payroll');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Report</h1>
          <p className="text-gray-600">Calculate and generate payroll reports</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={calculatePayroll}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Calculator className="h-5 w-5 mr-2" />
            Calculate Payroll
          </button>
          <button
            onClick={exportPayroll}
            disabled={loading || payrollData.length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <FileDownload className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Offices</option>
              {offices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="2000"
              max={new Date().getFullYear()}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={fetchPayrollReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      {payrollData.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Office
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Half Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Late Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leaves
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deductions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Salary
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{record.name}</div>
                      <div className="text-sm text-gray-500">{record.employee_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.office_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.present_days}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.half_days}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.late_days} ({record.excess_late_days} excess)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.absent_days}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(record.monthly_salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(record.total_deduction)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(record.net_salary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No Data Message */}
      {payrollData.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payroll data found</h3>
          <p className="text-gray-600">
            Select a month and year, then click "Calculate Payroll" to generate the report.
          </p>
        </div>
      )}
    </div>
  );
};

export default PayrollReport;
