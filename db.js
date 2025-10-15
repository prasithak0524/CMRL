// app.js
const express = require('express');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

// --- 1. Connect to MySQL ---
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // your MySQL username
<<<<<<< HEAD
    password: '@Prasi05@', // your MySQL password
=======
    password: 'root', // your MySQL password
>>>>>>> 2ce0720cd2185cce4b05da6b8e8872741e5c6cf4
    database: 'hr_system' // your database name
});

connection.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

// --- 2. Middleware ---
app.use(express.json());

// --- 3. Routes ---

// Test route
app.get('/', (req, res) => {
    res.send('Welcome to Express.js MySQL DB Checker!');
});

// Get all users
app.get('/users', (req, res) => {
    connection.query('SELECT * FROM employees', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});
app.get('/create-initial-user', (req, res) => {
    const query = "INSERT INTO employees (EmpId, Name, Dept, Designation, DOB, DOJ, Phone, Email, Address, EmpType, Active, Password  VALUES  ('EMP001', 'Sophia Clark', 'Marketing', 'Manager', '1988-05-12', '2015-06-01', '1234567890', 'sophia@example.com', '123 Main St, NY', 'Full-Time', TRUE, 'password123'),('EMP002', 'Ethan Bennett', 'Sales', 'Representative', '1990-08-23', '2016-07-15', '1234567891', 'ethan@example.com', '456 Oak St, NY', 'Full-Time', TRUE, 'password123')";

    connection.query(query, (err, result) => {
        if (err) return res.status(500).send(err);
        res.send('Initial user created');
    });
});

// Add a new user
app.post('/users', (req, res) => {
    const { EmpId, Name, Email, password } = req.body;
    const query = 'INSERT INTO employees (EmpId,Name, Email, password) VALUES (?, ?, ?,?)';
    connection.query(query, [EmpId, Name, Email, password], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'User added', userId: result.insertId });
    });
});
<<<<<<< HEAD
// Get attendance with Present/Absent/Holiday status
app.get('/attendance', (req, res) => {
    // Optional: get date range from query params, else default
    const fromDate = req.query.from || '2025-01-01';
    const toDate = req.query.to || '2025-12-31';

    const sql = `
    SELECT 
        CONCAT(a.EmpId, ' - ', u.Name) AS EMPLOYEE,
        a.AttendanceDate AS DATE,
        CASE 
            WHEN h.holiday_date IS NOT NULL THEN 'Holiday'
            WHEN a.SignIn IS NULL THEN 'Absent'
            ELSE 'Present'
        END AS STATUS,
        CASE WHEN a.LateHrs > 0 THEN a.LateHrs ELSE '-' END AS 'LATE ARRIVED HRS',
        CASE WHEN a.WorkHrs > 0 THEN CONCAT(a.WorkHrs, ' hrs') ELSE '-' END AS 'HOURS WORKED',
        COALESCE(a.Remarks, '-') AS DISCREPANCIES
    FROM Attendance a
    JOIN Users u ON a.EmpId = u.EmpId
    LEFT JOIN holidays h ON a.AttendanceDate = h.holiday_date
    WHERE a.AttendanceDate BETWEEN ? AND ?
    ORDER BY a.EmpId, a.AttendanceDate;
    `;

    connection.query(sql, [fromDate, toDate], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});
=======
>>>>>>> 2ce0720cd2185cce4b05da6b8e8872741e5c6cf4

// --- 4. Start server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});