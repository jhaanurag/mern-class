// defininig some keys for localstorage thingy
// these strings are the actual keys in localstorage
const STORAGE_KEYS = {
  subjects: 'sp_subjects',
  tasks: 'sp_tasks',
  sessions: 'sp_sessions',
  settings: 'sp_settings'
};

// grab data from browser storage or just use empty list if nuthing
// i used sp_ prefix so it dont clash with other sites on localhost
let subjects = readFromStorage(STORAGE_KEYS.subjects, []);
let tasks = readFromStorage(STORAGE_KEYS.tasks, []);
let sessions = readFromStorage(STORAGE_KEYS.sessions, []);
let settings = readFromStorage(STORAGE_KEYS.settings, { dark: false });

// func to read from storage... hope it dont break lol
function readFromStorage(key, fallbackValue) {
  try {
    // try catch is needed because sometimes localstorage throws security errors
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    // we parse it back to an object because storage only stores strings
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallbackValue;
    return parsed;
  } catch (error) {
    // if it fails just return the default stuff
    return fallbackValue;
  }
}

// simple func to save stuff to browser
function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// generate random id cuz we need it for objects and stuffs
function makeId() {
  return String(Date.now() + Math.floor(Math.random() * 1000));
}

// helper to get element by css selector... saves typing document.querySelector
function getById(selector) {
  return document.querySelector(selector);
}

// and this one for gettting all of them into a list
function getAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}

// cleanup text so no one hacks us with <div> tags
function escapeHtml(text) {
  const safeText = String(text);
  return safeText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// get day of week name from date object
function getWeekdayName(dateObj) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dateObj.getDay()];
}

// check if ids are same, converting to string just in case they are numbrs
function idsMatch(leftId, rightId) {
  return String(leftId) === String(rightId);
}

// save evrything at once to localstorage
function saveAllData() {
  saveToStorage(STORAGE_KEYS.subjects, subjects);
  saveToStorage(STORAGE_KEYS.tasks, tasks);
  saveToStorage(STORAGE_KEYS.sessions, sessions);
  saveToStorage(STORAGE_KEYS.settings, settings);
}

