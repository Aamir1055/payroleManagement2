export interface Employee {
  id: number;
  employee_id: string;
  name: string;
  email?: string;
  phone?: string;
  office_id: number;
  position_id: number;
  monthly_salary: number;
  allowed_late_days: number;
  reporting_time?: string;
  duty_hours?: number;
  hire_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  office_name?: string;
  position_name?: string;
}

export interface Office {
  id: number;
  name: string;
  location?: string;
  reporting_time: string;
  duty_hours: number;
  created_at: string;
  updated_at: string;
  employee_count?: number;
  total_salary?: number;
}

export interface Position {
  id: number;
  name: string;
  office_id: number;
  description?: string;
  created_at: string;
  updated_at: string;
  office_name?: string;
  employee_count?: number;
}

export interface Attendance {
  id: number;
  employee_id: string;
  date: string;
  punch_in?: string;
  punch_out?: string;
  hours_worked: number;
  status: 'present' | 'absent' | 'half_day' | 'late';
  is_late: boolean;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: 'national' | 'local' | 'company';
  office_id?: number;
  created_at: string;
  office_name?: string;
}

export interface Payroll {
  id: number;
  employee_id: string;
  month: number;
  year: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  late_days: number;
  excess_late_days: number;
  monthly_salary: number;
  per_day_salary: number;
  late_deduction: number;
  half_day_deduction: number;
  leave_deduction: number;
  total_deduction: number;
  net_salary: number;
  created_at: string;
  name?: string;
  email?: string;
  office_name?: string;
  position_name?: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'hr' | 'manager';
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export interface EmployeeStats {
  total: number;
  byOffice: {
    office_name: string;
    employee_count: number;
    total_salary: number;
  }[];
  byPosition: {
    position_name: string;
    office_name: string;
    employee_count: number;
  }[];
}

export interface WorkingDays {
  totalDays: number;
  sundays: number;
  holidays: number;
  workingDays: number;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalMonthlySalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  totalPresentDays: number;
  totalAbsentDays: number;
  totalHalfDays: number;
  totalLateDays: number;
}
