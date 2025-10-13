// server.js
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve frontend files

// --- MySQL connection ---
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "@Prasi05@",
    database: "hr_system"
});

db.connect(err => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        process.exit(1);
    }
    console.log("✅ Connected to MySQL (hr_system)");
});

// ================= ROUTES =================

// Serve frontend index
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Test API
app.get("/api/test", (req, res) => {
    res.json({ message: "API is working!" });
});

// ================= LOGIN =================
app.post("/api/login", (req, res) => {
    let { empid, password } = req.body;
    if (!empid || !password) return res.status(400).json({ message: "EmpId and password required" });

    empid = empid.trim();
    password = password.trim();

    const q = "SELECT EmpId, Name, Email, Role FROM Users WHERE EmpId = ? AND Password = ?";
    db.query(q, [empid, password], (err, results) => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });
        if (results.length === 0) return res.status(401).json({ message: "Invalid EmpId or password" });

        const user = results[0];
        res.json({
            message: "Login successful",
            EmpId: user.EmpId,
            Name: user.Name,
            Email: user.Email,
            role: user.Role
        });
    });
});

// ================= EMPLOYEES =================
app.get("/api/employees", (req, res) => {
    const q = "SELECT EmpId, Name, Dept, Design, DOB, DOJ, Phone, Email, Address, EmpType, Active FROM employees";
    db.query(q, (err, results) => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });
        res.json(results);
    });
});

app.get("/api/employees/search", (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const search = `%${q}%`;
    const sql = `SELECT EmpId, Name, Dept, Design, Email, Active FROM employees
               WHERE EmpId LIKE ? OR Name LIKE ? OR Dept LIKE ? OR Email LIKE ?`;
    db.query(sql, [search, search, search, search], (err, results) => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });
        res.json(results);
    });
});

