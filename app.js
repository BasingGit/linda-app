// --- Persistent storage ---
const STORAGE_KEY = "selectedDates";

function loadSelections() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveSelections(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let selectedDates = loadSelections();

// --- Calendar state ---
let current = new Date();
current.setDate(1);

let rangeStart = null;

// --- Helpers ---
function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function daysBetween(d1, d2) {
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function countInLast180Days(targetDate) {
  const target = new Date(targetDate);
  let count = 0;

  for (const dateStr in selectedDates) {
    const d = new Date(dateStr);
    const diff = daysBetween(d, target);
    if (diff >= 0 && diff <= 180) count++;
  }
  return count;
}

// --- Range-start indicator ---
function clearRangeStartIndicator() {
  document.querySelectorAll(".range-start").forEach(el =>
    el.classList.remove("range-start")
  );
}

// --- Render calendar ---
function renderCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const monthLabel = document.getElementById("monthLabel");
  monthLabel.textContent = current.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Padding for first weekday
  for (let i = 0; i < firstDay.getDay(); i++) {
    const empty = document.createElement("div");
    calendar.appendChild(empty);
  }

  // Days of month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);

    const div = document.createElement("div");
    div.className = "day";
    div.textContent = day;

    if (selectedDates[dateStr]) {
      div.classList.add("selected");
    }

    // Badge
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = countInLast180Days(dateStr);
    div.appendChild(badge);

    // Click handler
    div.addEventListener("click", () => handleDayClick(date));

    calendar.appendChild(div);
  }
}

// --- Range selection logic ---
function handleDayClick(date) {
  const dateStr = formatDate(date);

  // If no start selected yet
  if (!rangeStart) {
    rangeStart = date;

    clearRangeStartIndicator();

    // Add indicator to the tapped day
    const dayEl = [...document.querySelectorAll(".day")]
      .find(el => el.textContent == date.getDate());
    if (dayEl) dayEl.classList.add("range-start");

    return;
  }

  // If we already have a start, complete the range
  const start = rangeStart < date ? rangeStart : date;
  const end = rangeStart < date ? date : rangeStart;

  let cursor = new Date(start);

  // Determine if range is fully selected
  let fullySelected = true;
  while (cursor <= end) {
    if (!selectedDates[formatDate(cursor)]) {
      fullySelected = false;
      break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Apply or remove range
  cursor = new Date(start);
  while (cursor <= end) {
    const key = formatDate(cursor);
    if (fullySelected) {
      delete selectedDates[key];
    } else {
      selectedDates[key] = true;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  saveSelections(selectedDates);

  // Reset state
  rangeStart = null;
  clearRangeStartIndicator();

  renderCalendar();
}

// --- Swipe navigation ---
let touchStartX = 0;
let touchEndX = 0;

function handleGesture() {
  const dx = touchEndX - touchStartX;

  if (Math.abs(dx) < 50) return;

  if (dx < 0) {
    current.setMonth(current.getMonth() + 1);
  } else {
    current.setMonth(current.getMonth() - 1);
  }

  renderCalendar();
}

document.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener("touchend", e => {
  touchEndX = e.changedTouches[0].screenX;
  handleGesture();
});

// --- Navigation buttons ---
document.getElementById("prevMonth").onclick = () => {
  current.setMonth(current.getMonth() - 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  current.setMonth(current.getMonth() + 1);
  renderCalendar();
};

// --- Initial render ---
renderCalendar();
