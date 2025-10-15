-- Active: 1757655345179@@127.0.0.1@3306@hr_db
CREATE DATABASE IF NOT EXISTS hr_db;
USE hr_db;


-- Employees table: personal + job details + leave balances
CREATE TABLE IF NOT EXISTS employees (
id INT AUTO_INCREMENT PRIMARY KEY,
emp_code VARCHAR(50) NOT NULL UNIQUE,
name VARCHAR(150) NOT NULL,
dob DATE,
contact VARCHAR(30),
address TEXT,
department VARCHAR(100),
designation VARCHAR(100),
date_of_joining DATE,
employee_type ENUM('Permanent','Contract','Intern','Other') DEFAULT 'Permanent',
casual_leave_balance DECIMAL(6,2) DEFAULT 0,
earned_leave_balance DECIMAL(6,2) DEFAULT 0,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Attendance table (for later steps)
CREATE TABLE IF NOT EXISTS attendance (
id INT AUTO_INCREMENT PRIMARY KEY,
employee_id INT NOT NULL,
date DATE NOT NULL,
check_in TIME,
check_out TIME,
status ENUM('present','absent','on_leave') DEFAULT 'present',
remarks VARCHAR(255),
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);


-- Leaves / leave applications
CREATE TABLE IF NOT EXISTS leaves (
id INT AUTO_INCREMENT PRIMARY KEY,
employee_id INT NOT NULL,
leave_type VARCHAR(50),
start_date DATE,
end_date DATE,
days DECIMAL(5,2),
reason TEXT,
status ENUM('pending','approved','rejected') DEFAULT 'pending',
applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
approved_by INT NULL,
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);


-- Holidays table
CREATE TABLE IF NOT EXISTS holidays (
id INT AUTO_INCREMENT PRIMARY KEY,
title VARCHAR(255) NOT NULL,
date DATE NOT NULL,
description TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
