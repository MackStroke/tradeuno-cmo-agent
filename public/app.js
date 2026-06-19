// Base URL for API calls
const API = '/api';

// Simple debounce helper
function debounce(func, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

let currentTasks = [];
let currentLeads = [];

function formatMarkdown(text) {
  if (!text) return '';
  // Convert escaped newlines back to actual newlines
  let html = text.replace(/\\n/g, '\n');
  
  // Headers: ### Header -> <h5>Header</h5>
  html = html.replace(/^### (.*?)$/gm, '<h5 style="margin-top:12px; margin-bottom:6px; font-weight:700; color:var(--text-primary);">$1</h5>');
  html = html.replace(/^## (.*?)$/gm, '<h4 style="margin-top:16px; margin-bottom:8px; font-weight:700; color:var(--text-primary);">$1</h4>');
  html = html.replace(/^# (.*?)$/gm, '<h3 style="margin-top:20px; margin-bottom:10px; font-weight:700; color:var(--text-primary);">$1</h3>');
  
  // Bold: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary); font-weight:600;">$1</strong>');
  
  // Italics: *text* -> <em>text</em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Bullet lists: * item or - item -> <li>item</li>
  html = html.replace(/^\s*[\*\-]\s+(.*?)$/gm, '<li style="margin-left:20px; margin-bottom:4px;">$1</li>');
  
  // Paragraph line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

async function initApp() {
  setupNavigation();
  setupForms();
  
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.addEventListener('click', toggleSidebar);
  
  // Real-time predictive analytics input listeners
  const captionEl = document.getElementById('wpCaption');
  const videoScriptEl = document.getElementById('wpVideoScript');
  if (captionEl) {
    captionEl.addEventListener('input', debounce(() => {
      updateAnalyticsDashboard();
    }, 450));
  }
  if (videoScriptEl) {
    videoScriptEl.addEventListener('input', debounce(() => {
      updateAnalyticsDashboard();
    }, 450));
  }
  
  // Check auth
  try {
    const res = await fetch(`${API}/me`);
    const data = await res.json();
    if (data.user) {
      showApp(data.user);
    } else {
      showLogin();
    }
  } catch (e) {
    showLogin();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// --- UI HELPERS ---
function showToast(msg, type='success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

function showLogin() {
  document.getElementById('appLayout').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
}

function showApp(user) {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appLayout').style.display = 'flex';
  
  document.getElementById('userName').innerText = user.name;
  document.getElementById('userRole').innerText = user.role;
  document.getElementById('userAvatar').innerText = user.name.charAt(0);
  document.getElementById('userAvatar').style.backgroundColor = user.avatar_color || '#facc15';
  
  const d = new Date();
  document.getElementById('dateDisplay').innerText = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  loadPage('dashboard');
  fetchTeam(); // for dropdowns
}

// --- NAVIGATION ---
function setupNavigation() {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      loadPage(item.dataset.page);
      if(window.innerWidth <= 768) toggleSidebar();
    });
  });
}

function loadPage(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  
  const titles = {
    dashboard: 'Dashboard',
    tasks: 'Task Management',
    content: 'Content Studio',
    social: 'Social Media',
    blogs: 'Blog Engine',
    videos: 'Video Lab',
    competitors: 'Competitor Intel',
    leads: 'Lead Finder',
    meta: 'Meta Ads',
    shopify: 'Shopify Pulse',
    citation: 'Citation Score',
    contentengine: 'AI Content Engine',
    gaps: 'Gap Analysis',
    prompttracker: 'Prompt Tracker',
    leadsdash: 'Leads Dashboard',
    reports: 'Daily Reports',
    ai: 'AI Assistant'
  };
  document.getElementById('pageTitle').innerText = titles[page];
  
  // Fetch data based on page
  if(page === 'dashboard') fetchDashboard();
  else if(page === 'tasks') fetchTasks();
  else if(page === 'content') fetchContent();
  else if(page === 'social') fetchSocial();
  else if(page === 'blogs') fetchBlogs();
  else if(page === 'videos') fetchVideos();
  else if(page === 'competitors') fetchCompetitors();
  else if(page === 'leads') fetchLeads();
  else if(page === 'meta') fetchMeta();
  else if(page === 'shopify') fetchShopify();
  else if(page === 'reports') fetchReports();
  else if(page === 'ai') fetchAIHistory();
  else if(page === 'citation') fetchCitationScore();
  else if(page === 'contentengine') fetchSEOBriefs();
  else if(page === 'gaps') fetchGapAnalysis();
  else if(page === 'prompttracker') fetchPrompts();
  else if(page === 'leadsdash') fetchLeadsDashboard();
}

// --- FORMS & AUTH ---
function setupForms() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPass').value.trim();
      const errObj = document.getElementById('loginError');
      errObj.style.display = 'none';
      errObj.innerText = '';
      
      try {
        const res = await fetch(`${API}/login`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email, password})
        });
        const data = await res.json();
        if (res.ok) {
          showApp(data.user);
          showToast('Logged in successfully');
        } else {
          errObj.style.display = 'block';
          errObj.innerText = data.error || 'Login failed';
        }
      } catch (e) {
        errObj.style.display = 'block';
        errObj.innerText = 'Network error';
      }
    });
  }
}

async function logout() {
  await fetch(`${API}/logout`, { method: 'POST' });
  showLogin();
}

let teamMembers = [];
async function fetchTeam() {
  const res = await fetch(`${API}/team`);
  teamMembers = await res.json();
  
  // Populate task assignee dropdown
  const select = document.getElementById('taskAssignee');
  if(select) {
    select.innerHTML = teamMembers.map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join('');
  }
}

// --- API CALLS & RENDERERS ---
async function req(url, options = {}) {
  const res = await fetch(API + url, options);
  if (!res.ok && res.status === 401) {
    showLogin();
    throw new Error('Unauthorized');
  }
  return res.json();
}

// Table Filtering and Sorting Helper
function setupTableFeatures(config) {
  const container = document.getElementById(config.containerId);
  if (!container) return;
  const table = document.getElementById(config.tableId);
  if (!table) return;
  
  // Clear any existing search/filter controls in this container
  const existingControls = container.querySelector('.table-controls');
  if (existingControls) existingControls.remove();
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  const headers = table.querySelectorAll('thead th');
  
  // Create table controls container
  const controls = document.createElement('div');
  controls.className = 'table-controls';
  
  // 1. Search Bar
  let searchInput = null;
  if (config.searchable !== false) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'search-wrap';
    searchWrap.innerHTML = `
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" aria-label="Search this table" placeholder="Search table...">
    `;
    searchInput = searchWrap.querySelector('.search-input');
    controls.appendChild(searchWrap);
  }
  
  // 2. Select Filters
  const filterSelects = [];
  if (config.filters && config.filters.length > 0) {
    config.filters.forEach(f => {
      const uniqueValues = new Set();
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(row => {
        const cell = row.cells[f.colIndex];
        if (cell) {
          const val = cell.innerText.trim();
          if (val) uniqueValues.add(val);
        }
      });
      
      if (uniqueValues.size > 0) {
        const filterGroup = document.createElement('div');
        filterGroup.className = 'filter-group';
        
        const filterId = `${config.tableId}-filter-${f.colIndex}`;
        
        const labelEl = document.createElement('label');
        labelEl.className = 'filter-label';
        labelEl.setAttribute('for', filterId);
        labelEl.innerText = f.label;
        
        const selectEl = document.createElement('select');
        selectEl.className = 'filter-select';
        selectEl.id = filterId;
        selectEl.innerHTML = `<option value="">All ${f.label}s</option>` + 
          Array.from(uniqueValues).sort().map(val => `<option value="${val}">${val}</option>`).join('');
          
        filterGroup.appendChild(labelEl);
        filterGroup.appendChild(selectEl);
        controls.appendChild(filterGroup);
        
        filterSelects.push({ colIndex: f.colIndex, select: selectEl });
      }
    });
  }
  
  // Insert controls at the top of the container
  if (controls.children.length > 0) {
    container.insertBefore(controls, container.firstChild);
  }
  
  // Filter Function
  function applyFilters() {
    const rows = tbody.querySelectorAll('tr');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    
    rows.forEach(row => {
      let matchesSearch = true;
      if (query) {
        matchesSearch = row.innerText.toLowerCase().includes(query);
      }
      
      let matchesFilters = true;
      for (const fs of filterSelects) {
        const selectedVal = fs.select.value;
        if (selectedVal) {
          const cell = row.cells[fs.colIndex];
          const cellVal = cell ? cell.innerText.trim() : '';
          if (cellVal !== selectedVal) {
            matchesFilters = false;
            break;
          }
        }
      }
      
      row.style.display = (matchesSearch && matchesFilters) ? '' : 'none';
    });
  }
  
  // Attach filter event listeners
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  filterSelects.forEach(fs => {
    fs.select.addEventListener('change', applyFilters);
  });
  
  // 3. Sorting
  if (config.sortableColumns && config.sortableColumns.length > 0) {
    config.sortableColumns.forEach(colIndex => {
      const th = headers[colIndex];
      if (th) {
        th.classList.add('sortable');
        
        // Remove existing listeners if redrawn
        const newTh = th.cloneNode(true);
        th.parentNode.replaceChild(newTh, th);
        
        newTh.addEventListener('click', () => {
          const isAsc = newTh.classList.contains('asc');
          
          // Reset other headers
          const currentHeaders = table.querySelectorAll('thead th');
          currentHeaders.forEach(h => h.classList.remove('asc', 'desc'));
          
          if (isAsc) {
            newTh.classList.add('desc');
          } else {
            newTh.classList.add('asc');
          }
          
          sortColumn(colIndex, !isAsc);
        });
      }
    });
  }
  
  // Sort Function
  function sortColumn(colIndex, asc) {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
      const cellA = a.cells[colIndex];
      const cellB = b.cells[colIndex];
      if (!cellA || !cellB) return 0;
      
      let valA = cellA.innerText.trim();
      let valB = cellB.innerText.trim();
      
      // Numeric check (clean currency symbols and commas, keep valid numeric strings)
      const cleanNumA = valA.replace(/[₹$,]/g, '').trim();
      const cleanNumB = valB.replace(/[₹$,]/g, '').trim();
      if (cleanNumA !== '' && cleanNumB !== '' && !isNaN(cleanNumA) && !isNaN(cleanNumB)) {
        return asc ? parseFloat(cleanNumA) - parseFloat(cleanNumB) : parseFloat(cleanNumB) - parseFloat(cleanNumA);
      }
      
      // Date check
      function parseDateString(str) {
        if (!str) return NaN;
        // YYYY-MM-DD or YYYY/MM/DD
        let match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (match) {
          return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10)).getTime();
        }
        // DD/MM/YYYY or DD-MM-YYYY
        match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (match) {
          return new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10)).getTime();
        }
        const t = Date.parse(str);
        return isNaN(t) ? NaN : t;
      }
      
      const dateA = parseDateString(valA);
      const dateB = parseDateString(valB);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return asc ? dateA - dateB : dateB - dateA;
      }
      
      return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    
    rows.forEach(row => tbody.appendChild(row));
  }
}

