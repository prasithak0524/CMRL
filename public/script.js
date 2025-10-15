const EmpId = localStorage.getItem("EmpId");
const Name = localStorage.getItem("Name");

if (!EmpId) {
  window.location.href = "index.html"; // redirect if not logged in
}

document.getElementById("userName").innerText = Name;

// Update summary
async function updateSummary() {
  try {
    const res = await fetch(`/summary/${EmpId}`);
    const data = await res.json();

    document.getElementById("lastIn").innerText = data.lastIn;
    document.getElementById("lastOut").innerText = data.lastOut;
    document.getElementById("hoursWorked").innerText = data.hoursWorked;
  } catch (err) {
    console.error(err);
  }
}

// Clock In
document.getElementById("clockInBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("/clockin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ EmpId })
    });
    const data = await res.json();
    alert(data.message);
    updateSummary();
  } catch (err) { console.error(err); }
});

// Clock Out
document.getElementById("clockOutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("/clockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ EmpId })
    });
    const data = await res.json();
    alert(data.message);
    updateSummary();
  } catch (err) { console.error(err); }
});

// Initial summary load
updateSummary();
