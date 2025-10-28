let calls = JSON.parse(localStorage.getItem('calls') || '[]');
let currentModalIndex = null;
let currentMonth = new Date();
let selectedDate = new Date();
let showMonth = false;
let showFollowups = false;
let searchQuery = '';

/* Helpers */
function escapeHtml(s){return s.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function formatPhone(value){ 
  const digits=value.replace(/\D/g,'').slice(0,10); 
  if(digits.length<=3)return digits; 
  if(digits.length<=6)return `(${digits.slice(0,3)}) ${digits.slice(3)}`; 
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`; 
}
function saveCalls(){ localStorage.setItem('calls', JSON.stringify(calls)); }

/* Calendar */
function renderCalendar(){
  const grid = document.getElementById('calendarGrid'); grid.innerHTML='';
  const monthYear = document.getElementById('calendarMonthYear');
  const year = currentMonth.getFullYear(), m = currentMonth.getMonth();
  monthYear.textContent = currentMonth.toLocaleString('default',{month:'long',year:'numeric'});
  const firstDay = new Date(year,m,1).getDay();
  const daysInMonth = new Date(year,m+1,0).getDate();
  const today = new Date();

  for(let i=0;i<firstDay;i++){ grid.appendChild(document.createElement('div')); }

  for(let d=1; d<=daysInMonth; d++){
    const date = new Date(year,m,d);
    const cell = document.createElement('div'); cell.className='calendar-cell';
    if(selectedDate && date.toDateString()===selectedDate.toDateString()) cell.classList.add('selected');
    if(date.toDateString()===today.toDateString()) cell.style.border='2px solid #7cff7c';

    const names = calls.filter(c => new Date(c.timestamp).toDateString()===date.toDateString())
                       .map(c=>({name:c.name, followup:c.followup}));

    if(names.length) cell.classList.add('has-calls');

    const dayDiv=document.createElement('div'); dayDiv.textContent=d; cell.appendChild(dayDiv);

    if(names.length){
      const namesDiv=document.createElement('div'); namesDiv.className='cell-names';
      names.forEach(c=>{
        const span=document.createElement('span'); span.textContent=c.name;
        if(c.followup) span.classList.add('followup');
        span.addEventListener('click', (e)=>{
          e.stopPropagation();
          const callIndex=calls.findIndex(call=>call.name===c.name && new Date(call.timestamp).toDateString()===date.toDateString());
          if(callIndex>-1) openModal(callIndex);
        });
        namesDiv.appendChild(span);
      });
      cell.appendChild(namesDiv);
    }

    const hasFollowup = calls.some(c => new Date(c.timestamp).toDateString()===date.toDateString() && c.followup);
    if(hasFollowup){
      const dot = document.createElement('div');
      dot.style.width='6px'; dot.style.height='6px'; dot.style.background='red';
      dot.style.borderRadius='50%'; dot.style.position='absolute'; dot.style.top='5px'; dot.style.right='5px';
      cell.appendChild(dot);
    }

    cell.addEventListener('click',()=>{
      selectedDate=date;
      renderCalendar();
      renderCalls(searchQuery);
    });
    grid.appendChild(cell);
  }
}

/* Render calls */
function renderCalls(q=''){
  searchQuery = q;
  const tbody = document.querySelector('#callTable tbody'); tbody.innerHTML='';
  const isSearching = q.trim() !== '';

  calls.filter(c=>{
    const callDate = new Date(c.timestamp);
    if(isSearching) return true;
    if(showFollowups) return c.followup;
    if(showMonth) return callDate.getMonth()===currentMonth.getMonth() && callDate.getFullYear()===currentMonth.getFullYear();
    if(selectedDate && callDate.toDateString()===selectedDate.toDateString() &&
       callDate.getMonth()===currentMonth.getMonth() && callDate.getFullYear()===currentMonth.getFullYear()) return true;
    return false;
  }).filter(c=>{
    return (c.name||'').toLowerCase().includes(q.toLowerCase()) ||
           (c.number||'').includes(q) ||
           (c.email||'').toLowerCase().includes(q.toLowerCase()) ||
           (c.vehicle||'').toLowerCase().includes(q.toLowerCase()) ||
           (c.notes||'').toLowerCase().includes(q.toLowerCase());
  }).forEach((call)=>{
    const idx = calls.indexOf(call);
    const tr=document.createElement('tr');
    tr.style.background=call.followup?'rgba(255,0,0,0.2)':'';
    tr.innerHTML=`
      <td>${call.timestamp}</td>
      <td>${escapeHtml(call.name||'')}</td>
      <td>${escapeHtml(call.number||'')}</td>
      <td>${escapeHtml(call.email||'')}</td>
      <td>${escapeHtml(call.vehicle||'')}</td>
      <td>${call.callType||''}</td>
      <td>${escapeHtml(call.notes||'')}</td>
      <td class="actions-col">
        <button class="btn subtle view-btn" data-idx="${idx}">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Column visibility
  const table=document.getElementById('callTable');
  document.querySelectorAll('.columns-dropdown input[type="checkbox"]').forEach((c, col)=>{
    for(let r=0;r<table.rows.length;r++){
      if(table.rows[r].cells[col]) table.rows[r].cells[col].style.display=c.checked?'':'none';
    }
  });
}

/* Modal */
const modal=document.getElementById('modal');
const closeBtn=modal.querySelector('.close-btn');
window.openModal=function(idx){
  currentModalIndex=idx;
  const c=calls[idx];
  document.getElementById('modalTitle').textContent='Edit Call';
  document.getElementById('m_name').value=c.name||'';
  document.getElementById('m_number').value=c.number||'';
  document.getElementById('m_email').value=c.email||'';
  document.getElementById('m_vehicle').value=c.vehicle||'';
  document.getElementById('m_callType').value=c.callType||'Incoming';
  document.getElementById('m_notes').value=c.notes||'';
  document.getElementById('m_date').value=new Date(c.timestamp).toISOString().split('T')[0];
  document.getElementById('m_followup').checked=c.followup||false;

  document.getElementById('createdAt').textContent = c.createdAt ? `Created: ${new Date(c.createdAt).toLocaleString()}` : '';
  document.getElementById('lastUpdate').textContent = c.lastUpdated ? `Updated: ${new Date(c.lastUpdated).toLocaleString()}` : '';
  
  modal.classList.remove('hidden');
};
closeBtn.addEventListener('click',()=>modal.classList.add('hidden'));
document.getElementById('modalCancelBtn').addEventListener('click',()=>modal.classList.add('hidden'));

/* Add new call modal */
document.getElementById('addCallBtn').addEventListener('click',()=>{
  currentModalIndex=null;
  document.getElementById('modalTitle').textContent='Add Call';
  document.getElementById('modalForm').reset();
  document.getElementById('createdAt').textContent='';
  document.getElementById('lastUpdate').textContent='';
  modal.classList.remove('hidden');
});

/* Modal save/delete */
document.getElementById('modalForm').addEventListener('submit',e=>{
  e.preventDefault();
  const selectedDateValue = document.getElementById('m_date').value;
  const timestamp = selectedDateValue 
    ? new Date(selectedDateValue + ' ' + new Date().toLocaleTimeString()).toLocaleString()
    : new Date().toLocaleString();
  const now = new Date().toISOString();

  const data={
    name:document.getElementById('m_name').value.trim(),
    number:formatPhone(document.getElementById('m_number').value),
    email:document.getElementById('m_email').value.trim(),
    vehicle:document.getElementById('m_vehicle').value.trim(),
    callType:document.getElementById('m_callType').value,
    notes:document.getElementById('m_notes').value.trim(),
    timestamp: timestamp,
    followup: document.getElementById('m_followup').checked,
    createdAt: currentModalIndex!==null ? calls[currentModalIndex].createdAt : now,
    lastUpdated: now
  };
  if(currentModalIndex!==null) calls[currentModalIndex]=data;
  else calls.push(data);

  saveCalls(); renderCalendar(); renderCalls(searchQuery); modal.classList.add('hidden');
});

document.getElementById('modalDeleteBtn').addEventListener('click',()=>{
  if(currentModalIndex===null) return;
  if(confirm('Delete this call?')){
    calls.splice(currentModalIndex,1);
    saveCalls(); renderCalendar(); renderCalls(searchQuery); modal.classList.add('hidden');
  }
});

/* Event delegation for Edit buttons in table */
document.querySelector('#callTable tbody').addEventListener('click', e=>{
  if(e.target.classList.contains('view-btn')){
    openModal(Number(e.target.dataset.idx));
  }
});

/* Navigation & toggles */
document.getElementById('prevMonth').addEventListener('click',()=>{ currentMonth.setMonth(currentMonth.getMonth()-1); selectedDate=null; renderCalendar(); renderCalls(searchQuery); });
document.getElementById('nextMonth').addEventListener('click',()=>{ currentMonth.setMonth(currentMonth.getMonth()+1); selectedDate=null; renderCalendar(); renderCalls(searchQuery); });

/* Columns dropdown */
const columnsToggle=document.getElementById('columnsToggle');
const columnsDropdown=document.getElementById('columnsDropdown');
columnsToggle.addEventListener('click',()=>columnsDropdown.classList.toggle('hidden'));
document.addEventListener('click',e=>{if(!columnsDropdown.classList.contains('hidden')&&!e.target.closest('.columns-menu')) columnsDropdown.classList.add('hidden');});
document.querySelectorAll('.columns-dropdown input[type="checkbox"]').forEach(cb=>cb.addEventListener('change',()=>{
  const table=document.getElementById('callTable');
  const checks=Array.from(document.querySelectorAll('.columns-dropdown input[type="checkbox"]'));
  for(let r=0;r<table.rows.length;r++){ const row=table.rows[r]; checks.forEach((cb,col)=>{if(row.cells[col]) row.cells[col].style.display=cb.checked?'':'none';});}
}));
document.getElementById('columnsReset').addEventListener('click',()=>{
  document.querySelectorAll('.columns-dropdown input[type="checkbox"]').forEach(cb=>cb.checked=true);
  document.querySelectorAll('.columns-dropdown input[type="checkbox"]').forEach(cb=>cb.dispatchEvent(new Event('change')));
});

/* Toggle log visibility */
document.getElementById('toggleLogBtn').addEventListener('click',()=>{
  const w=document.getElementById('callLogWrapper');
  const btn=document.getElementById('toggleLogBtn');
  if(w.style.display==='none'){ w.style.display=''; btn.textContent='Hide Call Log'; }
  else { w.style.display='none'; btn.textContent='Show Call Log'; }
});

/* Month toggle button */
const monthToggleBtn=document.getElementById('monthToggleBtn');
monthToggleBtn.addEventListener('click',()=>{
  showMonth=!showMonth; showFollowups=false;
  monthToggleBtn.classList.toggle('accent',showMonth);
  followupsToggleBtn.classList.remove('accent');
  renderCalendar(); renderCalls(searchQuery);
});

/* Follow-ups toggle */
const followupsToggleBtn=document.getElementById('followupsToggleBtn');
followupsToggleBtn.addEventListener('click',()=>{
  showFollowups=!showFollowups; showMonth=false;
  followupsToggleBtn.classList.toggle('accent',showFollowups);
  monthToggleBtn.classList.remove('accent');
  renderCalendar(); renderCalls(searchQuery);
});

/* Search input */
document.getElementById('searchInput').addEventListener('input',e=>renderCalls(e.target.value));

/* Export CSV */
document.getElementById('exportBtn').addEventListener('click',()=>{
  let csv='Timestamp,Name,Phone,Email,Vehicle,Type,Notes,Follow-up,Created,Updated\n';
  calls.forEach(c=>{
    csv+=`"${c.timestamp}","${c.name}","${c.number}","${c.email}","${c.vehicle}","${c.callType}","${c.notes}",${c.followup},"${c.createdAt || ''}","${c.lastUpdated || ''}"\n`;
  });
  const blob = new Blob([csv], {type: 'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='calls.csv'; a.click();
});

/* Import CSV */
const importFile=document.getElementById('importFile');
document.getElementById('importBtn').addEventListener('click',()=>importFile.click());
importFile.addEventListener('change', e=>{
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=function(ev){
    const lines=ev.target.result.split(/\r?\n/).slice(1);
    lines.forEach(line=>{
      if(!line.trim()) return;
      const cols=line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s=>s.replace(/^"|"$/g,''));
      const data={
        timestamp: cols[0] || new Date().toLocaleString(),
        name: cols[1] || '',
        number: formatPhone(cols[2] || ''),
        email: cols[3] || '',
        vehicle: cols[4] || '',
        callType: cols[5] || '',
        notes: cols[6] || '',
        followup: cols[7]==='true',
        createdAt: cols[8] || new Date().toISOString(),
        lastUpdated: cols[9] || new Date().toISOString()
      };
      calls.push(data);
    });
    saveCalls(); renderCalendar(); renderCalls();
  };
  reader.readAsText(file);
});

/* --- Backup & Restore --- */
function backupCalls(){
  const backup = JSON.stringify(calls, null, 2);
  const blob = new Blob([backup], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'calls_backup.json';
  a.click();
}

function restoreCalls(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try{
        const restored = JSON.parse(ev.target.result);
        if(Array.isArray(restored)){
          calls = restored.map(c => ({
            ...c,
            createdAt: c.createdAt || new Date().toISOString(),
            lastUpdated: c.lastUpdated || new Date().toISOString()
          }));
          saveCalls();
          renderCalendar();
          renderCalls();
          alert('Backup restored successfully!');
        } else alert('Invalid backup file.');
      } catch(err){ alert('Error parsing backup file.'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* Bind HTML buttons (remove dynamic button creation) */
document.getElementById('backupBtn').addEventListener('click', backupCalls);
document.getElementById('restoreBtn').addEventListener('click', restoreCalls);

/* Initial render */
renderCalendar();
renderCalls();