// DASHBOARD
async function fetchDashboard() {
  const stats = await req('/dashboard/stats');
  document.getElementById('dashboardStats').innerHTML = `
    <div class="stat-card"><div class="stat-title">Pending Tasks</div><div class="stat-value">${stats.pendingTasks}</div></div>
    <div class="stat-card"><div class="stat-title">Total Leads</div><div class="stat-value">${stats.totalLeads}</div></div>
    <div class="stat-card"><div class="stat-title">Active Ads</div><div class="stat-value">${stats.activeCampaigns}</div></div>
    <div class="stat-card"><div class="stat-title">Avg Task Score</div><div class="stat-value">${stats.avgScore}/100</div></div>
  `;
  
  const tasks = await req('/tasks');
  const recent = tasks.slice(0, 5);
  document.getElementById('recentTasksTable').innerHTML = `
    <table class="table" id="recentTasksTableInner">
      <thead><tr><th>Task</th><th>Assignee</th><th>Status</th></tr></thead>
      <tbody>
        ${recent.map(t => `<tr>
          <td>${t.title}</td>
          <td>${t.assignee_name || 'Unassigned'}</td>
          <td><span class="badge ${t.status === 'completed' ? 'success' : 'warning'}">${t.status}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
  setupTableFeatures({
    containerId: 'recentTasksTable',
    tableId: 'recentTasksTableInner',
    searchable: false,
    sortableColumns: [0, 1, 2]
  });
}

async function quickInsight() {
  const box = document.getElementById('quickInsightBox');
  box.innerHTML = '<div class="spinner"></div><p>Generating insight...</p>';
  const res = await req('/shopify/analyze', { method: 'POST' });
  box.innerHTML = `<div style="font-size:13px; line-height:1.6;">${formatMarkdown(res.insights)}</div>`;
}

// TASKS
async function fetchTasks() {
  const tasks = await req('/tasks');
  currentTasks = tasks;
  document.getElementById('taskBadge').innerText = tasks.filter(t => t.status === 'pending').length || '';
  
  document.getElementById('tasksTable').innerHTML = `
    <table class="table" id="tasksTableInner">
      <thead><tr><th>Task</th><th>Assignee</th><th>Due Date</th><th>Status</th><th>Score</th><th>Action</th></tr></thead>
      <tbody>
        ${tasks.map(t => {
          let statusClass = 'badge-pending';
          if (t.status === 'completed') statusClass = 'badge-completed';
          else if (t.status === 'submitted') statusClass = 'badge-submitted';
          
          return `<tr>
            <td><strong>${t.title}</strong><br><small style="color:var(--text-muted)">${(t.description || '').substring(0, 50)}...</small></td>
            <td>${t.assignee_name || 'Unassigned'}</td>
            <td>${t.due_date || 'No due date'}</td>
            <td><span class="badge-status ${statusClass}">${t.status}</span></td>
            <td>${t.score ? `<strong>${t.score}/100</strong>` : '-'}</td>
            <td>
              ${t.status === 'pending' ? `<button class="btn btn-sm btn-secondary" onclick="markTaskStatus(${t.id}, 'submitted')">Submit</button>` : ''}
              ${(t.status === 'submitted' || t.status === 'completed') && !t.score ? `<button class="btn btn-sm btn-primary" onclick="scoreTask(${t.id})">AI Score</button>` : ''}
              ${t.score ? `<button class="btn btn-sm btn-secondary" onclick="viewTaskFeedback(${t.id})">Feedback</button>` : ''}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
  setupTableFeatures({
    containerId: 'tasksTable',
    tableId: 'tasksTableInner',
    searchable: true,
    filters: [
      { colIndex: 1, label: 'Assignee' },
      { colIndex: 3, label: 'Status' }
    ],
    sortableColumns: [0, 1, 2, 3, 4]
  });
}

async function createTask() {
  const payload = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDesc').value,
    assigned_to: document.getElementById('taskAssignee').value,
    priority: document.getElementById('taskPriority').value,
    due_date: document.getElementById('taskDue').value
  };
  await req('/tasks', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  closeModal('taskModal');
  showToast('Task created');
  fetchTasks();
}

async function markTaskStatus(id, status) {
  await req(`/tasks/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status}) });
  showToast('Task updated');
  fetchTasks();
}

async function scoreTask(id) {
  openModal('scoreModal');
  const res = await req(`/tasks/${id}/score`, { method: 'POST' });
  if(res.error) {
    document.getElementById('scoreResult').innerHTML = `<p class="error">${res.error}</p>`;
  } else {
    document.getElementById('scoreResult').innerHTML = `
      <h2 style="color:var(--accent);margin-bottom:10px;">Score: ${res.score}/100</h2>
      <div style="font-size:13px; line-height:1.6; color:var(--text-primary);">${formatMarkdown(res.feedback)}</div>
    `;
    fetchTasks();
  }
}

function viewTaskFeedback(id) {
  const task = currentTasks.find(t => t.id === id);
  if (!task) return;
  openModal('scoreModal');
  document.getElementById('scoreResult').innerHTML = `
    <h2 style="color:var(--accent);margin-bottom:10px;">Score: ${task.score}/100</h2>
    <div style="font-size:13px; line-height:1.6; color:var(--text-primary);">${formatMarkdown(task.ai_feedback)}</div>
  `;
}

// CONTENT
let contentIdeasArray = [];
let currentWorkspaceIdeaId = null;

async function fetchContent() {
  const ideas = await req('/content');
  contentIdeasArray = ideas;
  
  document.getElementById('contentIdeas').innerHTML = ideas.map(i => {
    const isLiked = i.status === 'liked' || i.status === 'approved' || i.status === 'done' || i.status === 'not_done';
    const isDisliked = i.status === 'disliked';
    
    // Status Badge
    let statusBadge = '';
    if (i.status === 'done') {
      statusBadge = '<span class="badge success" style="margin-right:8px;">Done</span>';
    } else if (i.status === 'not_done') {
      statusBadge = '<span class="badge warning" style="margin-right:8px;">Not Done</span>';
    }
    
    const clickHandler = isLiked ? `onclick="if(!event.target.closest('button')) openContentWorkspace(${i.id})"` : '';
    const cursorStyle = isLiked ? 'style="cursor:pointer;"' : '';
    
    return `
      <div class="card content-card ${isLiked ? 'liked-card' : ''}" ${clickHandler} ${cursorStyle} data-status="${i.status}">
        <div class="card-body">
          <div style="float:right; display:flex; align-items:center;">
            ${statusBadge}
            <span class="badge primary">${i.platform} - ${i.type}</span>
          </div>
          <h4 style="margin-bottom:10px; padding-right:120px;">${i.title}</h4>
          <p style="font-size:12px; color:var(--text-muted); max-height:100px; overflow:hidden; margin-bottom:16px;">${formatMarkdown(i.script)}</p>
          
          <div class="content-card-footer" style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--glass-border); padding-top:12px;">
            <!-- Like / Dislike Icons -->
            <div class="like-dislike-wrap" style="display:flex; gap:8px;">
              <button class="icon-btn ${isLiked ? 'active-like' : ''}" onclick="updateContentStatus(${i.id}, 'liked')" aria-label="Like this idea" style="background:none; border:none; color:${isLiked ? 'var(--accent)' : 'var(--text-muted)'}; font-size:18px; cursor:pointer; transition:var(--transition);">
                👍
              </button>
              <button class="icon-btn ${isDisliked ? 'active-dislike' : ''}" onclick="updateContentStatus(${i.id}, 'disliked')" aria-label="Dislike this idea" style="background:none; border:none; color:${isDisliked ? 'var(--danger)' : 'var(--text-muted)'}; font-size:18px; cursor:pointer; transition:var(--transition);">
                👎
              </button>
            </div>
            
            <!-- Liked Cards Actions (Done/Not Done) -->
            ${isLiked ? `
              <div class="liked-actions" style="display:flex; gap:8px;">
                <button class="btn btn-sm ${i.status === 'done' ? 'btn-success' : 'btn-secondary'}" onclick="updateContentStatus(${i.id}, 'done')" style="padding:4px 10px; font-size:11px;">
                  Done
                </button>
                <button class="btn btn-sm ${i.status === 'not_done' ? 'btn-danger' : 'btn-secondary'}" onclick="updateContentStatus(${i.id}, 'not_done')" style="padding:4px 10px; font-size:11px;">
                  Not Done
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function updateContentStatus(id, status) {
  try {
    await req(`/content/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({status})
    });
    showToast(`Status updated to ${status}`);
    fetchContent();
  } catch (e) {
    showToast('Failed to update status', 'error');
  }
}

// ─── WORKSPACE PLANNERS ───
function openContentWorkspace(id) {
  const idea = contentIdeasArray.find(i => i.id === id);
  if (!idea) return;
  
  currentWorkspaceIdeaId = id;
  
  // Toggle Views
  document.getElementById('contentStudioList').style.display = 'none';
  document.getElementById('contentStudioWorkspace').style.display = 'flex';
  
  // Set Title
  document.getElementById('workspaceTitle').innerText = `Develop: ${idea.title}`;
  
  // Reset fields
  document.getElementById('wpCaption').value = '';
  document.getElementById('wpVideoScript').value = '';
  document.getElementById('wpVideoOverlay').value = '';
  document.getElementById('wpSlidesList').innerHTML = '';
  
  let plan = {};
  try {
    plan = JSON.parse(idea.planning_json || '{}');
  } catch(e) {
    plan = {};
  }
  
  // Set Caption
  document.getElementById('wpCaption').value = plan.caption || idea.hashtags || '';
  
  // Set Type & Subtype
  const type = plan.category || (idea.type === 'reel' ? 'video' : 'image');
  document.querySelector(`input[name="wpContentType"][value="${type}"]`).checked = true;
  
  toggleCategoryUI(type);
  
  if (type === 'image') {
    const subtype = plan.subCategory || 'single_post';
    const subInput = document.querySelector(`input[name="wpImageSubtype"][value="${subtype}"]`);
    if (subInput) subInput.checked = true;
    
    // Render slides if carousel
    if (plan.slides && plan.slides.length > 0) {
      plan.slides.forEach(s => addNewSlideRow(s.text, s.action, s.annotation, true));
    } else {
      addNewSlideRow('Slide 1: Hook and Title Copy', 'keep', '', true);
      addNewSlideRow('Slide 2: Visual fabric showcase', 'keep', '', true);
    }
  } else {
    // Video type platform checkboxes
    const videoPlatforms = plan.video_platforms || ['reels'];
    document.querySelectorAll('.wpVideoPlatform').forEach(cb => {
      cb.checked = videoPlatforms.includes(cb.value);
    });
    
    document.getElementById('wpVideoScript').value = plan.video_plan?.script || idea.script || '';
    document.getElementById('wpVideoOverlay').value = plan.video_plan?.overlay_text || '';
  }
  
  // Update Analytics Metrics
  updateAnalyticsDashboard(plan.analytics);
}

