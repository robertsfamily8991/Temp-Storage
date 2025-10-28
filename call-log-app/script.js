document.addEventListener('DOMContentLoaded', () => {
    let calls = JSON.parse(localStorage.getItem('calls')) || [];
    let selectedDate = null;
    let currentMonth = new Date();
    const calendar = document.getElementById('calendar');
    const monthYear = document.getElementById('monthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const logTable = document.getElementById('logTable').querySelector('tbody');
    const addCallBtn = document.getElementById('addCallBtn');
    const modal = document.getElementById('callModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeModalBtn = document.getElementById('closeModal');
    const callForm = document.getElementById('callForm');
    const callIdInput = document.getElementById('callId');
    const showMonthBtn = document.getElementById('showMonthBtn');
    const showFollowUpsBtn = document.getElementById('showFollowUpsBtn');
    const searchInput = document.getElementById('searchInput');
    const exportCSVBtn = document.getElementById('exportCSV');
    const importCSVInput = document.getElementById('importCSV');
    const exportJSONBtn = document.getElementById('exportJSON');
    const importJSONInput = document.getElementById('importJSON');

    function saveCalls() {
        localStorage.setItem('calls', JSON.stringify(calls));
    }

    function renderCalendar() {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        monthYear.textContent = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
        calendar.innerHTML = '';

        for (let i = 0; i < firstDay; i++) {
            calendar.appendChild(document.createElement('div'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.textContent = day;

            if (calls.some(c => c.date === dateString)) {
                dayDiv.classList.add('has-call');
            }

            if (dateString === selectedDate) {
                dayDiv.classList.add('selected');
            }

            dayDiv.addEventListener('click', () => {
                selectedDate = dateString;
                renderCalendar();
                renderCallLog();
            });

            calendar.appendChild(dayDiv);
        }
    }

    function renderCallLog() {
        logTable.innerHTML = '';
        let filtered = calls;

        if (selectedDate) {
            filtered = filtered.filter(c => c.date === selectedDate);
        }

        filtered.forEach(call => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${call.name}</td>
                <td>${call.phone}</td>
                <td>${call.type}</td>
                <td>${call.date}</td>
                <td>${call.time}</td>
                <td>${call.notes}</td>
                <td>${call.followUp ? 'Yes' : 'No'}</td>
                <td>
                    <button class="editBtn" data-id="${call.id}">Edit</button>
                    <button class="deleteBtn" data-id="${call.id}">Delete</button>
                </td>
            `;
            logTable.appendChild(tr);
        });

        document.querySelectorAll('.editBtn').forEach(btn => {
            btn.addEventListener('click', () => editCall(btn.dataset.id));
        });

        document.querySelectorAll('.deleteBtn').forEach(btn => {
            btn.addEventListener('click', () => deleteCall(btn.dataset.id));
        });
    }

    function openModal(edit = false, call = {}) {
        modal.style.display = 'block';
        modalTitle.textContent = edit ? 'Edit Call' : 'Add Call';
        callForm.reset();

        if (edit) {
            callIdInput.value = call.id;
            document.getElementById('name').value = call.name;
            document.getElementById('phone').value = call.phone;
            document.getElementById('type').value = call.type;
            document.getElementById('date').value = call.date;
            document.getElementById('time').value = call.time;
            document.getElementById('notes').value = call.notes;
            document.getElementById('followUp').checked = call.followUp;
        }
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    function editCall(id) {
        const call = calls.find(c => c.id == id);
        openModal(true, call);
    }

    function deleteCall(id) {
        if (confirm('Are you sure you want to delete this call?')) {
            calls = calls.filter(c => c.id != id);
            saveCalls();
            renderCalendar();
            renderCallLog();
        }
    }

    callForm.addEventListener('submit', e => {
        e.preventDefault();
        const id = callIdInput.value;
        const callData = {
            id: id || Date.now(),
            name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            type: document.getElementById('type').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            notes: document.getElementById('notes').value.trim(),
            followUp: document.getElementById('followUp').checked,
            createdAt: id ? calls.find(c => c.id == id).createdAt : new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        if (id) {
            const index = calls.findIndex(c => c.id == id);
            calls[index] = callData;
        } else {
            calls.push(callData);
        }

        saveCalls();
        closeModal();
        renderCalendar();
        renderCallLog();
    });

    addCallBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);

    prevMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });

    exportCSVBtn.addEventListener('click', () => {
        const headers = ["Name", "Phone", "Type", "Date", "Time", "Notes", "FollowUp"];
        const rows = calls.map(c => [
            c.name, c.phone, c.type, c.date, c.time, c.notes, c.followUp
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "calls.csv";
        a.click();
    });

    importCSVInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();

        reader.onload = function(e) {
            const text = e.target.result;

            // ✅ Robust CSV parser (handles quotes, commas, line breaks)
            const parseCSV = (str) => {
                const rows = [];
                let row = [];
                let inQuotes = false;
                let value = '';

                for (let i = 0; i < str.length; i++) {
                    const c = str[i];
                    if (c === '"') {
                        if (inQuotes && str[i + 1] === '"') {
                            value += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (c === ',' && !inQuotes) {
                        row.push(value.trim());
                        value = '';
                    } else if ((c === '\n' || c === '\r') && !inQuotes) {
                        if (value || row.length) {
                            row.push(value.trim());
                            rows.push(row);
                            row = [];
                            value = '';
                        }
                    } else {
                        value += c;
                    }
                }
                if (value || row.length) row.push(value.trim());
                if (row.length) rows.push(row);
                return rows.filter(r => r.length > 1);
            };

            const rows = parseCSV(text);
            const hasHeader = rows[0][0].toLowerCase().includes("name");
            const dataRows = hasHeader ? rows.slice(1) : rows;

            dataRows.forEach(r => {
                const [name, phone, type, date, time, notes, followUp] = r;
                if (name) {
                    calls.push({
                        id: Date.now() + Math.random(),
                        name: name || "",
                        phone: phone || "",
                        type: type || "Call",
                        date: date || "",
                        time: time || "",
                        notes: notes || "",
                        followUp: (followUp || "").toLowerCase() === "true",
                        createdAt: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    });
                }
            });

            saveCalls();
            renderCalendar();
            renderCallLog();
        };

        reader.readAsText(file);
    });

    exportJSONBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(calls, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "calls_backup.json";
        a.click();
    });

    importJSONInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    calls = imported;
                    saveCalls();
                    renderCalendar();
                    renderCallLog();
                } else {
                    alert("Invalid JSON file.");
                }
            } catch {
                alert("Error reading JSON file.");
            }
        };

        reader.readAsText(file);
    });

    renderCalendar();
    renderCallLog();
});