app.post("/api/employees", (req, res) => {
    const {
        EmpId,
        Name,
        Dept,
        Design,
        DOB = null,
        DOJ = null,
        Phone = "",
        Email = "",
        Address = "",
        EmpType = "Permanent",
        Active = 1,
        Password = "1234"
    } = req.body;

    if (!EmpId || !Name || !Dept || !Design) {
        return res.status(400).json({ message: "EmpId, Name, Dept and Design are required" });
    }

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });

        const insertEmp = `INSERT INTO employees
      (EmpId, Name, Dept, Design, DOB, DOJ, Phone, Email, Address, EmpType, Active, Password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(insertEmp, [EmpId, Name, Dept, Design, DOB, DOJ, Phone, Email, Address, EmpType, Active, Password], (err, result) => {
            if (err) return db.rollback(() => res.status(500).json({ message: "Insert employee failed", error: err.message }));

            const insertUser = `INSERT INTO Users (EmpId, Name, Email, Password, Role) VALUES (?, ?, ?, ?, 'employee')`;
            db.query(insertUser, [EmpId, Name, Email, Password], (err2, result2) => {
                if (err2) return db.rollback(() => res.status(500).json({ message: "Insert user failed", error: err2.message }));

                db.commit(errCommit => {
                    if (errCommit) return db.rollback(() => res.status(500).json({ message: "Commit failed", error: errCommit.message }));
                    res.json({ message: "Employee added successfully", EmpId });
                });
            });
        });
    });
});

// ================= ATTENDANCE =================
app.post("/api/clockin", (req, res) => {
    let { EmpId } = req.body;
    if (!EmpId) return res.status(400).json({ message: "EmpId required" });

    EmpId = EmpId.trim();
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);

    const check = "SELECT * FROM attendance WHERE EmpId = ? AND AttendanceDate = ? ORDER BY SignIn DESC LIMIT 1";
    db.query(check, [EmpId, date], (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });

        if (rows.length > 0 && !rows[0].SignOut) {
            return res.status(400).json({ message: "You must clock out before clocking in again" });
        }

        const ins = "INSERT INTO attendance (EmpId, AttendanceDate, SignIn) VALUES (?, ?, ?)";
        db.query(ins, [EmpId, date, time], (err2) => {
            if (err2) return res.status(500).json({ message: "Insert failed", error: err2.message });
            res.json({ message: "Clocked in", time });
        });
    });
});

app.post("/api/clockout", (req, res) => {
    let { EmpId } = req.body;
    if (!EmpId) return res.status(400).json({ message: "EmpId required" });

    EmpId = EmpId.trim();
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);

    const getSignIn = "SELECT * FROM attendance WHERE EmpId = ? AND AttendanceDate = ? AND SignOut IS NULL ORDER BY SignIn DESC LIMIT 1";
    db.query(getSignIn, [EmpId, date], (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });
        if (rows.length === 0) return res.status(400).json({ message: "Please clock in first" });

        const signIn = rows[0].SignIn;
        const workHrs = signIn ? ((new Date(`1970-01-01T${time}`) - new Date(`1970-01-01T${signIn}`)) / 1000 / 3600) : 0;

        const update = "UPDATE attendance SET SignOut = ?, WorkHrs = ? WHERE EmpId = ? AND AttendanceDate = ? AND SignIn = ?";
        db.query(update, [time, workHrs.toFixed(2), EmpId, date, signIn], (err2) => {
            if (err2) return res.status(500).json({ message: "Update failed", error: err2.message });
            res.json({ message: "Clocked out", time, hoursWorked: workHrs.toFixed(2) });
        });
    });
});

app.get("/api/summary/:EmpId", (req, res) => {
    let EmpId = req.params.EmpId;
    if (!EmpId) return res.status(400).json({ message: "EmpId required" });
    EmpId = EmpId.trim();
    const date = new Date().toISOString().slice(0, 10);

    const q = "SELECT SignIn, SignOut, WorkHrs FROM attendance WHERE EmpId = ? AND AttendanceDate = ? ORDER BY Id ASC";
    db.query(q, [EmpId, date], (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });

        if (rows.length === 0) {
            return res.json({
                lastIn: "--:--",
                lastOut: "--:--",
                hoursWorked: 0,
                logs: []
            });
        }

        // total hours worked today (force number)
        const totalHours = rows.reduce((sum, r) => sum + Number(r.WorkHrs || 0), 0);

        res.json({
            lastIn: rows[rows.length - 1].SignIn || "--:--",
            lastOut: rows[rows.length - 1].SignOut || "--:--",
            hoursWorked: totalHours.toFixed(2),
            logs: rows
        });
    });
});

// ================= DASHBOARD =================
app.get("/api/dashboard", (req, res) => {
    const data = {};
    db.query("SELECT COUNT(*) AS cnt FROM employees", (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err.message });
        data.totalEmployees = rows[0].cnt;
        data.activeLeaves = 5;
        data.upcomingHolidays = 2;
        data.pendingTasks = ["Approve pending leaves"];
        data.systemNotifications = ["System maintenance"];
        res.json(data);
    });
});

// ================= HOLIDAYS =================
app.get("/api/holidays", (req, res) => {
    const query = "SELECT * FROM holidays ORDER BY date ASC";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });
        res.json(results);
    });
});

app.post("/api/holidays", (req, res) => {
    const { year, date, holiday_name } = req.body;
    if (!year || !date || !holiday_name) return res.status(400).json({ message: "All fields are required" });

    const query = "INSERT INTO holidays (year, date, holiday_name) VALUES (?, ?, ?)";
    db.query(query, [year, date, holiday_name], (err) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({ message: "Holiday already exists for this date" });
            }
            return res.status(500).json({ message: "DB error", error: err.message });
        }
        res.json({ message: "Holiday added successfully!" });
    });
});

app.put("/api/holidays/:id", (req, res) => {
    const { id } = req.params;
    const { year, date, holiday_name } = req.body;
    const query = "UPDATE holidays SET year=?, date=?, holiday_name=? WHERE Id=?";
    db.query(query, [year, date, holiday_name, id], (err) => {
        if (err) return res.status(500).json({ message: "Update failed", error: err.message });
        res.json({ message: "Holiday updated successfully" });
    });
});

app.delete("/api/holidays/:id", (req, res) => {
    const { id } = req.params;
    const query = "DELETE FROM holidays WHERE Id=?";
    db.query(query, (err) => {
        if (err) return res.status(500).json({ message: "Delete failed", error: err.message });
        res.json({ message: "Holiday deleted successfully" });
    });
});

// ================= LEAVES =================

// --- Get All Applied Leaves ---
app.get("/api/leaves", (req, res) => {
    const sql = `
    SELECT 
      l.leave_id as Id,
      l.EmpId,
      e.Name as employeeName,
      l.leave_type as leaveType,
      l.start_date,
      l.end_date,
      l.number_of_days as numDays,
      l.reason,
      l.status
    FROM leaves l
    LEFT JOIN employees e ON l.EmpId = e.EmpId
    ORDER BY l.created_at DESC
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ SQL Error (fetch leaves):", err.sqlMessage || err);
            return res.status(500).json({ message: "Failed to load leaves" });
        }
        res.json(results);
    });
});