function closeContentWorkspace() {
  document.getElementById('contentStudioWorkspace').style.display = 'none';
  document.getElementById('contentStudioList').style.display = 'block';
  fetchContent();
}

function toggleCategoryUI(category) {
  if (category === 'image') {
    document.getElementById('wpImageView').style.display = 'block';
    document.getElementById('wpVideoView').style.display = 'none';
    document.getElementById('wpImageSubtypeWrap').style.display = 'block';
    document.getElementById('wpVideoPlatformsWrap').style.display = 'none';
    document.getElementById('wpBtnAddSlide').style.display = 'inline-block';
  } else {
    document.getElementById('wpImageView').style.display = 'none';
    document.getElementById('wpVideoView').style.display = 'block';
    document.getElementById('wpImageSubtypeWrap').style.display = 'none';
    document.getElementById('wpVideoPlatformsWrap').style.display = 'block';
    document.getElementById('wpBtnAddSlide').style.display = 'none';
  }
  updateAnalyticsDashboard();
}

function addNewSlideRow(text = '', action = 'keep', annotation = '', skipUpdate = false) {
  const container = document.getElementById('wpSlidesList');
  const count = container.children.length + 1;
  
  const div = document.createElement('div');
  div.className = 'slide-editor-row';
  div.style.cssText = 'display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.015); border:1px solid var(--glass-border); padding:12px; border-radius:8px; position:relative; transition:var(--transition);';
  if (action === 'remove') {
    div.style.opacity = '0.5';
    div.style.borderStyle = 'dashed';
  }
  
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <strong style="font-size:12px; color:var(--accent);">Slide ${count}</strong>
      <div style="display:flex; gap:10px; align-items:center;">
        <select class="slide-action" onchange="toggleSlideAction(this)" style="font-size:11px; padding:3px 6px; background:var(--bg-secondary); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:var(--text-primary); cursor:pointer;">
          <option value="keep" ${action === 'keep' ? 'selected' : ''}>Keep</option>
          <option value="remove" ${action === 'remove' ? 'selected' : ''}>Remove</option>
        </select>
        <button class="btn btn-danger btn-sm" onclick="this.closest('.slide-editor-row').remove(); reindexSlides(); updateAnalyticsDashboard();" style="padding:2px 8px; font-size:10px; height:20px;">✕</button>
      </div>
    </div>
    <textarea class="slide-text" placeholder="Visual layout description / text copy on this slide..." style="min-height:50px; font-size:12px; padding:6px 10px; background:var(--glass); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:var(--text-primary); width:100%;">${text}</textarea>
    <input type="text" class="slide-annotation" placeholder="Add feedback / annotations..." value="${annotation}" style="font-size:11px; padding:4px 8px; background:var(--glass); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:var(--text-secondary); width:100%;">
  `;
  container.appendChild(div);
  
  // Live update metrics when slide text or annotations change
  const slideText = div.querySelector('.slide-text');
  const slideAnnotation = div.querySelector('.slide-annotation');
  if (slideText) {
    slideText.addEventListener('input', debounce(() => {
      updateAnalyticsDashboard();
    }, 450));
  }
  if (slideAnnotation) {
    slideAnnotation.addEventListener('input', debounce(() => {
      updateAnalyticsDashboard();
    }, 450));
  }
  
  reindexSlides();
  if (!skipUpdate) {
    updateAnalyticsDashboard();
  }
}

function toggleSlideAction(select) {
  const row = select.closest('.slide-editor-row');
  if (select.value === 'remove') {
    row.style.opacity = '0.5';
    row.style.borderStyle = 'dashed';
  } else {
    row.style.opacity = '1';
    row.style.borderStyle = 'solid';
  }
  updateAnalyticsDashboard();
}

function reindexSlides() {
  const rows = document.querySelectorAll('#wpSlidesList .slide-editor-row');
  rows.forEach((row, index) => {
    row.querySelector('strong').innerText = `Slide ${index + 1}`;
  });
}

async function updateAnalyticsDashboard(customMetrics) {
  let score = 65;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let reshares = 0;
  let saves = 0;
  let watchTime = '-';
  
  if (customMetrics) {
    score = customMetrics.engagement_score || 70;
    likes = customMetrics.likes || 0;
    comments = customMetrics.comments || 0;
    shares = customMetrics.shares || 0;
    reshares = customMetrics.reshares || 0;
    saves = customMetrics.saves || 0;
    watchTime = customMetrics.watch_time || '-';
  } else {
    // Gather inputs
    const categoryEl = document.querySelector('input[name="wpContentType"]:checked');
    if (!categoryEl) return;
    const category = categoryEl.value;
    const isVideo = category === 'video';
    
    let subCategory = 'single_post';
    const videoPlatforms = [];
    let script = '';
    const slides = [];
    
    if (isVideo) {
      const checkedPlat = document.querySelector('.wpVideoPlatform:checked');
      subCategory = checkedPlat ? checkedPlat.value : 'reels';
      document.querySelectorAll('.wpVideoPlatform:checked').forEach(cb => {
        videoPlatforms.push(cb.value);
      });
      script = document.getElementById('wpVideoScript').value || '';
    } else {
      const subtypeEl = document.querySelector('input[name="wpImageSubtype"]:checked');
      subCategory = subtypeEl ? subtypeEl.value : 'single_post';
      document.querySelectorAll('#wpSlidesList .slide-editor-row').forEach(row => {
        slides.push({
          text: row.querySelector('.slide-text')?.value || '',
          action: row.querySelector('.slide-action')?.value || 'keep',
          annotation: row.querySelector('.slide-annotation')?.value || ''
        });
      });
    }
    
    const caption = document.getElementById('wpCaption').value || '';
    
    try {
      // Temporarily dim the metrics values to show they are recalculating
      document.querySelectorAll('.metric-val, #wpAnalyticsScoreText').forEach(el => {
        el.style.opacity = '0.5';
      });
      
      const res = await req('/content/predict-analytics', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ category, subCategory, caption, script, slides, videoPlatforms })
      });
      
      const metrics = res.analytics || {};
      score = metrics.engagement_score || 70;
      likes = metrics.likes || 0;
      comments = metrics.comments || 0;
      shares = metrics.shares || 0;
      reshares = metrics.reshares || 0;
      saves = metrics.saves || 0;
      watchTime = metrics.watch_time || '-';
    } catch (err) {
      console.error('Error fetching analytics predictions:', err);
      return;
    } finally {
      document.querySelectorAll('.metric-val, #wpAnalyticsScoreText').forEach(el => {
        el.style.opacity = '1';
      });
    }
  }
  
  // Render Dashboard
  document.getElementById('wpAnalyticsScoreText').innerText = `${score}%`;
  document.getElementById('wpAnalyticsScoreCircle').setAttribute('stroke-dasharray', `${score}, 100`);
  
  // Apply colors to circle based on score
  const color = score >= 80 ? 'var(--success)' : (score >= 60 ? 'var(--accent)' : 'var(--danger)');
  document.getElementById('wpAnalyticsScoreCircle').setAttribute('stroke', color);
  
  document.getElementById('wpValLikes').innerText = likes.toLocaleString();
  document.getElementById('wpValComments').innerText = comments.toLocaleString();
  document.getElementById('wpValShares').innerText = shares.toLocaleString();
  document.getElementById('wpValReshares').innerText = reshares.toLocaleString();
  document.getElementById('wpValSaves').innerText = saves.toLocaleString();
  document.getElementById('wpValWatchTime').innerText = watchTime;
}

async function generateWpAIPlan() {
  const btn = document.getElementById('btnWpAiGenerate');
  const oldText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:1.5px;margin-right:6px;"></span> Generating Plan...';
  btn.disabled = true;
  
  const category = document.querySelector('input[name="wpContentType"]:checked').value;
  const isVideo = category === 'video';
  let subCategory = 'single_post';
  
  if (isVideo) {
    // pick first checked or reels default
    const checkedPlat = document.querySelector('.wpVideoPlatform:checked');
    subCategory = checkedPlat ? checkedPlat.value : 'reels';
  } else {
    subCategory = document.querySelector('input[name="wpImageSubtype"]:checked').value;
  }
  
  try {
    const res = await req(`/content/${currentWorkspaceIdeaId}/generate-plan`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ category, subCategory })
    });
    
    // Set Caption
    document.getElementById('wpCaption').value = res.caption || '';
    
    if (isVideo) {
      document.getElementById('wpVideoScript').value = res.script_details?.script || '';
      document.getElementById('wpVideoOverlay').value = res.script_details?.overlay_text || '';
    } else {
      document.getElementById('wpSlidesList').innerHTML = '';
      if (res.slides && res.slides.length > 0) {
        res.slides.forEach(s => {
          addNewSlideRow(s.text, s.action || 'keep', s.annotation || '', true);
        });
      } else {
        addNewSlideRow(res.script_details?.script || 'Visual layout description', 'keep', '', true);
      }
    }
    
    // Set AI metrics
    updateAnalyticsDashboard(res.analytics);
    showToast('Plan auto-generated with AI CMO suggestions');
  } catch(e) {
    showToast('Error generating AI plan: ' + e.message, 'error');
  } finally {
    btn.innerHTML = oldText;
    btn.disabled = false;
  }
}

async function saveContentPlan(statusVal = 'liked') {
  const category = document.querySelector('input[name="wpContentType"]:checked').value;
  const isVideo = category === 'video';
  
  let subCategory = 'single_post';
  let videoPlatforms = [];
  let videoPlan = {};
  let slides = [];
  
  if (isVideo) {
    const checkedPlat = document.querySelector('.wpVideoPlatform:checked');
    subCategory = checkedPlat ? checkedPlat.value : 'reels';
    document.querySelectorAll('.wpVideoPlatform:checked').forEach(cb => {
      videoPlatforms.push(cb.value);
    });
    videoPlan = {
      script: document.getElementById('wpVideoScript').value,
      overlay_text: document.getElementById('wpVideoOverlay').value
    };
  } else {
    subCategory = document.querySelector('input[name="wpImageSubtype"]:checked').value;
    document.querySelectorAll('#wpSlidesList .slide-editor-row').forEach(row => {
      slides.push({
        text: row.querySelector('.slide-text').value,
        action: row.querySelector('.slide-action').value,
        annotation: row.querySelector('.slide-annotation').value
      });
    });
  }
  
  // Extract values from dashboard
  const analytics = {
    engagement_score: parseInt(document.getElementById('wpAnalyticsScoreText').innerText.replace('%', ''), 10),
    likes: parseInt(document.getElementById('wpValLikes').innerText.replace(/,/g, ''), 10),
    comments: parseInt(document.getElementById('wpValComments').innerText.replace(/,/g, ''), 10),
    shares: parseInt(document.getElementById('wpValShares').innerText.replace(/,/g, ''), 10),
    reshares: parseInt(document.getElementById('wpValReshares').innerText.replace(/,/g, ''), 10),
    saves: parseInt(document.getElementById('wpValSaves').innerText.replace(/,/g, ''), 10),
    watch_time: document.getElementById('wpValWatchTime').innerText
  };
  
  const planning_json = JSON.stringify({
    category,
    subCategory,
    video_platforms: videoPlatforms,
    video_plan: videoPlan,
    slides,
    caption: document.getElementById('wpCaption').value,
    analytics
  });
  
  try {
    await req(`/content/${currentWorkspaceIdeaId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        status: statusVal,
        planning_json
      })
    });
    showToast(statusVal === 'done' ? 'Content plan saved and marked completed!' : 'Content plan saved successfully!');
    closeContentWorkspace();
  } catch(e) {
    showToast('Failed to save content plan', 'error');
  }
}

