-- Database: payroll_system3
-- Create database
CREATE DATABASE IF NOT EXISTS `payroll_system3` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `payroll_system3`;

-- Table structure for table `offices`
CREATE TABLE `offices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `reporting_time` time DEFAULT '09:00:00',
  `duty_hours` int(11) DEFAULT 8,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `positions`
CREATE TABLE `positions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `office_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `reporting_time` time DEFAULT NULL,
  `duty_hours` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `office_id` (`office_id`),
  CONSTRAINT `positions_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_position_office` (`name`, `office_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `employees`
CREATE TABLE `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `office_id` int(11) NOT NULL,
  `position_id` int(11) NOT NULL,
  `monthly_salary` decimal(10,2) NOT NULL,
  `allowed_late_days` int(11) DEFAULT 3,
  `reporting_time` time DEFAULT NULL,
  `duty_hours` int(11) DEFAULT NULL,
  `hire_date` date NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  UNIQUE KEY `email` (`email`),
  KEY `office_id` (`office_id`),
  KEY `position_id` (`position_id`),
  CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`),
  CONSTRAINT `employees_ibfk_2` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `attendance`
CREATE TABLE `attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `punch_in` time DEFAULT NULL,
  `punch_out` time DEFAULT NULL,
  `hours_worked` decimal(4,2) DEFAULT 0.00,
  `status` enum('present','absent','half_day','late') DEFAULT 'present',
  `is_late` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  UNIQUE KEY `unique_employee_date` (`employee_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `holidays`
CREATE TABLE `holidays` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `date` date NOT NULL,
  `type` enum('national','local','company') DEFAULT 'company',
  `office_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `office_id` (`office_id`),
  CONSTRAINT `holidays_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`),
  UNIQUE KEY `unique_holiday_office` (`date`, `office_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `payroll`
CREATE TABLE `payroll` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(20) NOT NULL,
  `month` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `working_days` int(11) NOT NULL,
  `present_days` int(11) NOT NULL,
  `absent_days` int(11) NOT NULL,
  `half_days` int(11) NOT NULL,
  `late_days` int(11) NOT NULL,
  `excess_late_days` int(11) DEFAULT 0,
  `monthly_salary` decimal(10,2) NOT NULL,
  `per_day_salary` decimal(10,2) NOT NULL,
  `late_deduction` decimal(10,2) DEFAULT 0.00,
  `half_day_deduction` decimal(10,2) DEFAULT 0.00,
  `leave_deduction` decimal(10,2) DEFAULT 0.00,
  `total_deduction` decimal(10,2) DEFAULT 0.00,
  `net_salary` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `payroll_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  UNIQUE KEY `unique_employee_month_year` (`employee_id`, `month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `users`
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','hr','manager') DEFAULT 'hr',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data
INSERT INTO `offices` (`name`, `location`, `reporting_time`, `duty_hours`) VALUES
('India Office', 'Mumbai', '09:00:00', 8),
('US Office', 'New York', '08:00:00', 8),
('UK Office', 'London', '09:30:00', 8),
('Singapore Office', 'Singapore', '09:00:00', 8);

INSERT INTO `positions` (`name`, `office_id`, `description`) VALUES
('Relationship Manager', 1, 'Client relationship management'),
('Data Analyst', 1, 'Data analysis and reporting'),
('Software Engineer', 1, 'Software development'),
('HR Manager', 1, 'Human resources management'),
('Finance Manager', 1, 'Financial planning and analysis'),
('Team Lead', 2, 'Team leadership and coordination'),
('Senior Developer', 2, 'Senior software development'),
('QA Engineer', 2, 'Quality assurance testing'),
('Project Manager', 3, 'Project management and coordination'),
('Business Analyst', 3, 'Business analysis and requirements'),
('DevOps Engineer', 4, 'DevOps and infrastructure management'),
('Technical Writer', 4, 'Technical documentation');

-- Insert default admin user (password: admin123)
INSERT INTO `users` (`username`, `password`, `role`) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert sample employees
INSERT INTO `employees` (`employee_id`, `name`, `email`, `phone`, `office_id`, `position_id`, `monthly_salary`, `allowed_late_days`, `reporting_time`, `duty_hours`, `hire_date`, `status`) VALUES
('EMP001', 'John Doe', 'john.doe@company.com', '+1234567890', 1, 1, 50000.00, 3, '09:00:00', 8, '2024-01-15', 'active'),
('EMP002', 'Jane Smith', 'jane.smith@company.com', '+1234567891', 1, 2, 45000.00, 3, '09:00:00', 8, '2024-02-01', 'active'),
('EMP003', 'Mike Johnson', 'mike.johnson@company.com', '+1234567892', 2, 6, 60000.00, 3, '08:00:00', 8, '2024-01-10', 'active'),
('EMP004', 'Sarah Wilson', 'sarah.wilson@company.com', '+1234567893', 3, 9, 55000.00, 3, '09:30:00', 8, '2024-03-01', 'active');

-- Insert sample holidays
INSERT INTO `holidays` (`name`, `date`, `type`, `office_id`) VALUES
('New Year', '2024-01-01', 'national', NULL),
('Independence Day', '2024-07-04', 'national', NULL),
('Christmas', '2024-12-25', 'national', NULL),
('Diwali', '2024-11-12', 'local', 1),
('Company Day', '2024-06-15', 'company', NULL);

-- Insert sample attendance data
INSERT INTO `attendance` (`employee_id`, `date`, `punch_in`, `punch_out`, `hours_worked`, `status`, `is_late`) VALUES
('EMP001', '2024-01-15', '09:00:00', '17:00:00', 8.00, 'present', 0),
('EMP001', '2024-01-16', '09:15:00', '17:15:00', 8.00, 'present', 1),
('EMP001', '2024-01-17', '09:00:00', '17:00:00', 8.00, 'present', 0),
('EMP002', '2024-02-01', '09:00:00', '17:00:00', 8.00, 'present', 0),
('EMP002', '2024-02-02', '09:00:00', '13:00:00', 4.00, 'half_day', 0),
('EMP003', '2024-01-10', '08:00:00', '16:00:00', 8.00, 'present', 0),
('EMP004', '2024-03-01', '09:30:00', '17:30:00', 8.00, 'present', 0);