// --- Apply Leave Route ---
app.post("/api/leaves", (req, res) => {
    const {
        EmpId,
        leave_type_id,
        start_date,
        end_date,
        number_of_days,
        reason,
        away_from_hq
    } = req.body;

    if (!EmpId || !leave_type_id || !start_date || !end_date || !number_of_days || !reason) {
        return res.json({ message: "Please fill all required fields." });
    }

    // Convert boolean checkbox to integer for MySQL
    const awayFromHQValue = away_from_hq ? 1 : 0;

    const sql = `
    INSERT INTO leaves 
    (EmpId, leave_type, start_date, end_date, number_of_days, reason, away_from_hq, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
  `;

    db.query(
        sql, [EmpId, leave_type_id, start_date, end_date, number_of_days, reason, awayFromHQValue],
        (err, result) => {
            if (err) {
                console.error("❌ SQL Error:", err.sqlMessage || err);
                return res.json({ message: "Failed to apply leave" });
            }
            res.json({ message: "Leave applied successfully" });
        }
    );
});

// PUT /api/leaves/:id
app.put('/api/leaves/:id', (req, res) => {
    const leaveId = req.params.id;
    const { status, role } = req.body;

    if (role !== 'admin') {
        return res.status(403).json({ error: "Only admin can approve/reject leave" });
    }

    const query = `UPDATE leaves 
                 SET status = ?
                 WHERE leave_id = ?`;
    db.query(query, [status, leaveId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error while updating leave status" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Leave not found" });
        }
        res.json({ message: `Leave ${status} successfully` });
    });
});

// ================= LEAVE MASTER ROUTES =================

// GET leave master data
app.get("/api/leave_master", (req, res) => {
    const role = req.query.role || 'employee';
    const empId = (req.query.EmpId || '').trim();

    let sql = `
        SELECT lm.*, lt.leave_name 
        FROM leave_master lm 
        LEFT JOIN leave_types lt ON lm.leave_code = lt.leave_code
    `;
    let params = [];

    if (role !== 'admin') {
        sql += " WHERE lm.EmpId = ?";
        params.push(empId);
    }

    sql += " ORDER BY lm.EmpId, lm.leave_code";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("❌ SQL Error (fetch leave master):", err);
            return res.status(500).json({
                message: "Failed to fetch leave master data",
                error: err.message
            });
        }

        res.json(results || []);
    });
});