async function generateContent() {
  const payload = {
    type: document.getElementById('contentType').value,
    topic: document.getElementById('contentTopic').value,
    platform: document.getElementById('contentPlatform').value
  };
  document.getElementById('contentAIResult').innerHTML = '<div style="margin-top:20px; text-align:center;"><div class="spinner"></div><p>AI is generating ideas...</p></div>';
  closeModal('contentModal');
  
  const res = await req('/content/generate', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  document.getElementById('contentAIResult').innerHTML = `
    <div class="card" style="margin-top:20px; border: 1px solid var(--accent);">
      <div class="card-header"><h3>✨ New AI Idea</h3></div>
      <div class="card-body" style="font-size:14px; line-height:1.6;">${formatMarkdown(res.content)}</div>
    </div>
  `;
  fetchContent();
}

// SOCIAL
function switchSocialTab(tab) {
  document.querySelectorAll('#socialTabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`#socialTabs .tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('socialPostsTab').style.display = tab === 'posts' ? 'block' : 'none';
  document.getElementById('socialAccountsTab').style.display = tab === 'accounts' ? 'block' : 'none';
  if(tab === 'posts') fetchSocialPosts();
  if(tab === 'accounts') fetchSocialAccounts();
}
async function fetchSocial() { switchSocialTab('posts'); }

async function fetchSocialPosts() {
  const posts = await req('/social/posts');
  document.getElementById('postsTable').innerHTML = `
    <table class="table" id="postsTableInner">
      <thead><tr><th>Platform</th><th>Content</th><th>Uploaded By</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${posts.map(p => `<tr>
          <td><span class="badge secondary">${p.platform}</span></td>
          <td>${p.content.substring(0, 40)}...</td>
          <td>${p.uploader_name}</td>
          <td><span class="badge ${p.approval_status === 'approved' ? 'success' : 'warning'}">${p.approval_status}</span></td>
          <td>
            ${p.approval_status === 'pending' ? `<button class="btn btn-sm btn-primary" onclick="approvePost(${p.id})">Approve</button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
  setupTableFeatures({
    containerId: 'postsTable',
    tableId: 'postsTableInner',
    searchable: true,
    filters: [
      { colIndex: 0, label: 'Platform' },
      { colIndex: 3, label: 'Status' }
    ],
    sortableColumns: [0, 1, 2, 3]
  });
}
async function fetchSocialAccounts() {
  const accs = await req('/social/accounts');
  document.getElementById('accountsList').innerHTML = accs.map(a => `
    <div class="card">
      <div class="card-body">
        <h4>${a.account_name}</h4>
        <span class="badge primary">${a.platform}</span>
        <span style="float:right; color:green; font-size:12px;">● Connected</span>
      </div>
    </div>
  `).join('');
}
async function connectAccount() {
  const payload = {
    platform: document.getElementById('accPlatform').value,
    account_name: document.getElementById('accName').value,
    access_token: document.getElementById('accToken').value
  };
  await req('/social/accounts', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  closeModal('accountModal');
  showToast('Account connected!');
  fetchSocialAccounts();
}
async function createPost() {
  const formData = new FormData();
  formData.append('platform', document.getElementById('postPlatform').value);
  formData.append('content', document.getElementById('postContent').value);
  formData.append('scheduled_at', document.getElementById('postSchedule').value);
  if(document.getElementById('postMedia').files[0]) {
    formData.append('media', document.getElementById('postMedia').files[0]);
  }
  await req('/social/posts', { method: 'POST', body: formData });
  closeModal('postModal');
  showToast('Post created');
  fetchSocialPosts();
}
async function approvePost(id) {
  await req(`/social/posts/${id}/approve`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status: 'approved'}) });
  fetchSocialPosts();
}

// OTHER MODULES
async function fetchBlogs() {
  const blogs = await req('/blogs');
  document.getElementById('blogsTable').innerHTML = `<table class="table" id="blogsTableInner"><thead><tr><th>Title</th><th>Status</th><th>Author</th></tr></thead><tbody>${blogs.map(b => `<tr><td>${b.title}</td><td><span class="badge secondary">${b.status}</span></td><td>${b.author_name}</td></tr>`).join('')}</tbody></table>`;
  setupTableFeatures({
    containerId: 'blogsTable',
    tableId: 'blogsTableInner',
    searchable: true,
    filters: [
      { colIndex: 1, label: 'Status' },
      { colIndex: 2, label: 'Author' }
    ],
    sortableColumns: [0, 1, 2]
  });
}
async function createBlog() {
  const payload = {
    title: document.getElementById('blogTitle').value,
    content: document.getElementById('blogContent').value,
    meta_description: document.getElementById('blogMeta').value,
    keywords: document.getElementById('blogKeywords').value,
    status: 'published'
  };
  await req('/blogs', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  closeModal('blogModal');
  showToast('Blog published!');
  fetchBlogs();
}
async function generateBlog() {
  const topic = document.getElementById('blogGenTopic').value;
  closeModal('blogGenModal');
  document.getElementById('blogAIResult').innerHTML = '<div style="margin-top:20px; text-align:center;"><div class="spinner"></div><p>AI is writing blog...</p></div>';
  const res = await req('/blogs/generate', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({topic}) });
  document.getElementById('blogAIResult').innerHTML = `<div class="card" style="margin-top:20px;"><div class="card-body" style="font-size:14px; line-height:1.6;">${formatMarkdown(res.blog)}</div></div>`;
  fetchBlogs();
}

async function fetchVideos() {
  const vids = await req('/videos');
  document.getElementById('videosTable').innerHTML = `<table class="table" id="videosTableInner"><thead><tr><th>Project</th><th>Editor</th><th>Action</th></tr></thead><tbody>${vids.map(v => `<tr><td>${v.title}</td><td>${v.editor_name}</td><td><button class="btn btn-sm btn-primary" onclick="suggestVideoEdits(${v.id})">AI Suggestions</button></td></tr>`).join('')}</tbody></table>`;
  setupTableFeatures({
    containerId: 'videosTable',
    tableId: 'videosTableInner',
    searchable: true,
    filters: [
      { colIndex: 1, label: 'Editor' }
    ],
    sortableColumns: [0, 1]
  });
}
async function addVideo() {
  const formData = new FormData();
  formData.append('title', document.getElementById('videoTitle').value);
  formData.append('description', document.getElementById('videoDesc').value);
  if (document.getElementById('videoFile').files[0]) formData.append('video', document.getElementById('videoFile').files[0]);
  await req('/videos', { method: 'POST', body: formData });
  closeModal('videoModal');
  showToast('Video added!');
  fetchVideos();
}
async function suggestVideoEdits(id) {
  showToast('Generating AI suggestions...');
  document.getElementById('aiResultTitle').innerText = '🤖 Video Editing Suggestions';
  document.getElementById('aiResultContent').innerHTML = '<div style="text-align:center;padding:30px;"><div class="spinner"></div><p style="margin-top:12px;color:var(--text-muted);font-size:13px;">AI is generating suggestions...</p></div>';
  openModal('aiResultModal');
  
  try {
    const res = await req(`/videos/${id}/suggest`, { method: 'POST' });
    document.getElementById('aiResultContent').innerHTML = `
      <div style="font-size:14px; line-height:1.6; color:var(--text-primary); max-height: 60vh; overflow-y: auto; padding-right: 8px;">
        ${formatMarkdown(res.suggestions)}
      </div>
    `;
  } catch(e) {
    document.getElementById('aiResultContent').innerHTML = `<p class="error">Error generating suggestions: ${e.message}</p>`;
  }
}

async function fetchCompetitors() {
  const comps = await req('/competitors');
  document.getElementById('compGrid').innerHTML = comps.map(c => {
    const lastAnalyzedStr = c.last_analyzed ? new Date(c.last_analyzed).toLocaleString() : 'Never';
    return `
      <div class="comp-card">
        <h4>${c.name}</h4>
        <div class="comp-meta" style="margin-bottom:8px;">${c.category} • Last Analyzed: ${lastAnalyzedStr}</div>
        <div class="comp-links" style="margin-bottom:12px; display:flex; gap:12px;">
          ${c.website ? `<a href="${c.website}" target="_blank" style="color:var(--accent);font-size:12px;text-decoration:none;">🌐 Website</a>` : ''}
          ${c.instagram ? `<a href="https://instagram.com/${c.instagram.replace('@', '')}" target="_blank" style="color:var(--accent);font-size:12px;text-decoration:none;">📸 Instagram</a>` : ''}
        </div>
        <div class="flex-gap" style="display:flex; gap:10px;">
          <button class="btn btn-sm btn-secondary" style="flex:1;" onclick="viewCompetitorInsights(${c.id}, '${c.name.replace(/'/g, "\\'")}')">View Insights</button>
          <button class="btn btn-sm btn-primary" onclick="analyzeCompetitor(${c.id})">🤖 Analyze</button>
        </div>
      </div>
    `;
  }).join('');
}
async function addCompetitor() {
  const payload = {name: document.getElementById('compName').value, website: document.getElementById('compWebsite').value, instagram: document.getElementById('compInsta').value, category: document.getElementById('compCategory').value};
  await req('/competitors', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  closeModal('compModal');
  fetchCompetitors();
}
async function viewCompetitorInsights(id, name) {
  document.getElementById('aiResultTitle').innerText = `🔍 Competitor Insights: ${name}`;
  document.getElementById('aiResultContent').innerHTML = '<div style="text-align:center;padding:30px;"><div class="spinner"></div><p style="margin-top:12px;color:var(--text-muted);font-size:13px;">Loading insights...</p></div>';
  openModal('aiResultModal');
  
  try {
    const insights = await req(`/competitors/${id}/insights`);
    if (insights.length === 0) {
      document.getElementById('aiResultContent').innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-muted);">
          <p>No insights generated for this competitor yet.</p>
          <button class="btn btn-sm btn-primary" style="margin-top:10px;" onclick="closeModal('aiResultModal'); analyzeCompetitor(${id})">Run AI Analysis</button>
        </div>
      `;
    } else {
      document.getElementById('aiResultContent').innerHTML = `
        <div style="font-size:14px; line-height:1.6; color:var(--text-primary); max-height: 60vh; overflow-y: auto; padding-right: 8px;">
          ${formatMarkdown(insights[0].content)}
        </div>
      `;
    }
  } catch(e) {
    document.getElementById('aiResultContent').innerHTML = `<p class="error">Error loading insights: ${e.message}</p>`;
  }
}
async function analyzeCompetitor(id) {
  showToast('Analyzing competitor...');
  document.getElementById('aiResultTitle').innerText = '🤖 Analyzing Competitor';
  document.getElementById('aiResultContent').innerHTML = '<div style="text-align:center;padding:30px;"><div class="spinner"></div><p style="margin-top:12px;color:var(--text-muted);font-size:13px;">AI is analyzing competitor data and market positioning...</p></div>';
  openModal('aiResultModal');
  
  try {
    const res = await req(`/competitors/${id}/analyze`, { method: 'POST' });
    document.getElementById('aiResultContent').innerHTML = `
      <div style="font-size:14px; line-height:1.6; color:var(--text-primary); max-height: 60vh; overflow-y: auto; padding-right: 8px;">
        ${formatMarkdown(res.analysis)}
      </div>
    `;
    fetchCompetitors();
  } catch(e) {
    document.getElementById('aiResultContent').innerHTML = `<p class="error">Error analyzing competitor: ${e.message}</p>`;
  }
}

