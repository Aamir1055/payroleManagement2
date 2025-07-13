import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { MetricCard } from '../components/Dashboard/MetricCard';

export const Dashboard: React.FC = () => {
  // State variables
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [totalMonthlySalary, setTotalMonthlySalary] = useState<number | null>(null);
  const [officeSummary, setOfficeSummary] = useState<any[]>([]);
  const [offices, setOffices] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);

  // Modal states
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);

  // Office Master state
  const [newOfficeName, setNewOfficeName] = useState('');
  const [officePositions, setOfficePositions] = useState<{
    positionName: string;
    reportingTime: string;
    dutyHours: number;
  }[]>([]);

  // Position Master state
  const [selectedOfficeForPosition, setSelectedOfficeForPosition] = useState('');
  const [newPositionName, setNewPositionName] = useState('');
  const [positionReportingTime, setPositionReportingTime] = useState('09:00');
  const [positionDutyHours, setPositionDutyHours] = useState(8);

  // Auth headers function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // Fetch functions
  const fetchOffices = async () => {
    try {
      const response = await fetch('/api/masters/offices', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch offices');
      }
      const data = await response.json();
      const officeNames = data.map((office: any) => (typeof office === 'string' ? office : office.name));
      setOffices(officeNames);
    } catch (error) {
      console.error('Failed to fetch offices:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/masters/positions', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      const data = await response.json();
      const positionNames = data.map((pos: any) => (typeof pos === 'string' ? pos : pos.title));
      setPositions(positionNames);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  };

  const fetchOfficeSummary = async () => {
    try {
      const response = await fetch('/api/employees/summary-by-office', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch office summary');
      }
      const data = await response.json();
      setOfficeSummary(data);
    } catch (error) {
      console.error('Error fetching office summary:', error);
    }
  };

  const fetchTotalEmployees = async () => {
    try {
      const response = await fetch('/api/employees/count', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch total employees');
      }
      const data = await response.json();
      setTotalEmployees(data.total);
    } catch (error) {
      console.error('Error fetching total employees:', error);
    }
  };

  const fetchTotalMonthlySalary = async () => {
    try {
      const response = await fetch('/api/employees/salary/total', {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch total salary');
      }
      const data = await response.json();
      setTotalMonthlySalary(data.totalSalary);
    } catch (error) {
      console.error('Error fetching total salary:', error);
    }
  };

  // useEffect to fetch all data on component mount
  useEffect(() => {
    fetchTotalEmployees();
    fetchTotalMonthlySalary();
    fetchOfficeSummary();
    fetchOffices();
    fetchPositions();
  }, []);

  // Office Master Functions
  const handleAddOfficePosition = () => {
    setOfficePositions([...officePositions, {
      positionName: '',
      reportingTime: '09:00',
      dutyHours: 8
    }]);
  };

  const removeOfficePosition = (index: number) => {
    setOfficePositions(officePositions.filter((_, i) => i !== index));
  };

  const updateOfficePosition = (index: number, field: string, value: string | number) => {
    const updated = [...officePositions];
    updated[index] = { ...updated[index], [field]: value };
    setOfficePositions(updated);
  };

  const handleAddOffice = async () => {
    if (!newOfficeName.trim()) {
      alert('Please enter an office name');
      return;
    }
    
    try {
      // Create office first
      const response = await fetch('/api/masters/offices', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newOfficeName })
      });

      if (!response.ok) {
        throw new Error('Failed to add office');
      }
      
      // If positions are provided, add them too
      if (officePositions.length > 0) {
        for (const position of officePositions) {
          if (position.positionName.trim()) {
            const response = await fetch('/api/masters/office-specific-position', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                officeName: newOfficeName,
                positionName: position.positionName,
                reportingTime: position.reportingTime,
                dutyHours: position.dutyHours
              })
            });

            if (!response.ok) {
              throw new Error('Failed to add position to office');
            }
          }
        }
      }
      
      alert('Office added successfully!');
      setNewOfficeName('');
      setOfficePositions([]);
      setShowOfficeModal(false);
      
      // Refresh all data
      await Promise.all([
        fetchOffices(),
        fetchPositions(),
        fetchOfficeSummary()
      ]);
      
    } catch (error) {
      console.error(error);
      alert('Failed to add office');
    }
  };

  // Position Master Functions
  const handleAddPositionToOffice = async () => {
    if (!newPositionName.trim()) {
      alert('Please enter a position name');
      return;
    }
    if (!selectedOfficeForPosition) {
      alert('Please select an office for this position');
      return;
    }
    
    try {
      const response = await fetch('/api/masters/office-specific-position', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          officeName: selectedOfficeForPosition,
          positionName: newPositionName,
          reportingTime: positionReportingTime,
          dutyHours: positionDutyHours
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add position');
      }
      
      alert('Position added successfully!');
      setNewPositionName('');
      setSelectedOfficeForPosition('');
      setPositionReportingTime('09:00');
      setPositionDutyHours(8);
      setShowPositionModal(false);
      
      // Refresh data
      await Promise.all([
        fetchPositions(),
        fetchOfficeSummary()
      ]);
      
    } catch (error) {
      console.error(error);
      alert('Failed to add position');
    }
  };

  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Overview of your payroll system"
      onAddOffice={() => setShowOfficeModal(true)}
      onAddPosition={() => setShowPositionModal(true)}
    >
      <div className="space-y-6">
        {/* Real-time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total Employees"
            value={totalEmployees !== null ? totalEmployees.toString() : '...'}
            color="blue"
          />
          <MetricCard
            title="Monthly Payroll"
            value={
              totalMonthlySalary !== null
                ? `AED ${totalMonthlySalary.toLocaleString()}`
                : '...'
            }
            color="green"
          />
          <MetricCard
            title="Total Offices"
            value={officeSummary.length.toString()}
            color="purple"
          />
        </div>

        {/* Office-wise Cards - Enhanced with real-time updates */}
        {officeSummary.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officeSummary.map((office, index) => (
              <MetricCard
                key={`${office.office}-${index}`}
                title={`${office.office} Office`}
                value={
                  <>
                    <div className="text-sm font-semibold text-blue-600">
                      Employees: {office.totalEmployees || 0}
                    </div>
                    <div className="text-sm font-semibold text-green-600">
                      Salary: AED {(office.totalSalary || 0).toLocaleString()}
                    </div>
                  </>
                }
                color="purple"
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">No office data available. Add offices to see summaries here.</p>
          </div>
        )}

        {/* Office Master Modal */}
        {showOfficeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-4/5 max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Office Master</h2>
                <p className="text-sm text-gray-600 mt-1">Add a new office and optionally define positions for it</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Office Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Office Name *</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Dubai Office, New York Branch"
                    value={newOfficeName}
                    onChange={(e) => setNewOfficeName(e.target.value)}
                  />
                </div>

                {/* Optional Positions */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Positions for this Office</h3>
                      <p className="text-sm text-gray-600">Optional: Define positions with specific timings for this office</p>
                    </div>
                    <button
                      onClick={handleAddOfficePosition}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Add Position
                    </button>
                  </div>
                  
                  {officePositions.map((position, index) => (
                    <div key={index} className="border rounded-lg p-4 mb-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Position Name</label>
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Manager, Analyst"
                            value={position.positionName}
                            onChange={(e) => updateOfficePosition(index, 'positionName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Time</label>
                          <input
                            type="time"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            value={position.reportingTime}
                            onChange={(e) => updateOfficePosition(index, 'reportingTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duty Hours</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                            value={position.dutyHours}
                            onChange={(e) => updateOfficePosition(index, 'dutyHours', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => removeOfficePosition(index)}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                  {offices.map((office, index) => (
                    <option key={index} value={office || ''}>{office || 'Unknown Office'}</option>
                  ))}
                  
                  {officePositions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No positions defined yet. You can add positions later if needed.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowOfficeModal(false);
                    setNewOfficeName('');
                    setOfficePositions([]);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOffice}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  Create Office
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Position Master Modal */}
        {showPositionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-96">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Position Master</h2>
                <p className="text-sm text-gray-600 mt-1">Add a position to a specific office</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Office *</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    value={selectedOfficeForPosition}
                    onChange={(e) => setSelectedOfficeForPosition(e.target.value)}
                  >
                    <option value="">Choose an office...</option>
                    {offices.map((office) => (
                      <option key={office} value={office}>{office}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position Name *</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Senior Developer, HR Manager"
                    value={newPositionName}
                    onChange={(e) => setNewPositionName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reporting Time</label>
                  <input
                    type="time"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    value={positionReportingTime}
                    onChange={(e) => setPositionReportingTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duty Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    value={positionDutyHours}
                    onChange={(e) => setPositionDutyHours(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowPositionModal(false);
                    setNewPositionName('');
                    setSelectedOfficeForPosition('');
                    setPositionReportingTime('09:00');
                    setPositionDutyHours(8);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPositionToOffice}
                  className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg"
                >
                  Add Position
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};