// POST - Add or update leave balance
app.post("/api/leave_master", (req, res) => {
    const { EmpId, leave_type_id, leave_desc, balance } = req.body;

    if (!EmpId || !leave_type_id || balance === undefined) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Map numeric leave_type_id to leave_code
    const leaveCodeMap = {
        1: 'CL', // Casual Leave
        2: 'EL', // Earned Leave  
        3: 'HL' // Hospital Leave
    };

    const leave_code = leaveCodeMap[leave_type_id] || leave_type_id;

    const sql = `
        INSERT INTO leave_master (EmpId, leave_code, leave_desc, balance)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        balance = VALUES(balance), 
        leave_desc = VALUES(leave_desc),
        updated_at = CURRENT_TIMESTAMP
    `;

    db.query(sql, [EmpId, leave_code, leave_desc, parseFloat(balance)], (err, result) => {
        if (err) {
            console.error("❌ SQL Error (save leave master):", err);
            return res.status(500).json({
                message: "Failed to save leave balance",
                error: err.message
            });
        }

        res.json({
            message: "Leave balance saved successfully",
            affectedRows: result.affectedRows
        });
    });
});

// --- Get Single Leave Application Details for View Page ---
app.get("/api/leave_applications/:id", (req, res) => {
    const leaveId = req.params.id;

    const sql = `
    SELECT 
      l.leave_id as Id,
      l.EmpId,
      e.Name as employeeName,
      l.leave_type as leave_name,
      l.start_date,
      l.end_date,
      l.number_of_days,
      l.reason,
      l.away_from_hq,
      l.status,
      l.created_at
    FROM leaves l
    LEFT JOIN employees e ON l.EmpId = e.EmpId
    WHERE l.leave_id = ?
  `;

    db.query(sql, [leaveId], (err, results) => {
        if (err) {
            console.error("❌ SQL Error (fetch leave application):", err.sqlMessage || err);
            return res.status(500).json({ error: "Database error" });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "Leave application not found" });
        }
        res.json(results[0]);
    });
});

// --- Update Leave Application Status for View Page ---
app.post("/api/leave_applications/:id/status", (req, res) => {
    const leaveId = req.params.id;
    const { status, comments } = req.body;
    const role = req.headers.role;

    if (role !== 'admin') {
        return res.status(403).json({ error: "Only admin can approve/reject leave" });
    }

    const query = `UPDATE leaves SET status = ? WHERE leave_id = ?`;
    db.query(query, [status, leaveId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error while updating leave status" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Leave not found" });
        }
        res.json({ message: `Leave ${status} successfully` });
    });
});

// Apply a new leave
app.post("/api/leave_applications", (req, res) => {
    const { EmpId, leave_type_id, start_date, end_date, number_of_days, reason, away_from_hq } = req.body;
    if (!EmpId || !leave_type_id || !start_date || !end_date || !number_of_days || !reason) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const sql = `
    INSERT INTO leave_applications
      (EmpId, leave_type_id, start_date, end_date, number_of_days, reason, away_from_hq, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
  `;

    db.query(sql, [EmpId, leave_type_id, start_date, end_date, number_of_days, reason, away_from_hq || 0], (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to apply leave", error: err.message });
        res.json({ message: "Leave applied successfully", leaveId: result.insertId });
    });
});

app.get("/reports", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "reports.html"));
});

app.get("/api/employee-report", (req, res) => {
    const sql = "SELECT EmpId, Name, Dept, Design, Active FROM employees";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.json({ message: "No data found" });
        }
        res.json(results);
    });
});

app.get('/api/leave-summary', (req, res) => {
    const { empId, startDate, endDate } = req.query;

    let sql = `
    SELECT 
        la.Id,
        la.EmpId,
        e.Name AS employeeName,
        lt.leave_name AS leaveType,
        la.start_date,
        la.end_date,
        la.number_of_days,
        la.status
    FROM leave_applications la
    JOIN employees e ON la.EmpId = e.EmpId
    JOIN leave_types lt ON la.leave_type_id = lt.Id
    WHERE 1=1
  `;

    const params = [];
    if (empId) {
        sql += " AND la.EmpId=?";
        params.push(empId);
    }
    if (startDate) {
        sql += " AND la.end_date >= ?";
        params.push(startDate);
    } // overlap logic
    if (endDate) {
        sql += " AND la.start_date <= ?";
        params.push(endDate);
    }

    sql += " ORDER BY la.start_date DESC";

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results); // always return the array
    });
});

