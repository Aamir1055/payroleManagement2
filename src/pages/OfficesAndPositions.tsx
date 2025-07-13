import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Office {
  office_id: number;
  office_name: string;
  position: string;
}

interface Position {
  position_id: number;
  position_name: string;
}

// Helper function for authenticated fetch requests
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
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const OfficesAndPositions: React.FC = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [newOffice, setNewOffice] = useState({ name: '', position: '' });
  const [newPosition, setNewPosition] = useState({ name: '' });
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);

  const fetchOffices = async () => {
    try {
      const data = await fetchWithAuth('/api/masters/offices');
      setOffices(data);
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const data = await fetchWithAuth('/api/masters/positions');
      setPositions(data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const handleAddOffice = async () => {
    try {
      await fetchWithAuth('/api/masters/offices', {
        method: 'POST',
        body: JSON.stringify({
          name: newOffice.name,
          position: newOffice.position
        })
      });
      setNewOffice({ name: '', position: '' });
      setShowOfficeModal(false);
      fetchOffices();
    } catch (error) {
      console.error('Error adding office:', error);
    }
  };

  const handleAddPosition = async () => {
    try {
      await fetchWithAuth('/api/masters/positions', {
        method: 'POST',
        body: JSON.stringify({
          name: newPosition.name
        })
      });
      setNewPosition({ name: '' });
      setShowPositionModal(false);
      fetchPositions();
    } catch (error) {
      console.error('Error adding position:', error);
    }
  };

  const handleDeleteOffice = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this office?')) {
      try {
        await fetchWithAuth(`/api/masters/offices/${id}`, {
          method: 'DELETE'
        });
        fetchOffices();
      } catch (error) {
        console.error('Error deleting office:', error);
      }
    }
  };

  const handleDeletePosition = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this position?')) {
      try {
        await fetchWithAuth(`/api/masters/positions/${id}`, {
          method: 'DELETE'
        });
        fetchPositions();
      } catch (error) {
        console.error('Error deleting position:', error);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOffices(), fetchPositions()])
      .finally(() => setLoading(false));
  }, []);

  return (
    <MainLayout title="Manage Offices & Positions" subtitle="Oversee all company offices and job positions">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Offices management */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Offices</h2>
            <button 
              onClick={() => setShowOfficeModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-600"
            >
              <Plus className="mr-2" /> Add Office
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading offices...</div>
          ) : offices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No offices found
            </div>
          ) : (
            <ul className="space-y-4">
              {offices.map((office) => (
                <li key={office.office_id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-semibold">{office.office_name}</p>
                    <p className="text-sm text-gray-500">{office.position}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-blue-500 hover:text-blue-700">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteOffice(office.office_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Positions management */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Positions</h2>
            <button 
              onClick={() => setShowPositionModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-600"
            >
              <Plus className="mr-2" /> Add Position
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading positions...</div>
          ) : positions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No positions found
            </div>
          ) : (
            <ul className="space-y-4">
              {positions.map((position) => (
                <li key={position.position_id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                  <p className="font-semibold">{position.position_name}</p>
                  <div className="flex space-x-2">
                    <button className="text-blue-500 hover:text-blue-700">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeletePosition(position.position_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add Office Modal */}
      {showOfficeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Office</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office Name</label>
                <input
                  type="text"
                  value={newOffice.name}
                  onChange={(e) => setNewOffice({...newOffice, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter office name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={newOffice.position}
                  onChange={(e) => setNewOffice({...newOffice, position: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter position"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowOfficeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOffice}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Add Office
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Position Modal */}
      {showPositionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Position</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position Name</label>
                <input
                  type="text"
                  value={newPosition.name}
                  onChange={(e) => setNewPosition({name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter position name"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPositionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPosition}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Add Position
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};