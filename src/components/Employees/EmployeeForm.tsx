import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Employee } from '../../types';

interface Office {
  id: number;
  name: string;
}

interface Position {
  id: number;
  title: string;
}

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit?: (data: Employee) => void;
  onClose: () => void;
  viewOnly?: boolean;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onClose,
  viewOnly = false,
}) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportingTime, setReportingTime] = useState<string>('Not set');
  const [dutyHours, setDutyHours] = useState<string>('Not set');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
    trigger,
  } = useForm<Employee>({
    defaultValues: {
      id: 0,
      employeeId: '',
      name: '',
      email: '',
      office_id: 0,
      office_name: '',
      position_id: 0,
      position_title: '',
      monthlySalary: 0,
      joiningDate: '',
      status: true
    }
  });

  const statusValue = watch('status');
  const officeId = watch('office_id');
  const positionId = watch('position_id');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  const fetchPositionsForOffice = async (officeId: number) => {
    try {
      const response = await fetch(`/api/employees/positions/by-office/${officeId}`, {
        headers: getAuthHeaders(),
      });
      const positions = response.ok ? await response.json() : [];
      setFilteredPositions(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      setFilteredPositions([]);
    }
  };

  const fetchOfficePositionDetails = async (officeId: number, positionId: number) => {
    try {
      const response = await fetch(`/api/employees/office-position/${officeId}/${positionId}`, {
        headers: getAuthHeaders(),
      });
      const data = response.ok ? await response.json() : {};
      setReportingTime(data.reporting_time || 'Not set');
      setDutyHours(data.duty_hours ? `${data.duty_hours} hours` : 'Not set');
    } catch (error) {
      console.error('Error fetching office details:', error);
      setReportingTime('Error loading data');
      setDutyHours('Error loading data');
    }
  };

  useEffect(() => {
    const initializeForm = async () => {
      try {
        const [officesRes, positionsRes] = await Promise.all([
          fetch('/api/employees/offices/options', { headers: getAuthHeaders() }),
          fetch('/api/employees/positions/options', { headers: getAuthHeaders() }),
        ]);

        const officesData = officesRes.ok ? await officesRes.json() : [];
        const positionsData = positionsRes.ok ? await positionsRes.json() : [];
        
        setOffices(officesData);
        setAllPositions(positionsData);
        setFilteredPositions(positionsData);

        if (employee) {
          reset({
            ...employee,
            joiningDate: employee.joiningDate.split('T')[0],
            status: employee.status ?? true
          });
          setReportingTime(employee.reporting_time || 'Not set');
          setDutyHours(employee.duty_hours ? `${employee.duty_hours} hours` : 'Not set');
          
          if (employee.office_id) {
            await fetchPositionsForOffice(employee.office_id);
          }
        }
      } catch (error) {
        console.error('Error initializing form:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeForm();
  }, [employee, reset]);

  useEffect(() => {
    if (officeId && officeId !== 0) {
      fetchPositionsForOffice(officeId);
      if (!employee || employee.office_id !== officeId) {
        setValue('position_id', 0);
        setReportingTime('Select position');
        setDutyHours('Select position');
      }
    } else {
      setFilteredPositions(allPositions);
      setReportingTime('Select office and position');
      setDutyHours('Select office and position');
    }
  }, [officeId, allPositions, employee, setValue]);

  useEffect(() => {
    if (officeId && positionId && officeId !== 0 && positionId !== 0) {
      fetchOfficePositionDetails(officeId, positionId);
    }
  }, [officeId, positionId]);

  const handleFormSubmit = async (formData: Employee) => {
  if (isSubmitting) return;
  
  const isValid = await trigger();
  if (!isValid) return;

  setIsSubmitting(true);

  try {
    const completeEmployeeData: Employee = {
      ...formData,
      office_name: offices.find(o => o.id === formData.office_id)?.name || '',
      position_title: filteredPositions.find(p => p.id === formData.position_id)?.title || '',
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : '',
      status: formData.status ?? true,
      reporting_time: reportingTime === 'Not set' ? undefined : reportingTime,
      duty_hours: dutyHours.includes('hours') ? parseFloat(dutyHours.replace(' hours', '')) : undefined
    };

    if (onSubmit) {
      await onSubmit(completeEmployeeData);  // This will pass the complete object
    }
  } catch (error) {
    console.error('Error submitting form:', error);
  } finally {
    setIsSubmitting(false);
  }
};

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewOnly ? 'View Employee' : employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID *
                </label>
                <input
                  {...register('employeeId', { 
                    required: 'Employee ID is required',
                    pattern: {
                      value: /^EMP\d{3,}$/i,
                      message: 'Employee ID must start with EMP followed by numbers'
                    }
                  })}
                  // disabled={viewOnly || !!employee?.employeeId}
                  className={`w-full border ${errors.employeeId ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2`}
                  placeholder="EMP001"
                />
                {errors.employeeId && (
                  <p className="text-red-500 text-xs mt-1">{errors.employeeId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  disabled={viewOnly}
                  className={`w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  disabled={viewOnly}
                  className={`w-full border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                <input
                  type="date"
                  {...register('joiningDate', { required: 'Joining date is required' })}
                  disabled={viewOnly}
                  className={`w-full border ${errors.joiningDate ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2`}
                />
                {errors.joiningDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.joiningDate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office *</label>
                <select
                  {...register('office_id', { 
                    required: 'Office is required',
                    validate: value => value !== 0 || 'Please select an office'
                  })}
                  disabled={viewOnly}
                  className={`w-full border ${errors.office_id ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2`}
                >
                  <option value={0}>Select Office</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
                {errors.office_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.office_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                <select
                  {...register('position_id', { 
                    required: 'Position is required',
                    validate: value => value !== 0 || 'Please select a position'
                  })}
                  disabled={viewOnly || !officeId || officeId === 0}
                  className={`w-full border ${errors.position_id ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2`}
                >
                  <option value={0}>
                    {!officeId || officeId === 0 ? 'Select office first' : 'Select Position'}
                  </option>
                  {filteredPositions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.title}
                    </option>
                  ))}
                </select>
                {errors.position_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.position_id.message}</p>
                )}
                {officeId && officeId !== 0 && filteredPositions.length === 0 && (
                  <p className="text-amber-600 text-xs mt-1">No positions available for this office</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary *</label>
                <input
                  type="number"
                  {...register('monthlySalary', { 
                    required: 'Salary is required',
                    min: { value: 0, message: 'Salary must be positive' }
                  })}
                  disabled={viewOnly}
                  className={`w-full border ${errors.monthlySalary ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2`}
                />
                {errors.monthlySalary && (
                  <p className="text-red-500 text-xs mt-1">{errors.monthlySalary.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  {...register('status')}
                  disabled={viewOnly}
                  value={statusValue ? 'true' : 'false'}
                  onChange={(e) => setValue('status', e.target.value === 'true')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Time</label>
              <input
                type="text"
                value={reportingTime}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duty Hours</label>
              <input
                type="text"
                value={dutyHours}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
              />
            </div>
          </div>

          {!viewOnly && (
            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;