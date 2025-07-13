import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, RefreshCw } from 'lucide-react';
import { Employee } from '../../types';

interface Office {
  id: number;
  name: string;
}

interface Position {
  id: number;
  title: string;
  reporting_time?: string;
  duty_hours?: number;
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
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportingTime, setReportingTime] = useState<string>('');
  const [dutyHours, setDutyHours] = useState<string>('');
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);

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

  // Fetch offices on component mount
  useEffect(() => {
    const initializeForm = async () => {
      try {
        setIsLoading(true);
        
        // Fetch offices
        const officesResponse = await fetch('/api/employees/offices/options', { 
          headers: getAuthHeaders() 
        });
        const officesData = officesResponse.ok ? await officesResponse.json() : [];
        setOffices(officesData);

        // Auto-generate employee ID for new employees
        if (!employee) {
          await generateEmployeeId();
        }

        // If editing an employee, populate the form
        if (employee) {
          reset({
            ...employee,
            joiningDate: employee.joiningDate.split('T')[0],
            status: employee.status ?? true
          });
          
          // Set reporting time and duty hours if available
          if (employee.reporting_time) {
            setReportingTime(employee.reporting_time);
          }
          if (employee.duty_hours) {
            setDutyHours(`${employee.duty_hours} hours`);
          }
          
          // Fetch positions for the employee's office
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

  const generateEmployeeId = async () => {
    try {
      setGeneratingId(true);
      const response = await fetch('/api/employees/next-id', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setValue('employeeId', data.nextEmployeeId);
      }
    } catch (error) {
      console.error('Error generating employee ID:', error);
    } finally {
      setGeneratingId(false);
    }
  };

  // Fetch positions when office changes
  useEffect(() => {
    if (officeId && officeId !== 0) {
      fetchPositionsForOffice(officeId);
      
      // Reset position if office changed (but not during initial load)
      if (!employee || employee.office_id !== officeId) {
        setValue('position_id', 0);
        setReportingTime('');
        setDutyHours('');
      }
    } else {
      setAvailablePositions([]);
      setReportingTime('');
      setDutyHours('');
    }
  }, [officeId, employee, setValue]);

  // Fetch office-position details when position changes
  useEffect(() => {
    if (officeId && positionId && officeId !== 0 && positionId !== 0) {
      fetchOfficePositionDetails(officeId, positionId);
    } else {
      setReportingTime('');
      setDutyHours('');
    }
  }, [officeId, positionId]);

  const fetchPositionsForOffice = async (officeId: number) => {
    try {
      setPositionsLoading(true);
      const response = await fetch(`/api/employees/positions/by-office/${officeId}`, {
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const positions = await response.json();
        setAvailablePositions(positions);
      } else {
        console.error('Failed to fetch positions for office');
        setAvailablePositions([]);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      setAvailablePositions([]);
    } finally {
      setPositionsLoading(false);
    }
  };

  const fetchOfficePositionDetails = async (officeId: number, positionId: number) => {
    try {
      const response = await fetch(`/api/employees/office-position-details/${officeId}/${positionId}`, {
        headers: getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportingTime(data.reporting_time || 'Not set');
        setDutyHours(data.duty_hours ? `${data.duty_hours} hours` : 'Not set');
      } else {
        setReportingTime('Not available');
        setDutyHours('Not available');
      }
    } catch (error) {
      console.error('Error fetching office-position details:', error);
      setReportingTime('Error loading');
      setDutyHours('Error loading');
    }
  };

  const handleFormSubmit = async (formData: Employee) => {
    if (isSubmitting) return;
    
    const isValid = await trigger();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      // Get office and position names for the complete data
      const selectedOffice = offices.find(o => o.id === formData.office_id);
      const selectedPosition = availablePositions.find(p => p.id === formData.position_id);

      const completeEmployeeData: Employee = {
        ...formData,
        office_name: selectedOffice?.name || formData.office_name || '',
        position_title: selectedPosition?.title || formData.position_title || '',
        joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : '',
        status: formData.status ?? true,
        reporting_time: reportingTime === 'Not set' || reportingTime === 'Not available' ? undefined : reportingTime,
        duty_hours: dutyHours.includes('hours') ? parseFloat(dutyHours.replace(' hours', '')) : undefined
      };

      if (onSubmit) {
        await onSubmit(completeEmployeeData);
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID * {!employee && <span className="text-xs text-blue-600">(Auto-generated)</span>}
                </label>
                <div className="flex space-x-2">
                  <input
                    {...register('employeeId', { 
                      required: 'Employee ID is required',
                      pattern: {
                        value: /^EMP\d{3,}$/i,
                        message: 'Employee ID must start with EMP followed by numbers (e.g., EMP001)'
                      }
                    })}
                    disabled={viewOnly || generatingId}
                    className={`flex-1 border ${errors.employeeId ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 ${viewOnly ? 'bg-gray-100' : ''}`}
                    placeholder="EMP001"
                  />
                  {!employee && !viewOnly && (
                    <button
                      type="button"
                      onClick={generateEmployeeId}
                      disabled={generatingId}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      title="Generate new Employee ID"
                    >
                      {generatingId ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                {errors.employeeId && (
                  <p className="text-red-500 text-xs mt-1">{errors.employeeId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  {...register('name', { 
                    required: 'Name is required',
                    pattern: {
                      value: /^[a-zA-Z\s]+$/,
                      message: 'Name can only contain letters and spaces'
                    }
                  })}
                  disabled={viewOnly}
                  className={`w-full border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 ${viewOnly ? 'bg-gray-100' : ''}`}
                  placeholder="John Doe"
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
                  className={`w-full border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 ${viewOnly ? 'bg-gray-100' : ''}`}
                  placeholder="john.doe@company.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary *</label>
                <input
                  type="number"
                  {...register('monthlySalary', { 
                    required: 'Salary is required',
                    min: { value: 1, message: 'Salary must be greater than 0' },
                    max: { value: 1000000, message: 'Salary must be reasonable' }
                  })}
                  disabled={viewOnly}
                  className={`w-full border ${errors.monthlySalary ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 ${viewOnly ? 'bg-gray-100' : ''}`}
                  placeholder="5000"
                />
                {errors.monthlySalary && (
                  <p className="text-red-500 text-xs mt-1">{errors.monthlySalary.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                <input
                  type="date"
                  {...register('joiningDate', { required: 'Joining date is required' })}
                  disabled={viewOnly}
                  className={`w-full border ${errors.joiningDate ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 ${viewOnly ? 'bg-gray-100' : ''}`}
                />
                {errors.joiningDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.joiningDate.message}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office *</label>
                <select
                  {...register('office_id', { 
                    required: 'Office is required',
                    validate: value => value !== 0 || 'Please select an office'
                  })}
                  disabled={viewOnly}
                  className={`w-full border ${errors.office_id ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 ${viewOnly ? 'bg-gray-100' : ''}`}
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
                  disabled={viewOnly || !officeId || officeId === 0 || positionsLoading}
                  className={`w-full border ${errors.position_id ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 ${viewOnly ? 'bg-gray-100' : ''}`}
                >
                  <option value={0}>
                    {!officeId || officeId === 0 
                      ? 'Select office first' 
                      : positionsLoading 
                        ? 'Loading positions...' 
                        : 'Select Position'
                    }
                  </option>
                  {availablePositions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.title}
                    </option>
                  ))}
                </select>
                {errors.position_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.position_id.message}</p>
                )}
                {officeId && officeId !== 0 && availablePositions.length === 0 && !positionsLoading && (
                  <p className="text-amber-600 text-xs mt-1">No positions available for this office</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  {...register('status')}
                  disabled={viewOnly}
                  value={statusValue ? 'true' : 'false'}
                  onChange={(e) => setValue('status', e.target.value === 'true')}
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2 ${viewOnly ? 'bg-gray-100' : ''}`}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {/* Auto-populated fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reporting Time
                  <span className="text-xs text-blue-600 ml-1">(Auto-populated)</span>
                </label>
                <input
                  type="text"
                  value={reportingTime || 'Select office and position'}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-blue-50 text-blue-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duty Hours
                  <span className="text-xs text-blue-600 ml-1">(Auto-populated)</span>
                </label>
                <input
                  type="text"
                  value={dutyHours || 'Select office and position'}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-blue-50 text-blue-800"
                />
              </div>
            </div>
          </div>

          {!viewOnly && (
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !officeId || !positionId}
                className={`px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors ${
                  isSubmitting || !officeId || !positionId ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          )}

          {viewOnly && (
            <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;