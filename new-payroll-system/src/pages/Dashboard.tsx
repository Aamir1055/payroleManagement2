import React, { useState, useEffect } from 'react';
import { Users, Building, DollarSign, Calendar, TrendingUp, Clock } from 'lucide-react';
import axios from 'axios';
import { EmployeeStats } from '../types';

const Dashboard: React.FC = () => {
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchEmployeeStats();
  }, []);

  const fetchEmployeeStats = async () => {
    try {
      const response = await axios.get('/api/employees/stats/summary');
      setEmployeeStats(response.data);
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-md ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your payroll system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={employeeStats?.total || 0}
          icon={<Users className="h-6 w-6 text-white" />}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Offices"
          value={employeeStats?.byOffice.length || 0}
          icon={<Building className="h-6 w-6 text-white" />}
          color="bg-green-500"
        />
        <StatCard
          title="Total Salary"
          value={formatCurrency(
            employeeStats?.byOffice.reduce((sum, office) => sum + (office.total_salary || 0), 0) || 0
          )}
          icon={<DollarSign className="h-6 w-6 text-white" />}
          color="bg-purple-500"
        />
        <StatCard
          title="Current Month"
          value={`${currentMonth}/${currentYear}`}
          icon={<Calendar className="h-6 w-6 text-white" />}
          color="bg-orange-500"
        />
      </div>

      {/* Office Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Office-wise Employee Distribution</h3>
            <div className="space-y-4">
              {employeeStats?.byOffice.map((office, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{office.office_name}</p>
                    <p className="text-sm text-gray-500">{office.employee_count} employees</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(office.total_salary || 0)}
                    </p>
                    <p className="text-sm text-gray-500">Total Salary</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Position-wise Distribution</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {employeeStats?.byPosition.map((position, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{position.position_name}</p>
                    <p className="text-sm text-gray-500">{position.office_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{position.employee_count}</p>
                    <p className="text-sm text-gray-500">employees</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Users className="h-6 w-6 text-blue-600 mr-3" />
              <span className="text-sm font-medium text-blue-900">Add Employee</span>
            </button>
            <button className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <Building className="h-6 w-6 text-green-600 mr-3" />
              <span className="text-sm font-medium text-green-900">Manage Offices</span>
            </button>
            <button className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <Clock className="h-6 w-6 text-purple-600 mr-3" />
              <span className="text-sm font-medium text-purple-900">Upload Attendance</span>
            </button>
            <button className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <TrendingUp className="h-6 w-6 text-orange-600 mr-3" />
              <span className="text-sm font-medium text-orange-900">Generate Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
