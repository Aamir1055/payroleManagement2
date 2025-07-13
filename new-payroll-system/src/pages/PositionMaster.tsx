import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Position, Office } from '../types';

const PositionMaster: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    office_id: '',
    description: '',
    reporting_time: '09:00',
    duty_hours: '8'
  });

  useEffect(() => {
    fetchPositions();
    fetchOffices();
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await axios.get('/api/positions');
      setPositions(response.data);
    } catch (error) {
      toast.error('Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffices = async () => {
    try {
      const response = await axios.get('/api/offices');
      setOffices(response.data);
    } catch (error) {
      toast.error('Failed to fetch offices');
    }
  };

  const handleOpenModal = (position?: Position) => {
    if (position) {
      setEditingPosition(position);
      setFormData({
        name: position.name,
        office_id: position.office_id.toString(),
        description: position.description || '',
        reporting_time: position.reporting_time || '09:00',
        duty_hours: position.duty_hours?.toString() || '8'
      });
    } else {
      setEditingPosition(null);
      setFormData({
        name: '',
        office_id: '',
        description: '',
        reporting_time: '09:00',
        duty_hours: '8'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPosition(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingPosition) {
        await axios.put(`/api/positions/${editingPosition.id}`, formData);
        toast.success('Position updated successfully');
      } else {
        await axios.post('/api/positions', formData);
        toast.success('Position created successfully');
      }
      fetchPositions();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save position');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this position?')) {
      try {
        await axios.delete(`/api/positions/${id}`);
        toast.success('Position deleted successfully');
        fetchPositions();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete position');
      }
    }
  };

  // Group positions by office
  const positionsByOffice = positions.reduce((acc, position) => {
    const officeName = position.office_name || 'Unknown Office';
    if (!acc[officeName]) {
      acc[officeName] = [];
    }
    acc[officeName].push(position);
    return acc;
  }, {} as Record<string, Position[]>);

  if (loading && positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Position Master</h1>
          <p className="text-gray-600">Manage positions across your offices</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Position</span>
        </button>
      </div>

      {/* Positions by Office */}
      <div className="space-y-6">
        {Object.entries(positionsByOffice).map(([officeName, officePositions]) => (
          <div key={officeName} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{officeName}</h2>
              <p className="text-sm text-gray-600">{officePositions.length} positions</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {officePositions.map((position) => (
                  <div key={position.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Users className="h-6 w-6 text-blue-600 mr-2" />
                        <h3 className="font-medium text-gray-900">{position.name}</h3>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleOpenModal(position)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(position.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      {position.description && (
                        <p className="text-xs">{position.description}</p>
                      )}
                      <p>
                        <span className="font-medium">Reporting Time:</span> {position.reporting_time || 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Duty Hours:</span> {position.duty_hours || 'N/A'} hours
                      </p>
                      <p>
                        <span className="font-medium">Employees:</span> {position.employee_count || 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {Object.keys(positionsByOffice).length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No positions found</h3>
            <p className="text-gray-600">Create your first position to get started.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingPosition ? 'Edit Position' : 'Add New Position'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office *
                </label>
                <select
                  value={formData.office_id}
                  onChange={(e) => setFormData({ ...formData, office_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Office</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingPosition ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionMaster;