// change theme... dark mode is cool/better for eyes
function applyTheme() {
  if (settings.dark) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

// setup nav buttons clicking and switching views
function setupNavigation() {
  const navButtons = getAll('.nav-btn');
  const sections = getAll('.section');

  // we use a simple loop instead of forEach for better speed maybe?
  for (let i = 0; i < navButtons.length; i += 1) {
    const button = navButtons[i];
    button.addEventListener('click', function () {
      // remove active class from all buttons first
      // active class usually just changes the color or background in css
      for (let j = 0; j < navButtons.length; j += 1) {
        navButtons[j].classList.remove('active');
      }
      button.classList.add('active');

      // hide all sections
      for (let j = 0; j < sections.length; j += 1) {  
        sections[j].classList.remove('active');
      }

      // show the one we clicked
      const targetSection = sections[i];
      if (targetSection) {
        targetSection.classList.add('active');
      }

      // if its dashbord or analytics we need to refresh them contents
      const targetSectionId = targetSection ? targetSection.id : '';
      if (targetSectionId === 'dashboard') {
        renderDashboard();
      }
      if (targetSectionId === 'analytics') {
        renderChart();
      }
    });
  }
}

// show the main dashboard stats and upcoming tasks
function renderDashboard() {
  // dashboard is the first thing users see so it gotta be fast
  const totalSubjectsEl = getById('#total-subjects');
  const pendingTasksEl = getById('#pending-tasks');
  const todaySessionsEl = getById('#today-sessions');
  const upcomingList = getById('#upcoming');

  totalSubjectsEl.textContent = String(subjects.length);
// pending task counting... looping thru all tasks
  let pendingCount = 0;
  for (let i = 0; i < tasks.length; i += 1) {
    if (!tasks[i].done) {
      pendingCount += 1;
    }
  }
  pendingTasksEl.textContent = String(pendingCount);

  // get todays date for checking sessions
  const now = new Date();
  // iso string gives us YYYY-MM-DDTHH:mm:ss.sssZ so we slice to get just the date part
  const todayDate = now.toISOString().slice(0, 10);
  const todayName = getWeekdayName(now);
  let todaySessionCount = 0;

  // check which sessions are happening today
  for (let i = 0; i < sessions.length; i += 1) {
    const session = sessions[i];
    // sessions can be for a specific date or a repeating day of week
    if (session.date === todayDate || session.day === todayName) {
      todaySessionCount += 1;
    }
  }
  todaySessionsEl.textContent = String(todaySessionCount);

  // find tasks that have deadliness
  const tasksWithDeadlines = [];
  for (let i = 0; i < tasks.length; i += 1) {
    if (tasks[i].deadline) {
      // only add if it actually has a date
      tasksWithDeadlines.push(tasks[i]);
    }
  }

  // sort them by date so most urgent is first
  // subtracting dates works becuase js magic turns them into numbers
  tasksWithDeadlines.sort(function (a, b) {
    return new Date(a.deadline) - new Date(b.deadline);
  });

  // only show first 5 coz we dont want giant list
  // slice(0, 5) ensures we don't overflow the ui with 100 tasks
  const upcoming = tasksWithDeadlines.slice(0, 5);
  upcomingList.innerHTML = '';

  if (upcoming.length === 0) {
    upcomingList.innerHTML = '<li class="muted">No upcoming deadlines</li>';
    return;
  }

  // create list items for each upcoming task
  const upcomingItems = upcoming.map(function (task) {
    const item = document.createElement('li');

    let subjectName = 'No subject';
    for (let j = 0; j < subjects.length; j += 1) {
      if (idsMatch(subjects[j].id, task.subjectId)) {
        subjectName = subjects[j].name;
        break;
      }
    }

    item.innerHTML =
      '<strong>' + escapeHtml(task.title) + '</strong>' +
      '<div class="meta">' + escapeHtml(task.deadline) + ' • ' + escapeHtml(subjectName) + '</div>';

    return item;
  });

  // add them all to the page
  for (let i = 0; i < upcomingItems.length; i += 1) {
    upcomingList.appendChild(upcomingItems[i]);
  }
}

// show the list of subjects in the UI
function renderSubjects() {
  // subjectList is the <ul> or <div> where we dump the items
  const subjectList = getById('#subject-list');
  subjectList.innerHTML = '';

  for (let i = 0; i < subjects.length; i += 1) {
    const subject = subjects[i];
    const item = document.createElement('li');

    item.innerHTML =
      '<div>' +
      '<strong>' + escapeHtml(subject.name) + '</strong>' +
      '<div class="meta">Priority: ' + escapeHtml(subject.priority) + '</div>' +
      '</div>' +
      '<div><button class="edit">Edit</button> <button class="del">Delete</button></div>';

    const deleteBtn = item.querySelector('.del');
    const editBtn = item.querySelector('.edit');

    // when delete is clicked, remove it from list and save
    deleteBtn.addEventListener('click', function () {
      // filter() creates a new array without the one we want to delete
      subjects = subjects.filter(function (entry) {
        return entry.id !== subject.id;
      });

      saveToStorage(STORAGE_KEYS.subjects, subjects);
      renderSubjects();
      renderSubjectDropdowns();
      renderDashboard();
    });

    // handles editing... using prompt
    editBtn.addEventListener('click', function () {
      const nextName = prompt('Edit subject name', subject.name);
      if (!nextName) return;
 
      const nextPriority = prompt('Priority (low/medium/high)', subject.priority) || subject.priority;

      subject.name = nextName.trim();
      subject.priority = nextPriority.trim();

      saveToStorage(STORAGE_KEYS.subjects, subjects);
      renderSubjects();
      renderSubjectDropdowns();
      renderDashboard();
    });

    subjectList.appendChild(item);
  }
}

// update the dropdown menus when subjects change
function renderSubjectDropdowns() {
  const sessionSubjectSelect = getById('#session-subject');
  const taskSubjectSelect = getById('#task-subject');
  const selects = [sessionSubjectSelect, taskSubjectSelect];

  for (let i = 0; i < selects.length; i += 1) {
    const select = selects[i];
    select.innerHTML = '';

    const subjectOptions = subjects.map(function (subject) {
      const option = document.createElement('option');
      option.value = String(subject.id);
      option.textContent = subject.name;
      return option;
    });

    for (let j = 0; j < subjectOptions.length; j += 1) {
      select.appendChild(subjectOptions[j]);
    }

    // if no subjects show a placeholder or sumthing
    if (subjects.length === 0) {
      const fallbackOption = document.createElement('option');
      fallbackOption.value = '';
      fallbackOption.textContent = '-- no subjects --';
      select.appendChild(fallbackOption);
    }
  }
}

// draw the weekly schedule grid
function renderSchedule() {
  // weekGrid is usually a flex or grid layout in the css
  const weekGrid = getById('#week-schedule');
  weekGrid.innerHTML = '';

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < days.length; i += 1) {
    const dayName = days[i];
    const dayBox = document.createElement('div');
    dayBox.className = 'day';
    dayBox.innerHTML = '<strong>' + dayName + '</strong>';

    const sessionsForDay = [];
    for (let j = 0; j < sessions.length; j += 1) {
      if (sessions[j].day === dayName) {
        // match the day name eg 'Mon'
        sessionsForDay.push(sessions[j]);
      }
    }

    // sort sessies by start time
    // localeCompare is gud for comparing strings like "09:00"
    sessionsForDay.sort(function (a, b) {
      return a.start.localeCompare(b.start);
    });

    for (let j = 0; j < sessionsForDay.length; j += 1) {
      const session = sessionsForDay[j];

      let subjectName = 'Unknown';
      // nested loop to find the subject name... might stay 'Unknown' if deleted
      for (let k = 0; k < subjects.length; k += 1) {
        if (idsMatch(subjects[k].id, session.subjectId)) {
          subjectName = subjects[k].name;
          break;
        }
      }

      const sessionCard = document.createElement('div');
      sessionCard.className = 'session';
      sessionCard.innerHTML =
        '<div>' + escapeHtml(subjectName) + '</div>' +
        '<small>' + escapeHtml(session.start) + ' - ' + escapeHtml(session.end) + '</small>' +
        '<div style="margin-top:6px"><button class="xdel">Delete</button></div>';

      const deleteBtn = sessionCard.querySelector('.xdel');
      deleteBtn.addEventListener('click', function () {
        sessions = sessions.filter(function (entry) {
          return entry.id !== session.id;
        });

        saveToStorage(STORAGE_KEYS.sessions, sessions);
        renderSchedule();
        renderDashboard();
      });

      dayBox.appendChild(sessionCard);
    }

    weekGrid.appendChild(dayBox);
  }
}

