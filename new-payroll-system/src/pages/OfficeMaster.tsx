import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Office } from '../types';

const OfficeMaster: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    reporting_time: '09:00',
    duty_hours: '8'
  });

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    try {
      const response = await axios.get('/api/offices');
      setOffices(response.data);
    } catch (error) {
      toast.error('Failed to fetch offices');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (office?: Office) => {
    if (office) {
      setEditingOffice(office);
      setFormData({
        name: office.name,
        location: office.location || '',
        reporting_time: office.reporting_time,
        duty_hours: office.duty_hours.toString()
      });
    } else {
      setEditingOffice(null);
      setFormData({
        name: '',
        location: '',
        reporting_time: '09:00',
        duty_hours: '8'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOffice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingOffice) {
        await axios.put(`/api/offices/${editingOffice.id}`, formData);
        toast.success('Office updated successfully');
      } else {
        await axios.post('/api/offices', formData);
        toast.success('Office created successfully');
      }
      fetchOffices();
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save office');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this office?')) {
      try {
        await axios.delete(`/api/offices/${id}`);
        toast.success('Office deleted successfully');
        fetchOffices();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete office');
      }
    }
  };

  if (loading && offices.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Office Master</h1>
          <p className="text-gray-600">Manage your office locations and settings</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Office</span>
        </button>
      </div>

      {/* Offices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offices.map((office) => (
          <div key={office.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">{office.name}</h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleOpenModal(office)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(office.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Location:</span> {office.location || 'N/A'}</p>
              <p><span className="font-medium">Reporting Time:</span> {office.reporting_time}</p>
              <p><span className="font-medium">Duty Hours:</span> {office.duty_hours} hours</p>
              <p><span className="font-medium">Employees:</span> {office.employee_count || 0}</p>
              <p><span className="font-medium">Total Salary:</span> ${(office.total_salary || 0).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingOffice ? 'Edit Office' : 'Add New Office'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Name *
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
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reporting Time
                </label>
                <input
                  type="time"
                  value={formData.reporting_time}
                  onChange={(e) => setFormData({ ...formData, reporting_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duty Hours
                </label>
                <input
                  type="number"
                  value={formData.duty_hours}
                  onChange={(e) => setFormData({ ...formData, duty_hours: e.target.value })}
                  min="1"
                  max="24"
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
                  {loading ? 'Saving...' : editingOffice ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeMaster;