async function fetchLeads() {
  const leads = await req('/leads');
  currentLeads = leads;
  document.getElementById('leadsTable').innerHTML = `
    <table class="table" id="leadsTableInner">
      <thead>
        <tr>
          <th>Name</th>
          <th>Contact</th>
          <th>Company</th>
          <th>Type</th>
          <th>Source</th>
          <th>Score</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${leads.map(l => {
          let statusClass = 'badge-new';
          if (l.status === 'contacted') statusClass = 'badge-contacted';
          else if (l.status === 'qualified') statusClass = 'badge-qualified';
          
          let typeClass = l.type === 'b2b' ? 'badge-b2b' : 'badge-b2c';
          
          return `
            <tr data-type="${l.type}" data-source="${l.source}">
              <td><strong>${l.name}</strong></td>
              <td>
                <span style="font-size:12px;color:var(--text-primary);">${l.email || '-'}</span><br>
                <span style="font-size:11px;color:var(--text-muted);">${l.phone || '-'}</span>
              </td>
              <td>${l.company || '-'}</td>
              <td><span class="badge-status ${typeClass}">${l.type.toUpperCase()}</span></td>
              <td>${l.source}</td>
              <td><strong>${l.score || '0'}/100</strong></td>
              <td><span class="badge-status ${statusClass}">${l.status}</span></td>
              <td>
                <button class="btn btn-sm btn-secondary" onclick="openEditLead(${l.id})">Update</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  setupTableFeatures({
    containerId: 'leadsTable',
    tableId: 'leadsTableInner',
    searchable: true,
    filters: [
      { colIndex: 3, label: 'Type' },
      { colIndex: 4, label: 'Source' },
      { colIndex: 6, label: 'Status' }
    ],
    sortableColumns: [0, 1, 2, 3, 4, 5, 6]
  });
}
function filterLeads(type) {
  document.querySelectorAll('#page-leads .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  const rows = document.getElementById('leadsTableInner').querySelectorAll('tbody tr');
  rows.forEach(r => {
    if (type === 'all') r.style.display = '';
    else if (type === 'store') r.style.display = r.dataset.source.toLowerCase().includes('store') ? '' : 'none';
    else r.style.display = r.dataset.type.toLowerCase() === type ? '' : 'none';
  });
}
function openEditLead(id) {
  const lead = currentLeads.find(l => l.id === id);
  if (!lead) return;
  document.getElementById('editLeadId').value = lead.id;
  document.getElementById('editLeadStatus').value = lead.status || 'new';
  document.getElementById('editLeadNotes').value = lead.notes || '';
  openModal('editLeadModal');
}
async function updateLead() {
  const id = document.getElementById('editLeadId').value;
  const status = document.getElementById('editLeadStatus').value;
  const notes = document.getElementById('editLeadNotes').value;
  
  await req(`/leads/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ status, notes })
  });
  
  closeModal('editLeadModal');
  showToast('Lead updated successfully');
  fetchLeads();
}
async function addLead() {
  const payload = {
    name: document.getElementById('leadName').value,
    email: document.getElementById('leadEmail').value,
    phone: document.getElementById('leadPhone').value,
    company: document.getElementById('leadCompany').value,
    type: document.getElementById('leadType').value,
    source: document.getElementById('leadSource').value
  };
  await req('/leads', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  closeModal('leadModal');
  showToast('Lead added successfully!');
  fetchLeads();
}
async function generateLeads() {
  document.getElementById('leadAIResult').innerHTML = '<div style="margin-top:20px; text-align:center;"><div class="spinner"></div><p>AI is generating leads...</p></div>';
  const res = await req('/leads/generate', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({}) });
  document.getElementById('leadAIResult').innerHTML = `<div class="card" style="margin-top:20px;"><div class="card-body" style="font-size:14px; line-height:1.6;">${formatMarkdown(res.leads)}</div></div>`;
}

async function fetchMeta() {
  const camps = await req('/meta/campaigns');
  document.getElementById('metaTable').innerHTML = `<table class="table" id="metaTableInner"><thead><tr><th>Campaign</th><th>Budget</th><th>Spent</th><th>ROAS</th></tr></thead><tbody>${camps.map(c => `<tr><td>${c.campaign_name}</td><td>₹${c.budget || c.spent}</td><td>₹${c.spent}</td><td>${c.roas || '-'}</td></tr>`).join('')}</tbody></table>`;
  setupTableFeatures({
    containerId: 'metaTable',
    tableId: 'metaTableInner',
    searchable: true,
    sortableColumns: [0, 1, 2, 3]
  });
}
async function addCampaign() {
  const payload = {
    campaign_name: document.getElementById('campName').value,
    budget: document.getElementById('campBudget').value,
    spent: document.getElementById('campSpent').value,
    impressions: document.getElementById('campImpressions').value,
    clicks: document.getElementById('campClicks').value,
    conversions: document.getElementById('campConversions').value,
    date: document.getElementById('campDate').value
  };
  await req('/meta/campaigns', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
  closeModal('campaignModal');
  showToast('Campaign added!');
  fetchMeta();
}
async function syncMeta() {
  showToast('Syncing real Meta Campaigns...', 'info');
  try {
    const res = await req('/meta/sync', { method: 'POST' });
    showToast(`Synced ${res.count} campaigns successfully!`);
    fetchMeta();
  } catch(e) {
    showToast('Add META_ACCESS_TOKEN and META_AD_ACCOUNT_ID to .env', 'error');
  }
}
async function analyzeMeta() {
  document.getElementById('metaAIResult').innerHTML = '<div style="margin-top:20px; text-align:center;"><div class="spinner"></div><p>AI is analyzing real campaigns...</p></div>';
  const res = await req('/meta/analyze', { method: 'POST' });
  document.getElementById('metaAIResult').innerHTML = `<div class="card" style="margin-top:20px;"><div class="card-body" style="font-size:14px; line-height:1.6;">${formatMarkdown(res.analysis)}</div></div>`;
}

async function fetchShopify() {
  const data = await req('/shopify/data');
  const orderRecord = data.find(d => d.data_type === 'real_orders');
  const insightRecord = data.find(d => d.data_type === 'ai_analysis');
  
  if (insightRecord) {
    let insightsText = '';
    try {
      const parsed = JSON.parse(insightRecord.data_json);
      insightsText = parsed.insights;
    } catch(e) {
      insightsText = insightRecord.data_json;
    }
    document.getElementById('shopifyInsights').querySelector('.card-body').innerHTML = `
      <div class="ai-result" style="margin-top:0;">
        <div style="font-size:13px; line-height:1.6; color:var(--text-primary);">${formatMarkdown(insightsText)}</div>
      </div>
    `;
  }
  
  if (!orderRecord) {
    document.getElementById('shopifyStats').innerHTML = '';
    return;
  }
  
  let orders = [];
  try {
    orders = JSON.parse(orderRecord.data_json);
  } catch(e) {
    console.error('Error parsing orders JSON:', e);
    return;
  }
  
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
  
  document.getElementById('shopifyStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Shopify Revenue</div>
      <div class="stat-value" style="color:var(--accent2); margin-top:5px; font-weight:800; font-size:24px;">₹${totalRevenue.toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Shopify Orders</div>
      <div class="stat-value" style="color:var(--success); margin-top:5px; font-weight:800; font-size:24px;">${totalOrders}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Order Value</div>
      <div class="stat-value" style="color:var(--info); margin-top:5px; font-weight:800; font-size:24px;">₹${avgOrderValue.toLocaleString('en-IN', {maximumFractionDigits:2})}</div>
    </div>
  `;
  
  document.getElementById('shopifyOrdersTable').innerHTML = `
    <table class="table" id="shopifyTableInner">
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Items</th>
          <th>Financial</th>
          <th>Fulfillment</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => {
          const date = new Date(o.created_at).toLocaleDateString('en-IN');
          const customerName = o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : 'Guest';
          const itemsDesc = o.line_items.map(li => `${li.title} (x${li.quantity})`).join(', ');
          return `
            <tr>
              <td><strong>#${o.order_number}</strong></td>
              <td>${customerName}</td>
              <td>${date}</td>
              <td><span style="font-size:12px;color:var(--text-secondary);">${itemsDesc}</span></td>
              <td><span class="badge-status badge-completed">${o.financial_status}</span></td>
              <td><span class="badge-status ${o.fulfillment_status === 'fulfilled' ? 'badge-completed' : 'badge-pending'}">${o.fulfillment_status}</span></td>
              <td style="text-align:right; font-weight:700; color:var(--text-primary);">₹${parseFloat(o.total_price).toLocaleString('en-IN')}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  setupTableFeatures({
    containerId: 'shopifyOrdersTable',
    tableId: 'shopifyTableInner',
    searchable: true,
    filters: [
      { colIndex: 4, label: 'Financial' },
      { colIndex: 5, label: 'Fulfillment' }
    ],
    sortableColumns: [0, 1, 2, 4, 5, 6]
  });
}

async function syncShopify() {
  showToast('Syncing real Shopify data...', 'info');
  try {
    const res = await req('/shopify/sync', { method: 'POST' });
    showToast(`Synced ${res.count} orders successfully!`);
    fetchShopify();
  } catch(e) {
    showToast('Add SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN to .env', 'error');
  }
}

async function analyzeShopify() {
  const box = document.getElementById('shopifyInsights');
  box.querySelector('.card-body').innerHTML = '<div style="margin-top:20px; text-align:center;"><div class="spinner"></div><p>AI is analyzing real store data...</p></div>';
  const res = await req('/shopify/analyze', { method: 'POST' });
  box.querySelector('.card-body').innerHTML = `
    <div class="ai-result" style="margin-top:0;">
      <div style="font-size:13px; line-height:1.6; color:var(--text-primary);">${formatMarkdown(res.insights)}</div>
    </div>
  `;
  fetchShopify();
}

async function fetchReports() {
  const reps = await req('/reports');
  if (reps.length === 0) {
    document.getElementById('reportsList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h4>No daily reports generated yet</h4>
        <p>Click "Generate Today's Report" above to create one.</p>
      </div>
    `;
    return;
  }
  
  document.getElementById('reportsList').innerHTML = reps.map((r, index) => {
    let contentHtml = '';
    let isJson = false;
    let data = null;
    
    try {
      let cleanSummary = r.summary.trim();
      if (cleanSummary.startsWith('```')) {
        cleanSummary = cleanSummary.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
      }
      data = JSON.parse(cleanSummary);
      isJson = true;
    } catch(e) {
      // Legacy text format fallback
    }
    
    if (isJson && data) {
      contentHtml = `
        <div class="report-section mb-20">
          <h4 style="font-size:13px; color:var(--accent); font-weight:600; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Executive Summary</h4>
          <p style="font-size:13px; line-height:1.6; color:var(--text-primary); margin:0;">${data.executive_summary}</p>
        </div>
        
        <div class="grid-2 mb-20">
          <!-- Metrics Card -->
          <div class="card" style="border: 1px solid var(--glass-border); background: rgba(255,255,255,0.015);">
            <div class="card-header" style="padding: 10px 15px;"><h5 style="font-size:11px; margin:0; text-transform:uppercase; letter-spacing:1px; color:var(--text-secondary);">📈 Key Marketing Metrics</h5></div>
            <div class="card-body" style="padding: 12px 15px;">
              <table style="width:100%; font-size:12px; border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--glass-border);">
                    <th style="padding:6px 0; text-align:left; font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Category</th>
                    <th style="padding:6px 0; text-align:left; font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Metric</th>
                    <th style="padding:6px 0; text-align:right; font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.metrics ? data.metrics.map(m => `
                    <tr style="border-bottom: 1px dashed rgba(255,255,255,0.06);">
                      <td style="padding:8px 0; color:var(--text-primary); font-weight:600; text-align:left;">${m.category}</td>
                      <td style="padding:8px 0; color:var(--text-secondary); text-align:left;">${m.metric}</td>
                      <td style="padding:8px 0; text-align:right; color:var(--accent2); font-weight:700;">${m.value}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="3" style="padding:8px 0; text-align:center;">No metrics available</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Wins & Focus Card -->
          <div class="card" style="border: 1px solid var(--glass-border); background: rgba(255,255,255,0.015);">
            <div class="card-header" style="padding: 10px 15px;"><h5 style="font-size:11px; margin:0; text-transform:uppercase; letter-spacing:1px; color:var(--text-secondary);">🏆 Wins & Focus Areas</h5></div>
            <div class="card-body" style="padding: 12px 15px; font-size:12px; display:flex; flex-direction:column; gap:10px;">
              <div>
                <strong style="color:var(--success); display:block; margin-bottom:4px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">✨ Key Wins Today:</strong>
                <ul style="padding-left:16px; margin:0; color:var(--text-secondary); display:flex; flex-direction:column; gap:2px;">
                  ${data.key_wins ? data.key_wins.map(w => `<li>${w}</li>`).join('') : '<li>None reported</li>'}
                </ul>
              </div>
              <hr style="border:0; border-top:1px solid var(--glass-border); margin:4px 0;">
              <div>
                <strong style="color:var(--danger); display:block; margin-bottom:4px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">⚠️ Areas for Attention:</strong>
                <ul style="padding-left:16px; margin:0; color:var(--text-secondary); display:flex; flex-direction:column; gap:2px;">
                  ${data.areas_for_improvement ? data.areas_for_improvement.map(i => `<li>${i}</li>`).join('') : '<li>None reported</li>'}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Categorised Work Tabular Card -->
        <div class="card mb-20" style="border: 1px solid var(--glass-border); background: rgba(255,255,255,0.015);">
          <div class="card-header" style="padding: 10px 15px;"><h5 style="font-size:11px; margin:0; text-transform:uppercase; letter-spacing:1px; color:var(--text-secondary);">📋 Categorised Work Details</h5></div>
          <div class="card-body" style="padding: 0 15px;">
            <table style="width:100%; font-size:12px; border-collapse:collapse;">
              <thead>
                <tr style="border-bottom: 1px solid var(--glass-border);">
                  <th style="padding:10px 0; text-align:left; font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; width:25%;">Category</th>
                  <th style="padding:10px 0; text-align:left; font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; width:55%;">Work Done / Planned</th>
                  <th style="padding:10px 0; text-align:right; font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; width:20%;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.work_categories ? data.work_categories.map(w => `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding:10px 0; font-weight:600; color:var(--text-primary); vertical-align:top; text-align:left;">${w.category}</td>
                    <td style="padding:10px 0; color:var(--text-secondary); line-height:1.5; padding-right:15px; vertical-align:top; text-align:left;">${w.work_done}</td>
                    <td style="padding:10px 0; text-align:right; vertical-align:top;">
                      <span class="badge-status ${w.status.toLowerCase().includes('complete') || w.status.toLowerCase().includes('ready') || w.status.toLowerCase().includes('active') ? 'badge-completed' : 'badge-pending'}" style="font-size:9px; padding:2px 8px; border-radius:4px;">
                        ${w.status}
                      </span>
                    </td>
                  </tr>
                `).join('') : '<tr><td colspan="3" style="padding:10px 0; text-align:center;">No categorised work reported</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="report-section" style="background: rgba(245,158,11,0.03); border: 1px solid rgba(245,158,11,0.1); border-radius: 8px; padding: 15px;">
          <h4 style="font-size:12px; color:var(--warning); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; margin-top:0;">💡 Recommendations for Tomorrow</h4>
          <ul style="padding-left:18px; margin:0; font-size:13px; color:var(--text-secondary); display:flex; flex-direction:column; gap:4px; line-height:1.5;">
            ${data.recommendations ? data.recommendations.map(r => `<li>${r}</li>`).join('') : '<li>None</li>'}
          </ul>
        </div>
      `;
    } else {
      contentHtml = `<p style="font-size:13px; line-height:1.7; color:var(--text-secondary); white-space:pre-wrap; margin:0;">${r.summary.replace(/\\n/g, '\n')}</p>`;
    }
    
    const dateObj = new Date(r.report_date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const isExpanded = index === 0;

    return `
      <div class="card" style="margin-bottom:20px; border: 1px solid var(--glass-border); overflow:hidden;">
        <div class="card-header" style="background: linear-gradient(90deg, rgba(250,204,21,0.05) 0%, rgba(245,158,11,0.02) 100%); border-bottom: 1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center; padding:15px 20px;">
          <div>
            <h3 style="font-size:15px; margin:0; font-weight:700; color:var(--text-primary);">Daily CMO Marketing Report</h3>
            <span style="font-size:11px; color:var(--accent); font-weight:600; display:block; margin-top:2px;">📅 ${formattedDate}</span>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="toggleReportDetails(this)" style="font-size:11px; padding:6px 12px; border-radius:4px;">${isExpanded ? 'Collapse' : 'Expand'}</button>
        </div>
        <div class="card-body report-body" style="padding:20px; display:${isExpanded ? 'block' : 'none'};">
          ${contentHtml}
        </div>
      </div>
    `;
  }).join('');
}

function toggleReportDetails(btn) {
  const cardBody = btn.closest('.card').querySelector('.report-body');
  if (cardBody.style.display === 'none') {
    cardBody.style.display = 'block';
    btn.innerText = 'Collapse';
  } else {
    cardBody.style.display = 'none';
    btn.innerText = 'Expand';
  }
}

async function generateReport() {
  showToast('Generating report...');
  const res = await req('/reports/generate', { method: 'POST' });
  fetchReports();
}

async function fetchAIHistory() {
  const msgs = await req('/ai/history');
  document.getElementById('aiMessages').innerHTML = msgs.reverse().map(m => `<div class="ai-msg ${m.role}">${formatMarkdown(m.content)}</div>`).join('');
  document.querySelector('.ai-messages').scrollTop = document.querySelector('.ai-messages').scrollHeight;
}
async function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const msg = input.value.trim();
  if(!msg) return;
  input.value = '';
  document.getElementById('aiMessages').innerHTML += `<div class="ai-msg user">${msg}</div><div class="ai-msg assistant" id="aiLoading"><div class="spinner" style="width:16px;height:16px;border-width:2px;"></div></div>`;
  document.querySelector('.ai-messages').scrollTop = document.querySelector('.ai-messages').scrollHeight;
  
  const res = await req('/ai/chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message: msg}) });
  document.getElementById('aiLoading').remove();
  document.getElementById('aiMessages').innerHTML += `<div class="ai-msg assistant">${formatMarkdown(res.reply)}</div>`;
  document.querySelector('.ai-messages').scrollTop = document.querySelector('.ai-messages').scrollHeight;
}

// ═══════════════════════════════════════
//  CITATION SCORE MODULE
// ═══════════════════════════════════════
async function fetchCitationScore() {
  try {
    const data = await req('/citation/score');
    const current = data.current || {};
    const prev = data.previous || {};
    const history = data.history || [];
    
    // Render gauge
    const score = current.score || 0;
    const circumference = 2 * Math.PI * 58;
    const dashArray = `${(score / 100) * circumference}, ${circumference}`;
    document.getElementById('citationGaugeFill').setAttribute('stroke-dasharray', dashArray);
    document.getElementById('citationScoreNum').innerText = score;
    
    // Trend change
    const change = score - (prev.score || 0);
    const changeEl = document.getElementById('citationTrendChange');
    if (change > 0) changeEl.innerHTML = `<span class="up">▲ +${change} pts this week</span>`;
    else if (change < 0) changeEl.innerHTML = `<span class="down">▼ ${change} pts this week</span>`;
    else changeEl.innerHTML = `<span style="color:var(--text-muted);">— No change</span>`;
    
    // Trend chart (bars)
    const maxScore = Math.max(...history.map(h => h.score), 1);
    document.getElementById('citationTrendChart').innerHTML = history.map(h => {
      const height = Math.max(4, (h.score / maxScore) * 50);
      return `<div class="trend-bar" style="height:${height}px"><div class="trend-tooltip">${h.week_label}: ${h.score}</div></div>`;
    }).join('');
    
    // Platform breakdown
    const breakdown = JSON.parse(current.platform_breakdown || '{}');
    const platformLabels = {
      google_ai: 'Google AI', chatgpt: 'ChatGPT', claude: 'Claude',
      gemini: 'Gemini', perplexity: 'Perplexity', bing_copilot: 'Bing Copilot'
    };
    const platformColors = {
      google_ai: '#4285f4', chatgpt: '#10a37f', claude: '#cc785c',
      gemini: '#8b5cf6', perplexity: '#20b2aa', bing_copilot: '#00bcf2'
    };
    document.getElementById('citationPlatformGrid').innerHTML = Object.entries(platformLabels).map(([key, label]) => {
      const val = breakdown[key] || 0;
      const color = platformColors[key];
      return `<div class="platform-score-card">
        <div class="plat-name">${label}</div>
        <div class="plat-score" style="color:${color}">${val}</div>
        <div class="plat-bar"><div class="plat-bar-fill" style="width:${val}%;background:${color};"></div></div>
      </div>`;
    }).join('');
    
    // Tasks
    const tasks = await req('/citation/tasks');
    document.getElementById('citationTasksList').innerHTML = tasks.map(t => `
      <div class="citation-task-item">
        <div class="task-priority-dot priority-${t.priority}"></div>
        <div style="flex:1;">
          <div style="font-size:13px; color:var(--text-primary); line-height:1.4;">${t.task}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:3px;">
            <span class="badge-status badge-${t.priority === 'critical' ? 'critical' : t.priority === 'high' ? 'priority-high' : 'priority-medium'}" style="font-size:9px; padding:2px 8px;">${t.priority.toUpperCase()}</span>
            <span style="margin-left:6px;">${t.platform || ''}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Error fetching citation score:', e);
  }
}

async function refreshCitationScore() {
  showToast('Recalculating AI citation score...', 'info');
  try {
    await req('/citation/refresh', { method: 'POST' });
    showToast('Citation score updated!');
    fetchCitationScore();
  } catch (e) {
    showToast('Error refreshing score: ' + e.message, 'error');
  }
}

// ═══════════════════════════════════════
//  AI CONTENT ENGINE MODULE
// ═══════════════════════════════════════
async function generateSEOBrief() {
  const keyword = document.getElementById('seoKeywordInput').value.trim();
  if (!keyword) return showToast('Enter a keyword first', 'error');
  
  document.getElementById('seoBriefOutput').innerHTML = `
    <div class="card"><div class="card-body" style="text-align:center;padding:40px;">
      <div class="spinner"></div>
      <p style="margin-top:12px;color:var(--text-muted);font-size:13px;">Generating SEO brief for "${keyword}"...</p>
    </div></div>`;
  
  try {
    const res = await req('/seo/brief', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ keyword })
    });
    
    let brief;
    try { brief = typeof res.brief === 'string' ? JSON.parse(res.brief) : res.brief; }
    catch (e) { brief = { raw: res.brief }; }
    
    if (brief.raw) {
      document.getElementById('seoBriefOutput').innerHTML = `<div class="card"><div class="card-body">${formatMarkdown(brief.raw)}</div></div>`;
      return;
    }
    
    document.getElementById('seoBriefOutput').innerHTML = `
      <div class="brief-output">
        <div class="brief-section">
          <div class="brief-meta-grid">
            <div class="brief-meta-item"><div class="meta-label">Search Intent</div><div class="meta-value">${brief.search_intent || '-'}</div></div>
            <div class="brief-meta-item"><div class="meta-label">Difficulty</div><div class="meta-value">${brief.difficulty || '-'}</div></div>
            <div class="brief-meta-item"><div class="meta-label">Word Count Target</div><div class="meta-value">${brief.word_count_target || '-'}</div></div>
          </div>
        </div>
        <div class="brief-section">
          <div class="brief-section-title">🎯 Title Variations (CTR-Optimised)</div>
          ${(brief.title_variations || []).map((t, i) => `<div style="padding:8px 12px;background:rgba(255,255,255,0.01);border:1px solid var(--glass-border);border-radius:var(--radius-sm);margin-bottom:6px;font-size:13px;color:var(--text-primary);"><strong>v${i + 1}:</strong> ${t}</div>`).join('')}
        </div>
        <div class="brief-section">
          <div class="brief-section-title">📝 Meta Description</div>
          <p style="font-size:13px;color:var(--text-primary);line-height:1.5;margin:0;">${brief.meta_description || '-'}</p>
        </div>
        <div class="brief-section">
          <div class="brief-section-title">📋 Heading Structure</div>
          ${brief.heading_structure ? `
            <div style="font-size:13px;color:var(--text-primary);line-height:1.8;">
              <div style="font-weight:700;color:var(--accent);">H1: ${brief.heading_structure.h1}</div>
              ${(brief.heading_structure.h2s || []).map(h => `<div style="padding-left:16px;">↳ H2: ${h}</div>`).join('')}
              ${(brief.heading_structure.h3s || []).map(h => `<div style="padding-left:32px;color:var(--text-secondary);">↳ H3: ${h}</div>`).join('')}
            </div>
          ` : '<p style="color:var(--text-muted);">-</p>'}
        </div>
        <div class="brief-section">
          <div class="brief-section-title">🔗 Related Keywords</div>
          ${(brief.related_keywords || []).map(k => `<span class="brief-tag">${k}</span>`).join('')}
        </div>
        <div class="brief-section">
          <div class="brief-section-title">🧠 LSI / Semantic Keywords</div>
          ${(brief.lsi_keywords || []).map(k => `<span class="brief-tag" style="background:rgba(139,92,246,0.08);color:#8b5cf6;">${k}</span>`).join('')}
        </div>
        ${brief.competitor_gap ? `
          <div class="brief-section">
            <div class="brief-section-title">⚔️ Competitor Gap</div>
            <div class="grid-2">
              <div style="padding:12px;background:rgba(16,185,129,0.03);border:1px solid rgba(16,185,129,0.12);border-radius:var(--radius-sm);">
                <div style="font-size:10px;font-weight:700;color:var(--success);text-transform:uppercase;margin-bottom:6px;">What They Wrote</div>
                <p style="font-size:12px;color:var(--text-secondary);margin:0;line-height:1.5;">${brief.competitor_gap.what_they_wrote}</p>
              </div>
              <div style="padding:12px;background:rgba(239,68,68,0.03);border:1px solid rgba(239,68,68,0.12);border-radius:var(--radius-sm);">
                <div style="font-size:10px;font-weight:700;color:var(--danger);text-transform:uppercase;margin-bottom:6px;">What They Missed</div>
                <p style="font-size:12px;color:var(--text-secondary);margin:0;line-height:1.5;">${brief.competitor_gap.what_they_missed}</p>
              </div>
            </div>
          </div>
        ` : ''}
        ${brief.content_outline ? `
          <div class="brief-section">
            <div class="brief-section-title">📖 Content Outline</div>
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin:0;">${brief.content_outline}</p>
          </div>
        ` : ''}
      </div>`;
    showToast('SEO brief generated!');
    fetchSEOBriefs();
  } catch (e) {
    document.getElementById('seoBriefOutput').innerHTML = `<div class="card"><div class="card-body" style="color:var(--danger);">Error: ${e.message}</div></div>`;
  }
}

async function fetchSEOBriefs() {
  try {
    const briefs = await req('/seo/briefs');
    if (briefs.length === 0) {
      document.getElementById('seoBriefHistory').innerHTML = '';
      return;
    }
    document.getElementById('seoBriefHistory').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>📚 Previous Briefs</h3></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${briefs.slice(0, 10).map(b => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.01);border:1px solid var(--glass-border);border-radius:var(--radius-sm);cursor:pointer;" onclick="document.getElementById('seoKeywordInput').value='${b.keyword}';generateSEOBrief();">
                <div>
                  <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${b.keyword}</span>
                  <span style="font-size:11px;color:var(--text-muted);margin-left:10px;">${new Date(b.created_at).toLocaleDateString()}</span>
                </div>
                <span style="font-size:11px;color:var(--accent);">View →</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>`;
  } catch (e) { console.error('Error fetching briefs:', e); }
}

// ═══════════════════════════════════════
//  AI GAP ANALYSIS MODULE
// ═══════════════════════════════════════
async function fetchGapAnalysis() {
  try {
    const gaps = await req('/gaps');
    const critical = gaps.filter(g => g.priority === 'critical').length;
    const high = gaps.filter(g => g.priority === 'high').length;
    const totalVolume = gaps.reduce((s, g) => s + (g.monthly_volume || 0), 0);
    
    document.getElementById('gapStats').innerHTML = `
      <div class="stat-card"><div class="stat-label">Total Gaps</div><div class="stat-value" style="color:var(--accent);font-weight:800;font-size:28px;margin-top:5px;">${gaps.length}</div></div>
      <div class="stat-card"><div class="stat-label">Critical</div><div class="stat-value" style="color:var(--danger);font-weight:800;font-size:28px;margin-top:5px;">${critical}</div></div>
      <div class="stat-card"><div class="stat-label">High Priority</div><div class="stat-value" style="color:var(--warning);font-weight:800;font-size:28px;margin-top:5px;">${high}</div></div>
      <div class="stat-card"><div class="stat-label">Est. Monthly Traffic Lost</div><div class="stat-value" style="color:var(--accent2);font-weight:800;font-size:28px;margin-top:5px;">${totalVolume.toLocaleString()}</div></div>
    `;
    
    document.getElementById('gapTable').innerHTML = `
      <table class="table" id="gapTableInner">
        <thead>
          <tr>
            <th>Search Query / Prompt</th>
            <th>Priority</th>
            <th>Monthly Volume</th>
            <th>Winning Competitor</th>
            <th>Engines</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${gaps.map(g => {
            const priClass = g.priority === 'critical' ? 'badge-critical' : g.priority === 'high' ? 'badge-priority-high' : 'badge-priority-medium';
            return `<tr class="gap-row">
              <td class="gap-query">${g.query}</td>
              <td><span class="badge-status ${priClass}" style="font-size:10px;padding:3px 10px;">${g.priority.toUpperCase()}</span></td>
              <td class="gap-volume">${(g.monthly_volume || 0).toLocaleString()}</td>
              <td><span style="font-size:12px;">${g.ranking_competitor || '-'} <span style="color:var(--text-muted);">#${g.competitor_position || '-'}</span></span></td>
              <td class="gap-engines">${g.engines_won || '-'}</td>
              <td><span class="badge-status ${g.status === 'planned' ? 'badge-completed' : 'badge-pending'}" style="font-size:10px;padding:3px 8px;">${g.status}</span></td>
              <td>${g.status !== 'planned' ? `<button class="btn btn-sm btn-primary" onclick="fixGap(${g.id})">Fix Plan</button>` : `<button class="btn btn-sm btn-secondary" onclick="viewFixPlan(${g.id})">View Plan</button>`}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    setupTableFeatures({
      containerId: 'gapTable',
      tableId: 'gapTableInner',
      searchable: true,
      filters: [
        { colIndex: 1, label: 'Priority' },
        { colIndex: 5, label: 'Status' }
      ],
      sortableColumns: [0, 1, 2, 3, 5]
    });
  } catch (e) { console.error('Error fetching gaps:', e); }
}

async function scanForGaps() {
  showToast('Scanning for new AI search gaps...', 'info');
  try {
    const res = await req('/gaps/scan', { method: 'POST' });
    showToast(`Found ${res.gaps?.length || 0} new gaps!`);
    fetchGapAnalysis();
  } catch (e) {
    showToast('Error scanning for gaps: ' + e.message, 'error');
  }
}

async function fixGap(id) {
  showToast('Generating fix plan...', 'info');
  try {
    const res = await req(`/gaps/${id}/fix`, { method: 'POST' });
    document.getElementById('aiResultTitle').innerText = '🛠️ Gap Fix Plan';
    document.getElementById('aiResultContent').innerHTML = `<div style="font-size:14px;line-height:1.6;color:var(--text-primary);max-height:60vh;overflow-y:auto;">${formatMarkdown(res.plan)}</div>`;
    openModal('aiResultModal');
    fetchGapAnalysis();
  } catch (e) {
    showToast('Error generating fix plan: ' + e.message, 'error');
  }
}

function viewFixPlan(id) {
  // Find the gap in the current table data
  const row = document.querySelector(`#gapTableInner tr:has(button[onclick="viewFixPlan(${id})"])`);
  if (!row) return;
  // Fetch from backend
  req(`/gaps`).then(gaps => {
    const gap = gaps.find(g => g.id === id);
    if (gap && gap.fix_plan) {
      document.getElementById('aiResultTitle').innerText = '🛠️ Gap Fix Plan';
      document.getElementById('aiResultContent').innerHTML = `<div style="font-size:14px;line-height:1.6;color:var(--text-primary);max-height:60vh;overflow-y:auto;">${formatMarkdown(gap.fix_plan)}</div>`;
      openModal('aiResultModal');
    }
  });
}

// ═══════════════════════════════════════
//  CUSTOM PROMPT TRACKING MODULE
// ═══════════════════════════════════════
let allPrompts = [];

async function fetchPrompts() {
  try {
    allPrompts = await req('/prompts');
    renderPromptCards(allPrompts);
  } catch (e) { console.error('Error fetching prompts:', e); }
}

function filterPrompts(type) {
  document.querySelectorAll('#promptTabs .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  if (type === 'all') renderPromptCards(allPrompts);
  else renderPromptCards(allPrompts.filter(p => p.prompt_type === type));
}

function renderPromptCards(prompts) {
  document.getElementById('promptCards').innerHTML = prompts.map(p => {
    const engines = [
      { name: 'ChatGPT', response: p.chatgpt_response, mentioned: p.brand_mentioned_chatgpt },
      { name: 'Claude', response: p.claude_response, mentioned: p.brand_mentioned_claude },
      { name: 'Gemini', response: p.gemini_response, mentioned: p.brand_mentioned_gemini },
    ];
    const mentionCount = engines.filter(e => e.mentioned).length;
    const captured = p.last_captured ? new Date(p.last_captured).toLocaleDateString() : 'Never';
    
    return `
      <div class="prompt-card" data-type="${p.prompt_type}">
        <div class="prompt-card-header">
          <div class="prompt-text">"${p.prompt_text}"</div>
          <span class="prompt-type-badge prompt-type-${p.prompt_type}">${p.prompt_type}</span>
        </div>
        <div style="padding:8px 20px;display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.01);border-bottom:1px solid var(--glass-border);">
          <div style="font-size:11px;color:var(--text-muted);">
            Brand mentioned in <strong style="color:${mentionCount >= 2 ? 'var(--success)' : mentionCount === 1 ? 'var(--warning)' : 'var(--danger)'}">${mentionCount}/3</strong> engines
            ${p.competitor_mentions ? ` · Competitors: <span style="color:var(--text-secondary)">${p.competitor_mentions}</span>` : ''}
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:10px;color:var(--text-muted);">Last: ${captured}</span>
            <button class="btn btn-sm btn-primary" onclick="capturePromptResponse(${p.id})" style="font-size:10px;padding:3px 10px;">🔄 Refresh</button>
          </div>
        </div>
        <div class="engine-response-grid">
          ${engines.map(e => `
            <div class="engine-cell">
              <div class="engine-name">
                <span class="mention-dot ${e.mentioned ? 'mention-yes' : 'mention-no'}"></span>
                ${e.name}
              </div>
              <div>${e.response || '<span style="color:var(--text-muted);font-style:italic;">Not captured yet</span>'}</div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }).join('');
}

async function addPrompt() {
  const prompt_text = document.getElementById('promptText').value.trim();
  const prompt_type = document.getElementById('promptType').value;
  if (!prompt_text) return showToast('Enter a prompt to track', 'error');
  
  try {
    await req('/prompts', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prompt_text, prompt_type }) });
    closeModal('promptModal');
    document.getElementById('promptText').value = '';
    showToast('Prompt added! Run a capture to get AI responses.');
    fetchPrompts();
  } catch (e) {
    showToast('Error adding prompt: ' + e.message, 'error');
  }
}

