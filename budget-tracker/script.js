const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const openAddEntryBtn = document.getElementById("openAddEntry");

const entryModal = document.getElementById("entryModal");
const modalForm = document.getElementById("modalForm");
const modalCancel = document.getElementById("modalCancel");
const modalDelete = document.getElementById("modalDelete");
const modalType = document.getElementById("modalType");
const modalTitle = document.getElementById("modalTitleInput");
const modalAmount = document.getElementById("modalAmount");
const modalRecurrence = document.getElementById("modalRecurrence");
const modalDayOfWeek = document.getElementById("modalDayOfWeek");
const modalDayOfMonth = document.getElementById("modalDayOfMonth");
const modalStartDate = document.getElementById("modalStartDate");
const modalEndDate = document.getElementById("modalEndDate");
const modalWeeklyFields = document.getElementById("modalWeeklyFields");
const modalMonthlyFields = document.getElementById("modalMonthlyFields");

const logBody = document.getElementById("log-body");
const sortLog = document.getElementById("sortLog");
const exportBtn = document.getElementById("exportLog");
const totalIncome = document.getElementById("totalIncome");
const totalExpensesEl = document.getElementById("totalExpenses");
const remainingEl = document.getElementById("remaining");
const logMonth = document.getElementById("logMonth");

// --- JSON Backup/Restore Buttons ---
const backupBtn = document.createElement("button");
backupBtn.textContent = "Backup JSON";
backupBtn.className = "btn-secondary";
backupBtn.style.marginLeft = "10px";

const restoreBtn = document.createElement("button");
restoreBtn.textContent = "Restore JSON";
restoreBtn.className = "btn-secondary";
restoreBtn.style.marginLeft = "5px";

exportBtn.insertAdjacentElement("afterend", backupBtn);
exportBtn.insertAdjacentElement("afterend", restoreBtn);

let entries = JSON.parse(localStorage.getItem("budgetEntries")) || [];
let currentMonth = new Date();
let editingIndex = null;
let modalDate = null;

function saveEntries() {
  localStorage.setItem("budgetEntries", JSON.stringify(entries));
}