// check if a new session overlaps with old ones
function hasSessionConflict(newSession) {
  for (let i = 0; i < sessions.length; i += 1) {
    const existing = sessions[i];
    if (existing.day !== newSession.day) continue;

    // overlaps calculation is standard: start < other.end && end > other.start
    const overlaps = newSession.start < existing.end && newSession.end > existing.start;
    if (overlaps) {
      return true;
    }
  }

  return false;
}

// show the tasks list
function renderTasks() {
  const taskList = getById('#task-list');
  taskList.innerHTML = '';

  // sort them... done ones go to bottom
  // task sorting is key so user sees what is due soonest
  tasks.sort(function (a, b) {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }

    const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
    const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
    return dateA - dateB;
  });

  for (let i = 0; i < tasks.length; i += 1) {
    const task = tasks[i];

    let subjectName = 'No subject';
    for (let j = 0; j < subjects.length; j += 1) {
      if (idsMatch(subjects[j].id, task.subjectId)) {
        subjectName = subjects[j].name;
        break;
      }
    }

    const item = document.createElement('li');
    item.innerHTML =
      '<div>' +
      '<strong>' + escapeHtml(task.title) + '</strong>' +
      '<div class="meta">' + escapeHtml(task.deadline || '') + ' • ' + escapeHtml(subjectName) + '</div>' +
      '</div>' +
      '<div><label><input type="checkbox" class="done" ' + (task.done ? 'checked' : '') + '> Done</label> <button class="del">Delete</button></div>';

    const doneInput = item.querySelector('.done');
    const deleteBtn = item.querySelector('.del');

    // when checkbox toggled, save and refresh charts
    // we use checkbox to mark tasks as done because its intuitive
    doneInput.addEventListener('change', function (event) {
      task.done = event.target.checked;
      saveToStorage(STORAGE_KEYS.tasks, tasks);
      renderDashboard();
      renderChart();
    });

    // delete task and refresh
    deleteBtn.addEventListener('click', function () {
      tasks = tasks.filter(function (entry) {
        return entry.id !== task.id;
      });

      saveToStorage(STORAGE_KEYS.tasks, tasks);
      renderTasks();
      renderDashboard();
      renderChart();
    });

    taskList.appendChild(item);
  }
}

