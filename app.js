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
  return d.toISOString().split("T")[0];
}
function daysBetween(d1,d2){
  return Math.floor((d2 - d1) / (1000*60*60*24));
}
function countInLast180Days(targetDate){
  const target = new Date(targetDate);
  let count = 0;
  for(const dateStr in selectedDates){
    const d = new Date(dateStr);
    const diff = daysBetween(d, target);
    if(diff >= 0 && diff <= 180) count++;
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

  // Padding for first weekday: create empty .day elements so grid sizing is consistent
  for(let i = 0; i < firstDay.getDay(); i++){
    const empty = document.createElement("div");
    empty.className = "day empty";
    empty.setAttribute("aria-hidden","true");
    calendar.appendChild(empty);
  }

  // Days of month
  for(let day = 1; day <= lastDay.getDate(); day++){
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
    
    // Apply low/high class based on threshold
    if (count <= 90) {
      badge.classList.add("low");
    } else {
      badge.classList.add("high");
    }
    
    badge.textContent = count;
    
    div.appendChild(dateLabel);
    div.appendChild(badge);

    if(selectedDates[dateStr]) div.classList.add("selected");

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

    // Find the matching day element and mark it
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
}

// Swipe navigation (horizontal only)
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
}

// Navigation buttons
document.getElementById("prevMonth").onclick = () => {
  current.setMonth(current.getMonth() - 1);
  renderCalendar("right");
};
document.getElementById("nextMonth").onclick = () => {
  current.setMonth(current.getMonth() + 1);
  renderCalendar("left");
};

// Initial render
renderCalendar();