async function capturePromptResponse(id) {
  showToast('Capturing AI responses...', 'info');
  try {
    await req(`/prompts/${id}/capture`, { method: 'POST' });
    showToast('Responses captured!');
    fetchPrompts();
  } catch (e) {
    showToast('Error capturing: ' + e.message, 'error');
  }
}

async function suggestPrompts() {
  showToast('Getting AI prompt suggestions...', 'info');
  try {
    const res = await req('/prompts/suggest', { method: 'POST' });
    const suggestions = res.suggestions || [];
    document.getElementById('promptSuggestions').innerHTML = `
      <div class="card" style="margin-top:20px;">
        <div class="card-header"><h3>💡 Suggested Prompts to Track</h3></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${suggestions.map(s => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.01);border:1px solid var(--glass-border);border-radius:var(--radius-sm);">
                <div>
                  <span style="font-size:13px;color:var(--text-primary);">${s.prompt}</span>
                  <span class="prompt-type-badge prompt-type-${s.type}" style="margin-left:8px;">${s.type}</span>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="document.getElementById('promptText').value='${s.prompt.replace(/'/g, "\\'")}';document.getElementById('promptType').value='${s.type}';openModal('promptModal');">+ Track</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>`;
  } catch (e) {
    showToast('Error getting suggestions: ' + e.message, 'error');
  }
}