// draw a simple bar chart on canvas
function renderChart() {
  const canvas = getById('#chart');
  if (!canvas) return;
  // need the 2d context to draw stuff, cant draw on just the element
  const context = canvas.getContext('2d');

  // wipe the canvas clean before redrawing
  context.clearRect(0, 0, canvas.width, canvas.height);

  let doneCount = 0;
  for (let i = 0; i < tasks.length; i += 1) {
    if (tasks[i].done) {
      doneCount += 1;
    }
  }

  const pendingCount = tasks.length - doneCount;

  // math for drawing bars correctly
  // we use maxCount to scale the bars so the tallest one reaches the top
  const maxCount = Math.max(doneCount, pendingCount, 1);
  const chartTop = 20;
  const chartBottom = canvas.height - 30; // leave space for text labels at bottom
  const chartHeight = chartBottom - chartTop;

  const doneBarHeight = Math.round((doneCount / maxCount) * chartHeight);
  const pendingBarHeight = Math.round((pendingCount / maxCount) * chartHeight);

  const barWidth = 120;
  const gap = 60;
  const firstX = 80; // start drawing 80px from left
  const secondX = firstX + barWidth + gap;

  // canvas y-axis goes down, so we subtract height from bottom to get top Y coordinate
  const doneY = chartBottom - doneBarHeight;
  const pendingY = chartBottom - pendingBarHeight;

  // blue bar for done tasks
  // fillStyle sets the color for the next drawing operation
  context.fillStyle = '#2563eb';
  context.fillRect(firstX, doneY, barWidth, doneBarHeight);

  // orange bar for pending ones
  context.fillStyle = '#f97316';
  context.fillRect(secondX, pendingY, barWidth, pendingBarHeight);

  // labels for the chart
  // fillText is for strings, fillRect is for boxes
  context.fillStyle = '#111827';
  context.font = '14px sans-serif';
  context.fillText('Done (' + doneCount + ')', firstX + 18, canvas.height - 8);
  context.fillText('Pending (' + pendingCount + ')', secondX + 4, canvas.height - 8);

  renderSubjectChart();
}

// second chart: plain-canvas bars of how many tasks each subject has
function renderSubjectChart() {
  const canvas = getById('#subject-chart');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);

  const subjectCounts = [];
  for (let i = 0; i < subjects.length; i += 1) {
    let count = 0;
    for (let j = 0; j < tasks.length; j += 1) {
      if (idsMatch(tasks[j].subjectId, subjects[i].id)) {
        count += 1;
      }
    }
    subjectCounts.push({ name: subjects[i].name, count: count });
  }

  if (subjectCounts.length === 0) {
    context.fillStyle = '#6b7280';
    context.font = '15px sans-serif';
    context.fillText('No subjects yet.', 20, 40);
    return;
  }

  let maxCount = 1;
  for (let i = 0; i < subjectCounts.length; i += 1) {
    if (subjectCounts[i].count > maxCount) {
      maxCount = subjectCounts[i].count;
    }
  }

  const left = 30;
  const right = canvas.width - 20;
  const top = 20;
  const bottom = canvas.height - 45;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const slotWidth = chartWidth / subjectCounts.length;
  const barWidth = Math.max(20, Math.min(56, slotWidth * 0.6));

  for (let i = 0; i < subjectCounts.length; i += 1) {
    const item = subjectCounts[i];
    const barHeight = Math.round((item.count / maxCount) * chartHeight);
    const barX = left + i * slotWidth + Math.round((slotWidth - barWidth) / 2);
    const barY = bottom - barHeight;

    context.fillStyle = '#14b8a6';
    context.fillRect(barX, barY, barWidth, barHeight);

    context.fillStyle = '#0f172a';
    context.font = '12px sans-serif';
    context.fillText(String(item.count), barX + Math.round(barWidth / 2) - 4, barY - 6);

    let shortName = item.name;
    if (shortName.length > 8) {
      shortName = shortName.slice(0, 8) + '…';
    }
    context.fillText(shortName, barX - 2, canvas.height - 18);
  }
}

