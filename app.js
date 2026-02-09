const STORAGE_KEYS = {
  subjects: 'sp_subjects',
  tasks: 'sp_tasks',
  sessions: 'sp_sessions',
  settings: 'sp_settings'
};

let subjects = readFromStorage(STORAGE_KEYS.subjects, []);
let tasks = readFromStorage(STORAGE_KEYS.tasks, []);
let sessions = readFromStorage(STORAGE_KEYS.sessions, []);
let settings = readFromStorage(STORAGE_KEYS.settings, { dark: false });

function readFromStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallbackValue;
    return parsed;
  } catch (error) {
    return fallbackValue;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function makeId() {
  return String(Date.now() + Math.floor(Math.random() * 1000));
}

function getById(selector) {
  return document.querySelector(selector);
}

function getAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function escapeHtml(text) {
  const safeText = String(text);
  return safeText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getWeekdayName(dateObj) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dateObj.getDay()];
}

function idsMatch(leftId, rightId) {
  return String(leftId) === String(rightId);
}

function saveAllData() {
  saveToStorage(STORAGE_KEYS.subjects, subjects);
  saveToStorage(STORAGE_KEYS.tasks, tasks);
  saveToStorage(STORAGE_KEYS.sessions, sessions);
  saveToStorage(STORAGE_KEYS.settings, settings);
}