// ═══════════════════════════════════════
//  ENHANCED LEADS DASHBOARD MODULE
// ═══════════════════════════════════════
async function fetchLeadsDashboard() {
  try {
    const data = await req('/leads/dashboard');
    
    document.getElementById('leadsDashStats').innerHTML = `
      <div class="stat-card"><div class="stat-label">Total Leads</div><div class="stat-value" style="color:var(--accent);font-weight:800;font-size:28px;margin-top:5px;">${data.totalLeads}</div></div>
      <div class="stat-card"><div class="stat-label">🔥 Hot</div><div class="stat-value" style="color:#f87171;font-weight:800;font-size:28px;margin-top:5px;">${data.hotLeads}</div></div>
      <div class="stat-card"><div class="stat-label">☀️ Warm</div><div class="stat-value" style="color:var(--warning);font-weight:800;font-size:28px;margin-top:5px;">${data.warmLeads}</div></div>
      <div class="stat-card"><div class="stat-label">❄️ Cold</div><div class="stat-value" style="color:#60a5fa;font-weight:800;font-size:28px;margin-top:5px;">${data.coldLeads}</div></div>
      <div class="stat-card"><div class="stat-label">🤖 Bots Filtered</div><div class="stat-value" style="color:var(--text-muted);font-weight:800;font-size:28px;margin-top:5px;">${data.botCount}</div></div>
    `;
    
    // Channel attribution bars
    const channelColors = { organic: 'var(--success)', paid: 'var(--accent)', referral: '#8b5cf6', direct: 'var(--info)' };
    const maxChannel = Math.max(...(data.byChannel || []).map(c => c.count), 1);
    document.getElementById('channelBreakdown').innerHTML = (data.byChannel || []).map(c => `
      <div class="channel-bar">
        <div class="channel-bar-label" style="text-transform:capitalize;">${c.source_channel}</div>
        <div class="channel-bar-track">
          <div class="channel-bar-fill" style="width:${(c.count / maxChannel) * 100}%;background:${channelColors[c.source_channel] || 'var(--accent)'}"></div>
        </div>
        <div style="font-size:12px;font-weight:700;color:var(--text-primary);width:30px;text-align:right;">${c.count}</div>
      </div>
    `).join('');
    
    // Wasted spend
    fetchWastedSpend();
  } catch (e) { console.error('Error fetching leads dashboard:', e); }
}

