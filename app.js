// Persistent storage
const STORAGE_KEY = "selectedDates";
function loadSelections(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
function saveSelections(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

let selectedDates = loadSelections();

// Calendar state
let current = new Date();
current.setDate(1);

let rangeStart = null;

// Helpers
function formatDate(d){
  // LOCAL‑SAFE VERSION — no UTC shift
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(d1,d2){
  return Math.floor((d2 - d1) / (1000*60*60*24));
}

function countInLast180Days(targetDate){
  const target = new Date(targetDate);
  let count = 0;
  for(const dateStr in selectedDates){
    const [y, m, day] = dateStr.split("-").map(Number);
    const d = new Date(y, m - 1, day); // LOCAL‑SAFE PARSE
    const diff = daysBetween(d, target);
    if(diff >= 0 && diff < 180) count++;
  }
  return count;
}

function clearRangeStartIndicator(){
  document.querySelectorAll(".range-start").forEach(el => el.classList.remove("range-start"));
}

// Render calendar
function renderCalendar(animation = null){
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  // Apply animation class
  calendar.classList.remove("slide-left-enter","slide-right-enter");
  if(animation) calendar.classList.add(`slide-${animation}-enter`);

  // Month label
  document.getElementById("monthLabel").textContent =
    current.toLocaleString("default",{month:"long",year:"numeric"});

  // Weekday headers
  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  weekdays.forEach(day => {
    const label = document.createElement("div");
    label.className = "weekday";
    label.textContent = day;
    calendar.appendChild(label);
  });

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Padding for first weekday
  for(let i = 0; i < firstDay.getDay(); i++){
    const empty = document.createElement("div");
    empty.className = "day empty";
    empty.setAttribute("aria-hidden","true");
    calendar.appendChild(empty);
  }

  // Days of month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
  
    const div = document.createElement("div");
    div.className = "day";
  
    // Date label (top-right)
    const dateLabel = document.createElement("div");
    dateLabel.className = "date-label";
    dateLabel.textContent = day;
  
    // Badge with threshold color
    const count = countInLast180Days(dateStr);
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.classList.add(count <= 90 ? "low" : "high");
    badge.textContent = count;
  
    // Append label and badge (structure first, classes applied after)
    div.appendChild(dateLabel);
    div.appendChild(badge);
  
    // Reapply visual state from data/state (order matters)
    // 1) selected (comes from persistent selectedDates)
    if (selectedDates[dateStr]) {
      div.classList.add("selected");
    }
  
    // 2) today highlight
    const now = new Date();
    if (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    ) {
      div.classList.add("today");
    }
  
    // 3) range-start (reapply if the stored rangeStart matches this date)
    if (rangeStart) {
      // ensure rangeStart is a Date object; formatDate(rangeStart) is safe
      if (formatDate(rangeStart) === dateStr) {
        div.classList.add("range-start");
      }
    }
  
    // Event handler (unchanged)
    div.addEventListener("click", () => handleDayClick(date));
  
    calendar.appendChild(div);
  }
}

// Range selection logic
function handleDayClick(date){
  const dateStr = formatDate(date);

  if(!rangeStart){
    rangeStart = date;    
    clearRangeStartIndicator();
    const dayEls = [...document.querySelectorAll(".day")];
    const dayEl = dayEls.find(el => {
      const lbl = el.querySelector(".date-label");
      return lbl && Number(lbl.textContent) === date.getDate();
    });
    if(dayEl) dayEl.classList.add("range-start");    
    return;
  }

  const start = rangeStart < date ? rangeStart : date;
  const end = rangeStart < date ? date : rangeStart;

  let cursor = new Date(start);
  let fullySelected = true;
  while(cursor <= end){
    if(!selectedDates[formatDate(cursor)]){
      fullySelected = false;
      break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  cursor = new Date(start);
  while(cursor <= end){
    const key = formatDate(cursor);
    if(fullySelected) delete selectedDates[key];
    else selectedDates[key] = true;
    cursor.setDate(cursor.getDate() + 1);
  }

  saveSelections(selectedDates);
  rangeStart = null;
  clearRangeStartIndicator();
  renderCalendar();
  updateActiveDatesList(); // ← KEEP THIS
}

// Active dates summary lists
function updateActiveDatesList() {
  const today = new Date();
  today.setHours(0,0,0,0);

  // parse stored keys as local dates
  const allDates = Object.keys(selectedDates)
    .map(d => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, m - 1, day);
    })
    .sort((a,b) => a - b);

  // helpers to build ranges from a sorted array of Date objects
  function buildRanges(datesArray) {
    const ranges = [];
    for (let i = 0; i < datesArray.length; i++) {
      let start = datesArray[i];
      let end = start;
      while (i + 1 < datesArray.length && (datesArray[i + 1] - end) === 86400000) {
        end = datesArray[++i];
      }
      ranges.push({ start, end });
    }
    return ranges;
  }

  // split into past (within last 180 days) and next (today..+180)
  const pastCutoff = new Date(today);
  pastCutoff.setDate(pastCutoff.getDate() - 180);

  const futureCutoff = new Date(today);
  futureCutoff.setDate(futureCutoff.getDate() + 180);

  const pastDates = allDates.filter(d => d >= pastCutoff && d < today);
  const nextDates = allDates.filter(d => d >= today && d <= futureCutoff);

  const pastRanges = buildRanges(pastDates);
  const nextRanges = buildRanges(nextDates);

  const fmt = d =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
     .toUpperCase().replace(" ", "-");

  function rangesToText(ranges) {
    if (ranges.length === 0) return "    None";
    return ranges
      .map(r =>
        r.start.getTime() === r.end.getTime()
          ? `    ${fmt(r.start)}`
          : `    ${fmt(r.start)} to ${fmt(r.end)}`
      )
      .join("\n");
  }

  const pastEl = document.getElementById("pastDates");
  const nextEl = document.getElementById("nextDates");
  if (pastEl) pastEl.textContent = rangesToText(pastRanges);
  if (nextEl) nextEl.textContent = rangesToText(nextRanges);
}

// Swipe navigation
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener("touchend", e => {
  touchEndX = e.changedTouches[0].screenX;
  handleGesture();
});

function handleGesture(){
  const dx = touchEndX - touchStartX;
  if(Math.abs(dx) < 50) return;

  if(dx < 0){
    current.setMonth(current.getMonth() + 1);
    renderCalendar("left");
  } else {
    current.setMonth(current.getMonth() - 1);
    renderCalendar("right");
  }
  updateActiveDatesList();
}

// Navigation buttons
document.getElementById("prevMonth").onclick = () => {
  current.setMonth(current.getMonth() - 1);
  renderCalendar("right");
  updateActiveDatesList();
};

document.getElementById("nextMonth").onclick = () => {
  current.setMonth(current.getMonth() + 1);
  renderCalendar("left");
  updateActiveDatesList();
};

// Initial render
renderCalendar();
updateActiveDatesList();