// attach listeners to all the forms
function setupForms() {
  const subjectForm = getById('#subject-form');
  const sessionForm = getById('#session-form');
  const taskForm = getById('#task-form');

  // adding a new subejct
  subjectForm.addEventListener('submit', function (event) {
    // event.preventDefault() stops the page from reloading on submit
    event.preventDefault();

    const nameInput = getById('#subject-name');
    const priorityInput = getById('#subject-priority');
    // trim() removes leading and trailing spaces from input
    const name = nameInput.value.trim();
    const priority = priorityInput.value;

    if (!name) return;

    // add to start of list so new ones show up on top
    subjects.unshift({
      id: makeId(),
      name: name,
      priority: priority
    });

    saveToStorage(STORAGE_KEYS.subjects, subjects);

    nameInput.value = '';

    // gotta refresh everything manually cuz we dont have a framework lol
    renderSubjects();
    renderSubjectDropdowns();
    renderDashboard();
  });

  // adding a study session
  sessionForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const subjectId = getById('#session-subject').value;
    const day = getById('#session-day').value;
    const start = getById('#session-start').value;
    const end = getById('#session-end').value;

    if (!subjectId || !start || !end) {
      alert('Please fill all fields');
      return;
    }

    // basic validation... cant finish before u start
    if (start >= end) {
      alert('Start must be before end');
      return;
    }

    const newSession = {
      id: makeId(),
      subjectId: subjectId,
      day: day,
      start: start,
      end: end
    };

    // check for conflicts first!!
    if (hasSessionConflict(newSession)) {
      alert('Conflict with existing session (same day/time overlap).');
      return;
    }

    sessions.push(newSession);
    saveToStorage(STORAGE_KEYS.sessions, sessions);

    getById('#session-start').value = '';
    getById('#session-end').value = '';

    renderSchedule();
    renderDashboard();
  });

  // adding a task
  taskForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const titleInput = getById('#task-title');
    const deadlineInput = getById('#task-deadline');
    const title = titleInput.value.trim();
    const subjectId = getById('#task-subject').value;
    const deadline = deadlineInput.value;

    if (!title) return;

    tasks.unshift({
      id: makeId(),
      title: title,
      subjectId: subjectId,
      deadline: deadline,
      done: false
    });

    saveToStorage(STORAGE_KEYS.tasks, tasks);

    titleInput.value = '';
    deadlineInput.value = '';

    renderTasks();
    renderDashboard();
    renderChart();
  });
}

// setup things like theme and import/export
function setupSettings() {
  const themeToggle = getById('#theme-toggle');
  const exportBtn = getById('#export-btn');
  const importInput = getById('#import-file');
  const resetBtn = getById('#reset-data');

  // Boolean() handles truthy/falsy values from storage
  themeToggle.checked = Boolean(settings.dark);
  applyTheme();

  // toggle dark mode
  themeToggle.addEventListener('change', function (event) {
    settings.dark = event.target.checked;
    saveToStorage(STORAGE_KEYS.settings, settings);
    applyTheme();
  });

  // export data to a json file
  exportBtn.addEventListener('click', function () {
    const data = {
      subjects: subjects,
      tasks: tasks,
      sessions: sessions,
      settings: settings
    };

    // creation of a blob (big binary object) to hold our json string
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // fake a click on a hidden link to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'study-planner-export.json';
    link.click();

    // clean up the temporary url object from memory
    URL.revokeObjectURL(url);
  });

  // import data from a json file... scary
  importInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // filereader is used to read contents from the disk
    const reader = new FileReader();

    reader.onload = function () {
      try {
        // try to parse the file text back into objects
        const data = JSON.parse(reader.result);

        // check if it has the basic stuff we need
        if (!data.subjects || !data.tasks || !data.sessions) {
          alert('Invalid file');
          return;
        }

        subjects = data.subjects;
        tasks = data.tasks;
        sessions = data.sessions;
        settings = data.settings || settings;

        saveAllData();
        refreshEverything();

        alert('Import successful');
      } catch (error) {
        alert('Error reading file');
      }
    };

    // tell the reader to actually start reading as text
    reader.readAsText(file);
  });

  // delete evrything and start ovar
  resetBtn.addEventListener('click', function () {
    const ok = confirm('Reset all saved data?');
    if (!ok) return;

    subjects = [];
    tasks = [];
    sessions = [];
    settings = { dark: false };

    saveAllData();
    refreshEverything();
  });
}

// helper to reload all parts of the app
function refreshEverything() {
  renderSubjects();
  renderSubjectDropdowns();
  renderSchedule();
  renderTasks();
  renderDashboard();
  renderChart();
  applyTheme();
  const themeToggle = getById('#theme-toggle');
  if (themeToggle) {
    themeToggle.checked = Boolean(settings.dark);
  }
}

// app starts here when page loads
// DOMContentLoaded is safer than window.onload because it fires sooner
document.addEventListener('DOMContentLoaded', function () {
  setupNavigation();
  setupForms();
  setupSettings();

  renderSubjects();
  renderSubjectDropdowns();
  renderSchedule();
  renderTasks();
  renderDashboard();
  renderChart();
});
