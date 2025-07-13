import { useState, useEffect } from 'react';

// Updated Employee type to match backend and include originalEmployeeId for updates
type Employee = {
  id: number;
  employeeId: string;
  originalEmployeeId?: string; // For tracking original ID during updates
  name: string;
  email?: string;
  office_id: number;
  position_id: number;
  monthlySalary: number;
  joiningDate: string;
  status: boolean;
  office_name?: string;
  position_title?: string;
  reporting_time?: string;
  duty_hours?: string;
};

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/employees', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const processedData = data.map((emp: any) => ({
        ...emp,
        status: emp.status === 1, // Convert to boolean
        office_name: emp.office_name || 'Not assigned',
        position_title: emp.position_title || 'Not assigned',
        originalEmployeeId: emp.employeeId // Store original ID for updates
      }));
      setEmployees(processedData);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError('Failed to load employees. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const validateEmployeeId = (employeeId: string) => {
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }
    if (!/^[a-zA-Z0-9-_]+$/.test(employeeId)) {
      throw new Error('Employee ID can only contain letters, numbers, hyphens and underscores');
    }
    if (employeeId.length > 20) {
      throw new Error('Employee ID must be 20 characters or less');
    }
  };

  const addEmployee = async (employee: Omit<Employee, 'id' | 'originalEmployeeId'>) => {
    try {
      validateEmployeeId(employee.employeeId);

      setLoading(true);
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...employee,
          status: employee.status ? 1 : 0 // Convert boolean to number for backend
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to add employee: ${response.status}`);
      }

      const data = await response.json();
      await fetchEmployees();
      return data;
    } catch (err) {
      console.error('Failed to add employee:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateEmployee = async (employee: Employee) => {
    try {
      // Check if we're trying to change the employeeId
      if (employee.originalEmployeeId && employee.employeeId !== employee.originalEmployeeId) {
        throw new Error('Employee ID cannot be changed');
      }

      setLoading(true);
      const response = await fetch(`/api/employees/${encodeURIComponent(employee.employeeId)}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...employee,
          status: employee.status ? 1 : 0 // Convert boolean to number for backend
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update employee: ${response.status}`);
      }

      const data = await response.json();
      await fetchEmployees();
      return data;
    } catch (err) {
      console.error('Failed to update employee:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete employee: ${response.status}`);
      }

      await fetchEmployees();
    } catch (err) {
      console.error('Failed to delete employee:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    employees,
    loading,
    error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees: fetchEmployees,
  };
};