// --- Attendance Reports API ---
app.get("/api/attendance-reports", (req, res) => {
    const { startDate, endDate, empId, department } = req.query;

    // Use correct column names
    let sql = `SELECT a.EmpId, e.Name, e.Dept, a.AttendanceDate, a.SignIn, a.SignOut, a.WorkHrs, a.LateHrs, a.Remarks
               FROM Attendance a
               JOIN employees e ON a.EmpId = e.EmpId
               WHERE a.AttendanceDate BETWEEN ? AND ?`;

    const params = [startDate, endDate];

    if (empId) {
        sql += " AND a.EmpId = ?";
        params.push(empId);
    }

    if (department && department !== "All Departments") {
        sql += " AND e.Dept = ?";
        params.push(department);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("SQL Error:", err); // Log full error
            return res.json({ error: err.message });
        }

        // Transform results to match frontend
        const transformed = results.map(r => ({
            EmpId: r.EmpId,
            Name: r.Name,
            Date: r.AttendanceDate.toISOString().split('T')[0],
            Status: r.LateHrs > 0 ? "Late" : "Present",
            LateHours: r.LateHrs,
            WorkedHours: r.WorkHrs,
            Discrepancies: r.Remarks
        }));

        res.json(transformed);
    });
});

// API to get leave reports
app.get("/api/leaves/reports", (req, res) => {
    const { employeeId, leaveType, status } = req.query;

    let query = `
    SELECT EmpId,
           CASE leave_type_id
             WHEN 1 THEN 'CL'
             WHEN 2 THEN 'EL'
             WHEN 3 THEN 'HL'
           END AS leave_type,
           leave_desc AS Reason,
           status AS Status
    FROM leave_master
    WHERE 1=1
  `;

    const params = [];

    if (employeeId && employeeId !== "All") {
        query += " AND EmpId = ?";
        params.push(employeeId);
    }

    if (leaveType && leaveType !== "All") {
        query += " AND leave_type_id = ?";
        params.push(leaveType);
    }

    if (status && status !== "All") {
        query += " AND status = ?";
        params.push(status);
    }

    console.log("Query:", query);
    console.log("Params:", params);

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Query error:", err);
            return res.status(500).json([]);
        }
        res.json(results);
    });
});
// ================= LEAVE MASTER & BALANCE ROUTES =================

// Get leave balance for employee
app.get("/api/leave_balance/:EmpId", (req, res) => {
    const { EmpId } = req.params;

    const query = `
        SELECT * FROM leave_master 
        WHERE EmpId = ?
    `;

    db.query(query, [EmpId], (err, results) => {
        if (err) {
            console.error("❌ SQL Error (fetch leave balance):", err);
            return res.status(500).json({ message: "Failed to fetch leave balance", error: err.message });
        }
        res.json(results);
    });
});

// Update leave balance (Adjust Leave Balance)
app.post("/api/adjust_leave_balance", (req, res) => {
    const { EmpId, leave_type_id, leave_desc, balance } = req.body;

    if (!EmpId || !leave_type_id || balance === undefined) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const query = `
        INSERT INTO leave_master (EmpId, leave_type_id, leave_desc, balance) 
        VALUES (?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
        balance = VALUES(balance), 
        leave_desc = VALUES(leave_desc)
    `;

    db.query(query, [EmpId, leave_type_id, leave_desc, parseFloat(balance)], (err, result) => {
        if (err) {
            console.error("❌ SQL Error (adjust leave balance):", err);
            return res.status(500).json({ message: "Failed to update leave balance", error: err.message });
        }

        res.json({
            message: "Leave balance updated successfully",
            affectedRows: result.affectedRows
        });
    });
});

// Get all leave types
app.get("/api/leave_types", (req, res) => {
    const query = "SELECT * FROM leave_types ORDER BY Id";

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ SQL Error (fetch leave types):", err);
            return res.status(500).json({ message: "Failed to fetch leave types", error: err.message });
        }
        res.json(results);
    });
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});