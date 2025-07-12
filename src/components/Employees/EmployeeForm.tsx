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
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportingTime, setReportingTime] = useState<string>('Select office and position');
  const [dutyHours, setDutyHours] = useState<string>('Select office and position');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
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

  const formatDutyHours = (hours: unknown): string => {
    if (hours === undefined || hours === null) return 'Not set';
    
    if (typeof hours === 'number') {
      return `${hours} hours`;
    }
    
    if (typeof hours === 'string') {
      return hours.includes('hours') ? hours : `${hours} hours`;
    }

    return 'Not set';
  };

  // Generate employee ID automatically
  const generateEmployeeId = async () => {
    setIsGeneratingId(true);
    try {
      const response = await fetch('/api/employees/next-id', {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setValue('employeeId', data.nextEmployeeId);
        console.log('Generated Employee ID:', data.nextEmployeeId);
      } else {
        console.error('Failed to generate employee ID');
        setValue('employeeId', 'EMP001');
      }
    } catch (error) {
      console.error('Error generating ID:', error);
      setValue('employeeId', 'EMP001');
    } finally {
      setIsGeneratingId(false);
    }
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [officesRes, positionsRes] = await Promise.all([
          fetch('/api/employees/offices/options', { headers: getAuthHeaders() }),
          fetch('/api/employees/positions/options', { headers: getAuthHeaders() }),
        ]);

        if (officesRes.ok) {
          const officesData = await officesRes.json();
          setOffices(officesData);
        }
        
        if (positionsRes.ok) {
          const positionsData = await positionsRes.json();
          setAllPositions(positionsData);
          setFilteredPositions(positionsData); // Initially show all positions
        }

        if (employee) {
          // Editing existing employee
          reset({
            ...employee,
            joiningDate: employee.joiningDate.split('T')[0],
            status: employee.status ?? true
          });
          
          setReportingTime(employee.reporting_time?.toString() || 'Not set');
          setDutyHours(formatDutyHours(employee.duty_hours));
          
          // If editing, filter positions for the selected office
          if (employee.office_id) {
            await fetchPositionsForOffice(employee.office_id);
          }
        } else if (!viewOnly) {
          // Creating new employee - auto-generate ID
          await generateEmployeeId();
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOptions();
  }, [employee, viewOnly, reset]);

  // Fetch positions when office changes
  useEffect(() => {
    if (officeId && officeId !== 0) {
      fetchPositionsForOffice(officeId);
      // Reset position when office changes (unless we're loading an existing employee)
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

  // Fetch office-position data when both office and position are selected
  useEffect(() => {
    const fetchOfficePositionData = async () => {
      if (officeId && positionId && officeId !== 0 && positionId !== 0) {
        try {
          const response = await fetch(`/api/employees/office-position/${officeId}/${positionId}`, {
            headers: getAuthHeaders(),
          });
          if (response.ok) {
            const data = await response.json();
            setReportingTime(data.reporting_time?.toString() || 'Not set');
            setDutyHours(formatDutyHours(data.duty_hours));
          } else {
            setReportingTime('Not set');
            setDutyHours('Not set');
          }
        } catch (error) {
          console.error('Error fetching office position data:', error);
          setReportingTime('Error loading data');
          setDutyHours('Error loading data');
        }
      }
    };

    fetchOfficePositionData();
  }, [officeId, positionId]);

  const fetchPositionsForOffice = async (selectedOfficeId: number) => {
    try {
      const response = await fetch(`/api/employees/positions/by-office/${selectedOfficeId}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const positionsData = await response.json();
        setFilteredPositions(positionsData);
        console.log('Filtered positions for office:', selectedOfficeId, positionsData);
      } else {
        console.error('Failed to fetch positions for office');
        setFilteredPositions([]);
      }
    } catch (error) {
      console.error('Error fetching positions for office:', error);
      setFilteredPositions([]);
    }
  };

  const handleFormSubmit = (formData: Employee) => {
    const office = offices.find(o => o.id === formData.office_id);
    const position = filteredPositions.find(p => p.id === formData.position_id);
    
    const parseDutyHours = (hoursStr: string): number | undefined => {
      if (!hoursStr || hoursStr === 'Not set' || hoursStr === 'Select office and position') {
        return undefined;
      }
      const numericValue = parseFloat(hoursStr.replace(' hours', ''));
      return isNaN(numericValue) ? undefined : numericValue;
    };

    const completeEmployeeData: Employee = {
      ...formData,
      office_name: office?.name || '',
      position_title: position?.title || '',
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : '',
      status: formData.status ?? true,
      reporting_time: reportingTime === 'Not set' ? undefined : reportingTime,
      duty_hours: parseDutyHours(dutyHours)
    };

    console.log('Submitting employee data:', completeEmployeeData);

    if (onSubmit) {
      onSubmit(completeEmployeeData);
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewOnly ? 'View Employee' : employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
                {!employee && !viewOnly && (
                  <button
                    type="button"
                    onClick={generateEmployeeId}
                    disabled={isGeneratingId}
                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                  >
                    <RefreshCw className={`w-3 h-3 inline ${isGeneratingId ? 'animate-spin' : ''}`} />
                    {isGeneratingId ? 'Generating...' : 'Regenerate'}
                  </button>
                )}
              </label>
              <input
                {...register('employeeId', { required: 'Employee ID is required' })}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
              />
              {errors.employeeId && (
                <p className="text-red-500 text-sm mt-1">{errors.employeeId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                disabled={viewOnly}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary</label>
              <input
                type="number"
                {...register('monthlySalary', { 
                  required: 'Salary is required',
                  min: { value: 0, message: 'Salary must be positive' }
                })}
                disabled={viewOnly}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              {errors.monthlySalary && (
                <p className="text-red-500 text-sm mt-1">{errors.monthlySalary.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
              <select
                {...register('office_id', { 
                  required: 'Office is required',
                  validate: value => value !== 0 || 'Please select an office'
                })}
                disabled={viewOnly}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value={0}>Select Office</option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
              {errors.office_id && (
                <p className="text-red-500 text-sm mt-1">{errors.office_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select
                {...register('position_id', { 
                  required: 'Position is required',
                  validate: value => value !== 0 || 'Please select a position'
                })}
                disabled={viewOnly || !officeId || officeId === 0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                <p className="text-red-500 text-sm mt-1">{errors.position_id.message}</p>
              )}
              {officeId && officeId !== 0 && filteredPositions.length === 0 && (
                <p className="text-amber-600 text-sm mt-1">No positions available for this office</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
              <input
                type="date"
                {...register('joiningDate', { required: 'Joining date is required' })}
                disabled={viewOnly}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              {errors.joiningDate && (
                <p className="text-red-500 text-sm mt-1">{errors.joiningDate.message}</p>
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
            <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                Save
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;