function applyTheme() {
  if (settings.dark) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

function setupNavigation() {
  const navButtons = getAll('.nav-btn');
  const sections = getAll('.section');

  for (let i = 0; i < navButtons.length; i += 1) {
    const button = navButtons[i];
    button.addEventListener('click', function () {
      for (let j = 0; j < navButtons.length; j += 1) {
        navButtons[j].classList.remove('active');
      }
      button.classList.add('active');

      for (let j = 0; j < sections.length; j += 1) {
        sections[j].classList.remove('active');
      }

      const targetSection = sections[i];
      if (targetSection) {
        targetSection.classList.add('active');
      }

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

function renderDashboard() {
  const totalSubjectsEl = getById('#total-subjects');
  const pendingTasksEl = getById('#pending-tasks');
  const todaySessionsEl = getById('#today-sessions');
  const upcomingList = getById('#upcoming');

  totalSubjectsEl.textContent = String(subjects.length);

  let pendingCount = 0;
  for (let i = 0; i < tasks.length; i += 1) {
    if (!tasks[i].done) {
      pendingCount += 1;
    }
  }
  pendingTasksEl.textContent = String(pendingCount);

  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const todayName = getWeekdayName(now);
  let todaySessionCount = 0;

  for (let i = 0; i < sessions.length; i += 1) {
    const session = sessions[i];
    if (session.date === todayDate || session.day === todayName) {
      todaySessionCount += 1;
    }
  }
  todaySessionsEl.textContent = String(todaySessionCount);

  const tasksWithDeadlines = [];
  for (let i = 0; i < tasks.length; i += 1) {
    if (tasks[i].deadline) {
      tasksWithDeadlines.push(tasks[i]);
    }
  }

  tasksWithDeadlines.sort(function (a, b) {
    return new Date(a.deadline) - new Date(b.deadline);
  });

  const upcoming = tasksWithDeadlines.slice(0, 5);
  upcomingList.innerHTML = '';

  if (upcoming.length === 0) {
    upcomingList.innerHTML = '<li class="muted">No upcoming deadlines</li>';
    return;
  }

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

  for (let i = 0; i < upcomingItems.length; i += 1) {
    upcomingList.appendChild(upcomingItems[i]);
  }
}

function renderSubjects() {
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

    deleteBtn.addEventListener('click', function () {
      subjects = subjects.filter(function (entry) {
        return entry.id !== subject.id;
      });

      saveToStorage(STORAGE_KEYS.subjects, subjects);
      renderSubjects();
      renderSubjectDropdowns();
      renderDashboard();
    });

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

    if (subjects.length === 0) {
      const fallbackOption = document.createElement('option');
      fallbackOption.value = '';
      fallbackOption.textContent = '-- no subjects --';
      select.appendChild(fallbackOption);
    }
  }
}

function renderSchedule() {
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
        sessionsForDay.push(sessions[j]);
      }
    }

    sessionsForDay.sort(function (a, b) {
      return a.start.localeCompare(b.start);
    });

    for (let j = 0; j < sessionsForDay.length; j += 1) {
      const session = sessionsForDay[j];

      let subjectName = 'Unknown';
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

function hasSessionConflict(newSession) {
  for (let i = 0; i < sessions.length; i += 1) {
    const existing = sessions[i];
    if (existing.day !== newSession.day) continue;

    const overlaps = newSession.start < existing.end && newSession.end > existing.start;
    if (overlaps) {
      return true;
    }
  }

  return false;
}

function renderTasks() {
  const taskList = getById('#task-list');
  taskList.innerHTML = '';

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

    doneInput.addEventListener('change', function (event) {
      task.done = event.target.checked;
      saveToStorage(STORAGE_KEYS.tasks, tasks);
      renderDashboard();
      renderChart();
    });

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

function renderChart() {
  const canvas = getById('#chart');
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, canvas.width, canvas.height);

  let doneCount = 0;
  for (let i = 0; i < tasks.length; i += 1) {
    if (tasks[i].done) {
      doneCount += 1;
    }
  }

  const pendingCount = tasks.length - doneCount;

  const maxCount = Math.max(doneCount, pendingCount, 1);
  const chartTop = 20;
  const chartBottom = canvas.height - 30;
  const chartHeight = chartBottom - chartTop;

  const doneBarHeight = Math.round((doneCount / maxCount) * chartHeight);
  const pendingBarHeight = Math.round((pendingCount / maxCount) * chartHeight);

  const barWidth = 120;
  const gap = 60;
  const firstX = 80;
  const secondX = firstX + barWidth + gap;

  const doneY = chartBottom - doneBarHeight;
  const pendingY = chartBottom - pendingBarHeight;

  context.fillStyle = '#2563eb';
  context.fillRect(firstX, doneY, barWidth, doneBarHeight);

  context.fillStyle = '#f97316';
  context.fillRect(secondX, pendingY, barWidth, pendingBarHeight);

  context.fillStyle = '#111827';
  context.font = '14px sans-serif';
  context.fillText('Done (' + doneCount + ')', firstX + 18, canvas.height - 8);
  context.fillText('Pending (' + pendingCount + ')', secondX + 4, canvas.height - 8);
}

function setupForms() {
  const subjectForm = getById('#subject-form');
  const sessionForm = getById('#session-form');
  const taskForm = getById('#task-form');

  subjectForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const nameInput = getById('#subject-name');
    const priorityInput = getById('#subject-priority');
    const name = nameInput.value.trim();
    const priority = priorityInput.value;

    if (!name) return;

    subjects.unshift({
      id: makeId(),
      name: name,
      priority: priority
    });

    saveToStorage(STORAGE_KEYS.subjects, subjects);

    nameInput.value = '';

    renderSubjects();
    renderSubjectDropdowns();
    renderDashboard();
  });

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

function setupSettings() {
  const themeToggle = getById('#theme-toggle');
  const exportBtn = getById('#export-btn');
  const importInput = getById('#import-file');
  const resetBtn = getById('#reset-data');

  themeToggle.checked = Boolean(settings.dark);
  applyTheme();

  themeToggle.addEventListener('change', function (event) {
    settings.dark = event.target.checked;
    saveToStorage(STORAGE_KEYS.settings, settings);
    applyTheme();
  });

  exportBtn.addEventListener('click', function () {
    const data = {
      subjects: subjects,
      tasks: tasks,
      sessions: sessions,
      settings: settings
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'study-planner-export.json';
    link.click();

    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);

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

    reader.readAsText(file);
  });

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