function buildISODateLocal(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function localDateFromISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}-${y}`;
}

function occursOnDate(entry, day) {
  const start = entry.startDate ? localDateFromISO(entry.startDate) : null;
  const end = entry.endDate ? localDateFromISO(entry.endDate) : null;
  if (start && day < start) return false;
  if (end && day > end) return false;

  switch (entry.recurrence) {
    case "once":
      return entry.date === buildISODateLocal(day.getFullYear(), day.getMonth(), day.getDate());
    case "weekly":
      return parseInt(entry.dayOfWeek) === day.getDay();
    case "monthly":
      const lastDay = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
      return day.getDate() === Math.min(parseInt(entry.dayOfMonth), lastDay);
    case "annual":
      return entry.monthDay === `${day.getMonth() + 1}-${day.getDate()}`;
    default:
      return false;
  }
}

// --- CALENDAR ---
function renderCalendar() {
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  monthTitle.textContent = `${currentMonth.toLocaleString("default", { month: "long" })} ${y}`;
  logMonth.textContent = monthTitle.textContent;

  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  calendar.innerHTML = "";

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(dayName => {
    const header = document.createElement("div");
    header.className = "weekday-header";
    header.textContent = dayName;
    calendar.appendChild(header);
  });

  for (let i = 0; i < firstDay.getDay(); i++) {
    const empty = document.createElement("div");
    empty.className = "day";
    calendar.appendChild(empty);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const current = new Date(y, m, day);
    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    dayDiv.dataset.date = buildISODateLocal(y, m, day);

    if (current.toDateString() === new Date().toDateString()) dayDiv.classList.add("today");

    const dayNumber = document.createElement("div");
    dayNumber.className = "day-number";
    dayNumber.textContent = day;
    dayNumber.onclick = () => openModalForDate(buildISODateLocal(y, m, day));
    dayDiv.appendChild(dayNumber);

    const dailyEntries = entries.filter(e => occursOnDate(e, current));
    dailyEntries.forEach((e, idx) => {
      const div = document.createElement("div");
      div.className = `entry ${e.type}`;
      div.textContent = `${e.title} $${e.amount.toFixed(2)}`;
      div.onclick = ev => {
        openModalForEntry(entries.indexOf(e), ev);
        ev.stopPropagation();
      };
      dayDiv.appendChild(div);
    });

    calendar.appendChild(dayDiv);
  }
}

// --- MODAL ---
function openModalForDate(date) {
  entryModal.classList.remove("hidden");
  modalForm.reset();
  editingIndex = null;
  modalDate = date;
  modalRecurrence.value = "once";
  modalWeeklyFields.classList.add("hidden");
  modalMonthlyFields.classList.add("hidden");
  modalStartDate.value = date;
  modalEndDate.value = "";
}

function openModalForEntry(index, event) {
  event.stopPropagation();
  editingIndex = index;
  const e = entries[index];
  entryModal.classList.remove("hidden");
  modalType.value = e.type;
  modalTitle.value = e.title;
  modalAmount.value = e.amount;
  modalRecurrence.value = e.recurrence;
  modalDayOfWeek.value = e.dayOfWeek || "0";
  modalDayOfMonth.value = e.dayOfMonth || "1";
  modalStartDate.value = e.startDate || "";
  modalEndDate.value = e.endDate || "";
  modalWeeklyFields.classList.toggle("hidden", e.recurrence !== "weekly");
  modalMonthlyFields.classList.toggle("hidden", e.recurrence !== "monthly");
  modalDate = e.date || buildISODateLocal(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
}

modalRecurrence.addEventListener("change", () => {
  modalWeeklyFields.classList.toggle("hidden", modalRecurrence.value !== "weekly");
  modalMonthlyFields.classList.toggle("hidden", modalRecurrence.value !== "monthly");
});

modalCancel.addEventListener("click", () => entryModal.classList.add("hidden"));

modalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const target = {
    type: modalType.value,
    title: modalTitle.value,
    amount: parseFloat(modalAmount.value),
    recurrence: modalRecurrence.value,
    dayOfWeek: modalDayOfWeek.value,
    dayOfMonth: modalDayOfMonth.value,
    startDate: modalStartDate.value,
    endDate: modalEndDate.value,
  };
  if (target.recurrence === "once") target.date = modalStartDate.value;
  if (target.recurrence === "annual")
    target.monthDay = `${new Date().getMonth() + 1}-${new Date().getDate()}`;

  if (editingIndex !== null) entries[editingIndex] = target;
  else entries.push(target);

  saveEntries();
  renderCalendar();
  renderLog();
  updateSummary();
  entryModal.classList.add("hidden");
});

modalDelete.addEventListener("click", () => {
  if (editingIndex === null) return;
  entries.splice(editingIndex, 1);
  saveEntries();
  renderCalendar();
  renderLog();
  updateSummary();
  entryModal.classList.add("hidden");
  editingIndex = null;
});

function modalDeleteHandler(i) {
  entries.splice(i, 1);
  saveEntries();
  renderCalendar();
  renderLog();
  updateSummary();
}

prevMonth.addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  renderCalendar();
  renderLog();
  updateSummary();
});
nextMonth.addEventListener("click", () => {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  renderCalendar();
  renderLog();
  updateSummary();
});

// --- LOG ---
function renderLog() {
  const visibleEntries = [];
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();

  for (let d = 1; d <= lastDay; d++) {
    const day = new Date(y, m, d);
    entries.forEach((e, idx) => {
      if (occursOnDate(e, day)) {
        const copy = { ...e, _origIndex: idx };
        copy.date = buildISODateLocal(day.getFullYear(), day.getMonth(), day.getDate());
        visibleEntries.push(copy);
      }
    });
  }

  let sorted = [...visibleEntries];
  switch (sortLog.value) {
    case "date": sorted.sort((a, b) => (a.date || "").localeCompare(b.date || "")); break;
    case "amount": sorted.sort((a, b) => a.amount - b.amount); break;
    case "type": sorted.sort((a, b) => a.type.localeCompare(b.type)); break;
    case "title": sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
    case "rule": sorted.sort((a, b) => a.recurrence.localeCompare(b.recurrence)); break;
  }

  logBody.innerHTML = "";
  sorted.forEach(e => {
    let dateDisp = formatDateMMDDYYYY(e.date);
    let ruleDisp = { once:"One-time", weekly:"Weekly", monthly:"Monthly", annual:"Annually" }[e.recurrence];

    logBody.innerHTML += `
      <tr class="${e.type}">
        <td>${e.type}</td>
        <td>${e.title}</td>
        <td>$${e.amount.toFixed(2)}</td>
        <td>${dateDisp}</td>
        <td>${ruleDisp}</td>
        <td>
          <button class="btn-secondary" onclick="openModalForEntry(${e._origIndex}, event)">Edit</button>
          <button class="btn-danger" onclick="modalDeleteHandler(${e._origIndex})">Delete</button>
        </td>
      </tr>`;
  });
}

sortLog.addEventListener("change", renderLog);

// --- SUMMARY ---
function updateSummary() {
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  let income = 0, expenses = 0;

  for (let d = 1; d <= lastDay; d++) {
    const day = new Date(y, m, d);
    entries.forEach((e) => {
      if (occursOnDate(e, day)) {
        if (e.type === "income") income += Number(e.amount) || 0;
        else expenses += Number(e.amount) || 0;
      }
    });
  }

  totalIncome.textContent = income.toFixed(2);
  totalExpensesEl.textContent = expenses.toFixed(2);
  remainingEl.textContent = (income - expenses).toFixed(2);
  const remainingCard = document.querySelector(".summary-card.remaining");
  remainingCard.style.color = (income - expenses > 0) ? "#10b981" : (income - expenses < 0 ? "#ef4444" : "#6b7280");

  const monthName = currentMonth.toLocaleString("default", { month: "long" });
  document.getElementById("incomeMonth").textContent = monthName;
  document.getElementById("expenseMonth").textContent = monthName;
  document.getElementById("remainingMonth").textContent = monthName;
}

// --- EXPORT CSV ---
exportBtn.addEventListener("click", () => {
  let csvContent = "Type,Title,Amount,Date,Rule\n";
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();

  const visibleEntries = [];
  for (let d = 1; d <= lastDay; d++) {
    const day = new Date(y, m, d);
    entries.forEach(e => { if (occursOnDate(e, day)) visibleEntries.push({ ...e, date: buildISODateLocal(day.getFullYear(), day.getMonth(), day.getDate()) }); });
  }

  visibleEntries.forEach(e => {
    let dateDisp = formatDateMMDDYYYY(e.date);
    let ruleDisp = { once:"One-time", weekly:"Weekly", monthly:"Monthly", annual:"Annually" }[e.recurrence];
    csvContent += `${e.type},${e.title},${e.amount},${dateDisp},${ruleDisp}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `budget_log_${m + 1}_${y}.csv`;
  link.click();
});

// --- JSON Backup ---
backupBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `budget_backup_${currentMonth.getFullYear()}_${currentMonth.getMonth() + 1}.json`;
  link.click();
});

// --- JSON Restore ---
restoreBtn.addEventListener("click", () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          entries = data;
          saveEntries();
          renderCalendar();
          renderLog();
          updateSummary();
        } else {
          alert("Invalid JSON structure.");
        }
      } catch {
        alert("Error reading JSON file.");
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
});

// --- INIT ---
renderCalendar();
renderLog();
updateSummary();
openAddEntryBtn.addEventListener("click", () =>
  openModalForDate(buildISODateLocal(currentMonth.getFullYear(), currentMonth.getMonth(), new Date().getDate()))
);