async function fetchWastedSpend() {
  try {
    const data = await req('/leads/wasted-spend');
    if (!data.wasted || data.wasted.length === 0) {
      document.getElementById('wastedSpendBox').innerHTML = `
        <div style="text-align:center;padding:20px;">
          <span style="font-size:28px;">✅</span>
          <p style="color:var(--success);font-size:13px;margin-top:8px;">No wasted spend detected. All campaigns performing within thresholds.</p>
        </div>`;
      return;
    }
    document.getElementById('wastedSpendBox').innerHTML = `
      <div style="margin-bottom:12px;font-size:12px;color:var(--danger);font-weight:600;">⚠️ Total wasted: ₹${data.total_wasted.toLocaleString('en-IN')}</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${data.wasted.map(c => `
          <div class="wasted-alert">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${c.campaign_name}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${c.reason}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:14px;font-weight:700;color:var(--danger);">₹${parseFloat(c.spent || 0).toLocaleString('en-IN')}</div>
              <div style="font-size:10px;color:var(--text-muted);">ROAS: ${c.roas || '0'}x</div>
            </div>
          </div>
        `).join('')}
      </div>`;
  } catch (e) { console.error('Error fetching wasted spend:', e); }
}

async function askLeadsQuestion() {
  const question = document.getElementById('leadsQuestion').value.trim();
  if (!question) return;
  
  document.getElementById('leadsAnswer').innerHTML = `<div style="text-align:center;padding:20px;"><div class="spinner"></div><p style="margin-top:10px;color:var(--text-muted);font-size:12px;">Analysing your data...</p></div>`;
  
  try {
    const res = await req('/leads/ask', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ question }) });
    document.getElementById('leadsAnswer').innerHTML = `
      <div style="padding:16px;background:rgba(250,204,21,0.03);border:1px solid rgba(250,204,21,0.1);border-radius:var(--radius-sm);font-size:13px;line-height:1.6;color:var(--text-primary);">
        ${formatMarkdown(res.answer)}
      </div>`;
  } catch (e) {
    document.getElementById('leadsAnswer').innerHTML = `<p style="color:var(--danger);font-size:12px;">Error: ${e.message}</p>`;
  }
}
