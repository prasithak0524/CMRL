// app.js

// Utility: fetch and display employee list (for index.html)
async function loadEmployeeList() {
  const res = await fetch('/api/employees');
  const employees = await res.json();
  const table = document.getElementById('employee-table-body');
  if (!table) return;
  table.innerHTML = '';
  employees.forEach(emp => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${emp.emp_code}</td>
      <td>${emp.name}</td>
      <td>${emp.department}</td>
      <td>${emp.designation}</td>
      <td><a href="profile.html?id=${emp.id}">View</a></td>
    `;
    table.appendChild(row);
  });
}

// Utility: handle add employee form (for add_employee.html)
function setupAddEmployeeForm() {
  const form = document.getElementById('add-employee-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.ok) {
      alert('Employee added!');
      window.location.href = 'index.html';
    } else {
      alert(result.error || 'Error adding employee');
    }
  });
}

// On page load, run relevant setup
document.addEventListener('DOMContentLoaded', () => {
  loadEmployeeList();
  setupAddEmployeeForm();
});