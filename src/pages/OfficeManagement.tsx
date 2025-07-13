import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Building2, Briefcase } from 'lucide-react';

interface Office {
  office_id: number;
  office_name: string;
  position: string;
  employeeCount?: number;
}

interface Position {
  position_id: number;
  position_name: string;
  description: string;
  reporting_time?: string;
  duty_hours?: string;
}

interface OfficeWithPositions extends Office {
  positions: Position[];
  expanded: boolean;
}

interface ApiError extends Error {
  message: string;
  status?: number;
}

const isApiError = (error: unknown): error is ApiError => {
  return error instanceof Error && 'message' in error;
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`http://localhost:5000${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorData: { message?: string } = {};
    try {
      errorData = await response.json();
    } catch (e) {
      errorData.message = 'Request failed';
    }
    const error: ApiError = new Error(errorData.message || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export const OfficeManagement: React.FC = () => {
  const [offices, setOffices] = useState<OfficeWithPositions[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddOfficeModal, setShowAddOfficeModal] = useState(false);
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [newOffice, setNewOffice] = useState({ name: '', position: '' });
  const [newPosition, setNewPosition] = useState({ 
    title: '', 
    description: '',
    reporting_time: '09:00',
    duty_hours: '8'
  });
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const handleApiError = (error: unknown) => {
    console.error('API Error:', error);
    if (isApiError(error)) {
      if (error.message !== 'Unauthorized') {
        setError(error.message);
      }
    } else {
      setError('An unknown error occurred');
    }
  };

  const fetchOfficesWithPositions = async () => {
    setLoading(true);
    setError(null);
    try {
      const [officesData, positionsData] = await Promise.all([
        fetchWithAuth('/api/masters/offices'),
        fetchWithAuth('/api/masters/office-positions')
      ]);
      
      const groupedData: Record<number, OfficeWithPositions> = {};
      
      officesData.forEach((office: Office) => {
        groupedData[office.office_id] = {
          ...office,
          positions: [],
          expanded: false
        };
      });
      
      positionsData.forEach((group: any) => {
        if (groupedData[group.office_id]) {
          groupedData[group.office_id].positions = group.positions.map((pos: any) => ({
            position_id: pos.position_id,
            position_name: pos.position_name,
            reporting_time: pos.reporting_time,
            duty_hours: pos.duty_hours,
            description: pos.description || ''
          }));
        }
      });
      
      setOffices(Object.values(groupedData));
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandOffice = (officeId: number) => {
    setOffices(offices.map(office => 
      office.office_id === officeId 
        ? { ...office, expanded: !office.expanded } 
        : office
    ));
  };

  const handleAddOffice = async () => {
    if (!newOffice.name.trim()) {
      setError('Office name is required');
      return;
    }

    setError(null);
    try {
      await fetchWithAuth('/api/masters/offices', {
        method: 'POST',
        body: JSON.stringify({
          name: newOffice.name,
          position: newOffice.position
        })
      });

      setNewOffice({ name: '', position: '' });
      setShowAddOfficeModal(false);
      await fetchOfficesWithPositions();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleAddPosition = async () => {
    if (!selectedOffice || !newPosition.title.trim()) {
      setError('Position title is required');
      return;
    }

    setError(null);
    try {
      await fetchWithAuth('/api/masters/office-specific-position', {
        method: 'POST',
        body: JSON.stringify({
          officeName: selectedOffice.office_name,
          positionName: newPosition.title,
          reportingTime: newPosition.reporting_time,
          dutyHours: newPosition.duty_hours
        })
      });

      if (newPosition.description) {
        await fetchWithAuth('/api/masters/positions', {
          method: 'POST',
          body: JSON.stringify({
            title: newPosition.title,
            description: newPosition.description
          })
        });
      }
      
      setNewPosition({ 
        title: '', 
        description: '',
        reporting_time: '09:00',
        duty_hours: '8'
      });
      setShowAddPositionModal(false);
      await fetchOfficesWithPositions();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDeleteOffice = async (officeId: number) => {
    if (!confirm('Are you sure you want to delete this office?')) return;

    try {
      await fetchWithAuth(`/api/masters/offices/${officeId}`, {
        method: 'DELETE'
      });
      await fetchOfficesWithPositions();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDeletePosition = async (officeId: number, positionId: number) => {
    if (!confirm('Are you sure you want to remove this position from the office?')) return;

    try {
      await fetchWithAuth(`/api/masters/office-positions/${officeId}/${positionId}`, {
        method: 'DELETE'
      });
      await fetchOfficesWithPositions();
    } catch (error) {
      handleApiError(error);
    }
  };

  const startEditPosition = (position: Position) => {
    setEditingPosition(position);
    setSelectedOffice(offices.find(o => 
      o.positions.some(p => p.position_id === position.position_id)
    ) || null);
    setNewPosition({
      title: position.position_name,
      description: position.description || '',
      reporting_time: position.reporting_time || '09:00',
      duty_hours: position.duty_hours || '8'
    });
    setShowAddPositionModal(true);
  };

  const handleUpdatePosition = async () => {
    if (!editingPosition || !selectedOffice) return;

    try {
      // Updated PUT request with position ID
      await fetchWithAuth(`/api/masters/office-specific-position/${editingPosition.position_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          officeName: selectedOffice.office_name,
          positionName: newPosition.title,
          reportingTime: newPosition.reporting_time,
          dutyHours: newPosition.duty_hours
        })
      });

      if (newPosition.description) {
        await fetchWithAuth(`/api/masters/positions/${editingPosition.position_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: newPosition.title,
            description: newPosition.description
          })
        });
      }
      
      setEditingPosition(null);
      setNewPosition({ 
        title: '', 
        description: '',
        reporting_time: '09:00',
        duty_hours: '8'
      });
      setShowAddPositionModal(false);
      await fetchOfficesWithPositions();
    } catch (error) {
      handleApiError(error);
    }
  };

  const cancelEdit = () => {
    setEditingPosition(null);
    setNewPosition({ 
      title: '', 
      description: '',
      reporting_time: '09:00',
      duty_hours: '8'
    });
    setError(null);
  };

  useEffect(() => {
    fetchOfficesWithPositions();
  }, []);

  return (
    <MainLayout 
      title="Office Management" 
      subtitle="Manage all company offices and their positions"
    >
      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">All Offices</h2>
          <button
            onClick={() => setShowAddOfficeModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700"
          >
            <Plus className="mr-2" /> Add Office
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading offices...</p>
          </div>
        ) : offices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No offices found. Create your first office to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {offices.map((office) => (
              <div key={office.office_id} className="border rounded-lg overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleExpandOffice(office.office_id)}
                >
                  <div className="flex items-center">
                    {office.expanded ? (
                      <ChevronDown className="mr-2 text-gray-500" />
                    ) : (
                      <ChevronRight className="mr-2 text-gray-500" />
                    )}
                    <Building2 className="mr-3 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">{office.office_name}</h3>
                      <p className="text-sm text-gray-600">{office.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {office.positions.length} positions
                    </span>
                    {office.employeeCount && (
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {office.employeeCount} employees
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOffice(office);
                        setShowAddPositionModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Add Position"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOffice(office.office_id);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete Office"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {office.expanded && (
                  <div className="p-4 border-t">
                    {office.positions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No positions assigned to this office yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Position
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Reporting Time
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Duty Hours
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {office.positions.map((position) => (
                              <tr key={position.position_id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Briefcase className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {position.position_name}
                                      </div>
                                      {position.description && (
                                        <div className="text-sm text-gray-500 truncate max-w-xs">
                                          {position.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {position.reporting_time || 'Not set'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {position.duty_hours || 'Not set'} hours
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditPosition(position);
                                    }}
                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                    title="Edit Position"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePosition(office.office_id, position.position_id);
                                    }}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete Position"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Office Modal */}
      {showAddOfficeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Office</h3>
              <button
                onClick={() => {
                  setShowAddOfficeModal(false);
                  setNewOffice({ name: '', position: '' });
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Name *</label>
                <input
                  type="text"
                  value={newOffice.name}
                  onChange={(e) => setNewOffice({ ...newOffice, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter office name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={newOffice.position}
                  onChange={(e) => setNewOffice({ ...newOffice, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter position"
                />
              </div>
            </div>
            <div className="flex justify-end p-4 border-t space-x-3">
              <button
                onClick={() => {
                  setShowAddOfficeModal(false);
                  setNewOffice({ name: '', position: '' });
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOffice}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Office
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Position Modal */}
      {showAddPositionModal && selectedOffice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingPosition ? 'Edit Position' : 'Add Position to ' + selectedOffice.office_name}
              </h3>
              <button
                onClick={() => {
                  setShowAddPositionModal(false);
                  setNewPosition({ 
                    title: '', 
                    description: '',
                    reporting_time: '09:00',
                    duty_hours: '8'
                  });
                  setEditingPosition(null);
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position Title *</label>
                <input
                  type="text"
                  value={newPosition.title}
                  onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter position title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newPosition.description}
                  onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter position description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Time *</label>
                  <input
                    type="time"
                    value={newPosition.reporting_time}
                    onChange={(e) => setNewPosition({ ...newPosition, reporting_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duty Hours *</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={newPosition.duty_hours}
                    onChange={(e) => setNewPosition({ ...newPosition, duty_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t space-x-3">
              <button
                onClick={() => {
                  setShowAddPositionModal(false);
                  setNewPosition({ 
                    title: '', 
                    description: '',
                    reporting_time: '09:00',
                    duty_hours: '8'
                  });
                  setEditingPosition(null);
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingPosition ? handleUpdatePosition : handleAddPosition}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingPosition ? 'Update Position' : 'Add Position'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};