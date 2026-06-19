/*
   TradeUNO Marketing Intelligence Dashboard Script
   Interactive Operations, Skeletons, and Chart.js Rendering
*/

// --- Global State ---
let currentTheme = localStorage.getItem('theme') || 'light';
let timePeriod = 'this-month';
let sortDirection = {};
let allKeywords = [
  { keyword: 'example services', volume: 1011, position: 7, confidence: 85, change: 3 },
  { keyword: 'best example', volume: 2551, position: 29, confidence: 35, change: -2 },
  { keyword: 'example pricing', volume: 1506, position: 3, confidence: 92, change: -4 },
  { keyword: 'fabrics online', volume: 4500, position: 12, confidence: 75, change: 8 },
  { keyword: 'premium linen', volume: 3200, position: 5, confidence: 88, change: 1 },
  { keyword: 'bulk cotton fabric', volume: 1800, position: 15, confidence: 60, change: -5 }
];

let lineChart = null;
let donutChart = null;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  // Apply Saved Theme
  document.documentElement.setAttribute('data-theme', currentTheme);
  const themeToggler = document.getElementById('themeToggler');
  if (themeToggler) {
    themeToggler.checked = (currentTheme === 'dark');
  }

  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Draw Charts
  initCharts();
});

// --- Theme Management ---
function toggleTheme() {
  currentTheme = (currentTheme === 'light') ? 'dark' : 'dark-theme-toggle';
  // Let's toggle values cleanly
  const toggler = document.getElementById('themeToggler');
  if (toggler.checked) {
    currentTheme = 'dark';
  } else {
    currentTheme = 'light';
  }
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);

  showToast(`Switched to ${currentTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
  
  // Re-draw/Update charts for contrast
  updateChartThemes();
}

// --- Alert Banner dismiss ---
function dismissAlert() {
  const banner = document.getElementById('globalAlert');
  if (banner) {
    banner.classList.add('hidden');
    showToast('Trial banner dismissed', 'info');
  }
}

// --- Navigation Tab Switching ---
function switchTab(el) {
  // Remove active state
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active state to clicked item
  el.classList.add('active');
  
  // Update header title
  const pageTitle = document.getElementById('pageTitle');
  const clickedTitle = el.querySelector('span').textContent;
  pageTitle.textContent = clickedTitle;
  
  showToast(`Navigated to ${clickedTitle}`, 'success');
}

// --- Data Filters & Period Controls ---
function changeTimePeriod() {
  const period = document.getElementById('timePeriod').value;
  timePeriod = period;
  
  // Animate values load
  const citations = document.getElementById('kpi-citations-val');
  const sessions = document.getElementById('kpi-sessions-val');
  const bounce = document.getElementById('kpi-bounce-val');
  const duration = document.getElementById('kpi-duration-val');
  
  // Add slight scaling animation
  [citations, sessions, bounce, duration].forEach(el => {
    el.style.transform = 'scale(0.9)';
    el.style.opacity = '0.5';
    el.style.transition = 'all 0.15s ease';
  });

  setTimeout(() => {
    if (period === 'this-month') {
      citations.textContent = '4,264';
      sessions.textContent = '5,716';
      bounce.textContent = '36%';
      duration.textContent = '4m 4s';
    } else if (period === 'last-month') {
      citations.textContent = '3,891';
      sessions.textContent = '5,230';
      bounce.textContent = '38.5%';
      duration.textContent = '3m 52s';
    } else {
      citations.textContent = '24,809';
      sessions.textContent = '35,114';
      bounce.textContent = '34.2%';
      duration.textContent = '4m 12s';
    }
    
    [citations, sessions, bounce, duration].forEach(el => {
      el.style.transform = 'scale(1)';
      el.style.opacity = '1';
    });
    
    // Simulate updating chart data
    randomizeChartData();
    showToast(`Data filtered by ${period.replace('-', ' ')}`, 'success');
  }, 200);
}

// --- Export & Refresh Data ---
function exportData() {
  showToast('Preparing report export... CSV download started!', 'success');
}

function refreshDashboard() {
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.classList.add('spin-anim');
  
  // Simulate loading metrics
  const cards = document.querySelectorAll('.kpi-card');
  cards.forEach(c => {
    c.style.opacity = '0.7';
  });
  
  setTimeout(() => {
    refreshBtn.classList.remove('spin-anim');
    cards.forEach(c => {
      c.style.opacity = '1';
    });
    
    // Randomize slightly
    randomizeChartData();
    showToast('Dashboard details refreshed successfully!', 'success');
  }, 1000);
}

// --- Live Table Keywords Search ---
function handleSearch() {
  const query = document.getElementById('searchBar').value.toLowerCase();
  const rows = document.querySelectorAll('#keywordTableBody tr');
  
  rows.forEach(row => {
    const kw = row.getAttribute('data-keyword').toLowerCase();
    if (kw.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// --- Table Sorting Logic ---
function sortTable(columnIndex) {
  const tableBody = document.getElementById('keywordTableBody');
  const rows = Array.from(tableBody.querySelectorAll('tr'));
  
  // Toggle Direction
  sortDirection[columnIndex] = !sortDirection[columnIndex];
  const isAscending = sortDirection[columnIndex];
  
  rows.sort((rowA, rowB) => {
    let cellA = rowA.cells[columnIndex].textContent.trim();
    let cellB = rowB.cells[columnIndex].textContent.trim();
    
    // Convert to numbers if volume, position, change
    if (columnIndex === 1) { // Volume
      cellA = parseInt(cellA.replace(/,/g, ''));
      cellB = parseInt(cellB.replace(/,/g, ''));
    } else if (columnIndex === 2) { // Position
      cellA = parseInt(cellA.replace('#', ''));
      cellB = parseInt(cellB.replace('#', ''));
    } else if (columnIndex === 4) { // Change
      cellA = parseInt(cellA.replace(/[+ \-]/g, ''));
      cellB = parseInt(cellB.replace(/[+ \-]/g, ''));
    }
    
    if (cellA < cellB) return isAscending ? -1 : 1;
    if (cellA > cellB) return isAscending ? 1 : -1;
    return 0;
  });
  
  // Re-append rows
  rows.forEach(r => tableBody.appendChild(r));
  showToast(`Sorted table columns`, 'info');
}

// --- AI Insights Generator ---
function generateAIInsight() {
  const container = document.getElementById('adviceContainer');
  
  // Create Skeleton Loading widget
  const skeletonCard = document.createElement('div');
  skeletonCard.className = 'advice-card skeleton-container';
  skeletonCard.style.pointerEvents = 'none';
  skeletonCard.innerHTML = `
    <div class="skeleton skeleton-circle"></div>
    <div class="advice-details" style="width: 80%;">
      <div class="skeleton skeleton-title" style="margin-bottom:6px;"></div>
      <div class="skeleton skeleton-text" style="width: 90%;"></div>
    </div>
  `;
  container.prepend(skeletonCard);
  
  showToast('AI analyzing keyword gaps...', 'info');

  setTimeout(() => {
    // Remove skeleton
    skeletonCard.remove();
    
    // New advice items
    const newAdvice = [
      {
        title: "Target 'fabrics online' rank gap",
        desc: "Acompetitor is winning Organic Share on 'fabrics online'. Launching an ad target here could retrieve 400+ sessions/week.",
        icon: "target"
      },
      {
        title: "Optimize LSI Keywords",
        desc: "Add 'cotton bulk order' and 'sustainable linen' headings to your collection pages to climb from #15 to top #5 in Google AI Overview.",
        icon: "sparkles"
      }
    ];
    
    const selected = newAdvice[Math.floor(Math.random() * newAdvice.length)];
    
    const adviceNode = document.createElement('div');
    adviceNode.className = 'advice-card';
    adviceNode.innerHTML = `
      <div class="advice-icon-wrap">
        <i data-lucide="${selected.icon}" size="14"></i>
      </div>
      <div class="advice-details">
        <span class="advice-title">${selected.title}</span>
        <span class="advice-desc">${selected.desc}</span>
      </div>
    `;
    
    container.prepend(adviceNode);
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    showToast('New AI suggestion generated!', 'success');
  }, 1200);
}

// --- Website Add Modal Logic ---
function openAddSiteModal() {
  document.getElementById('addSiteModal').classList.add('open');
}

function closeAddSiteModal() {
  document.getElementById('addSiteModal').classList.remove('open');
}

function handleAddSite(event) {
  event.preventDefault();
  const url = document.getElementById('siteUrl').value;
  const name = document.getElementById('siteName').value || url;
  
  showToast(`Verifying domain integrity for ${name}...`, 'info');
  
  setTimeout(() => {
    closeAddSiteModal();
    document.getElementById('addSiteForm').reset();
    showToast(`Successfully registered ${name}! Tracking started.`, 'success');
  }, 1000);
}

// --- View All Keywords Modal ---
function openAllKeywordsModal(event) {
  event.preventDefault();
  const tbody = document.getElementById('modalKeywordsBody');
  tbody.innerHTML = '';
  
  allKeywords.forEach(kw => {
    const changeClass = kw.change > 0 ? 'positive' : 'negative';
    const changeSign = kw.change > 0 ? '+' : '';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="table-keyword">${kw.keyword}</td>
      <td>${kw.volume.toLocaleString()}</td>
      <td class="table-pos">#${kw.position}</td>
      <td>
        <span class="change-badge ${changeClass}">
          ${changeSign}${kw.change}
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  document.getElementById('allKeywordsModal').classList.add('open');
}

function closeAllKeywordsModal() {
  document.getElementById('allKeywordsModal').classList.remove('remove');
  document.getElementById('allKeywordsModal').classList.remove('open');
}

function handleModalFilter() {
  const query = document.getElementById('modalFilter').value.toLowerCase();
  const rows = document.querySelectorAll('#modalKeywordsBody tr');
  
  rows.forEach(row => {
    const kw = row.cells[0].textContent.toLowerCase();
    if (kw.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// --- Toast & Alerts Helper ---
function showToast(message, type = 'success') {
  const toast = document.getElementById('toastWidget');
  const toastText = document.getElementById('toastText');
  toastText.textContent = message;
  
  // Set Icon Based on Type
  const icon = toast.querySelector('i');
  if (type === 'success') {
    icon.setAttribute('data-lucide', 'check-circle');
    icon.style.color = 'var(--trend-up)';
  } else if (type === 'info') {
    icon.setAttribute('data-lucide', 'info');
    icon.style.color = 'var(--accent)';
  } else {
    icon.setAttribute('data-lucide', 'alert-triangle');
    icon.style.color = 'var(--trend-down)';
  }
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function openPricing() {
  showToast('Pricing plans modal starting (redirecting to checkout)...', 'info');
}

function triggerNotification() {
  showToast('No new notifications today. You are fully up to date!', 'info');
  const badge = document.querySelector('.badge-dot');
  if (badge) badge.style.display = 'none';
}

// --- Chart.js Drawers ---
function initCharts() {
  // Chart Colors Setup
  const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
  const gridColor = isDark ? '#27272a' : '#e2e8f0';
  const textColor = isDark ? '#a1a1aa' : '#64748b';

  // 1. Line Chart: AI Visibility
  const ctxLine = document.getElementById('lineChart').getContext('2d');
  
  // Create Gradient backgrounds
  const gradient1 = ctxLine.createLinearGradient(0, 0, 0, 260);
  gradient1.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
  gradient1.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
  
  const gradient2 = ctxLine.createLinearGradient(0, 0, 0, 260);
  gradient2.addColorStop(0, 'rgba(165, 180, 252, 0.4)');
  gradient2.addColorStop(1, 'rgba(165, 180, 252, 0.0)');

  lineChart = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: Array.from({length: 10}, (_, i) => `Dec ${3 * i + 1}`),
      datasets: [
        {
          label: 'Users',
          data: [150, 180, 220, 190, 250, 280, 310, 290, 350, 420],
          borderColor: '#6366f1',
          backgroundColor: gradient1,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#6366f1'
        },
        {
          label: 'Sessions',
          data: [200, 250, 310, 280, 340, 390, 420, 380, 470, 570],
          borderColor: '#a5b4fc',
          backgroundColor: gradient2,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Poppins', size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Poppins', size: 10 } }
        }
      }
    }
  });

  // 2. Donut Chart: Source Share
  const ctxDonut = document.getElementById('donutChart').getContext('2d');
  donutChart = new Chart(ctxDonut, {
    type: 'doughnut',
    data: {
      labels: ['Organic', 'Social', 'Direct', 'Referral'],
      datasets: [{
        data: [2151, 1452, 1134, 564],
        backgroundColor: ['#6366f1', '#a5b4fc', '#fb7185', '#34d399'],
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#18181b' : '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '80%',
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function randomizeChartData() {
  if (!lineChart || !donutChart) return;
  
  // Random line values
  lineChart.data.datasets[0].data = lineChart.data.datasets[0].data.map(val => Math.floor(val * (0.9 + Math.random() * 0.25)));
  lineChart.data.datasets[1].data = lineChart.data.datasets[1].data.map(val => Math.floor(val * (0.9 + Math.random() * 0.25)));
  lineChart.update();
  
  // Random donut values
  donutChart.data.datasets[0].data = donutChart.data.datasets[0].data.map(val => Math.floor(val * (0.9 + Math.random() * 0.2)));
  donutChart.update();
}

function updateChartThemes() {
  if (!lineChart || !donutChart) return;
  
  const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
  const gridColor = isDark ? '#27272a' : '#e2e8f0';
  const textColor = isDark ? '#a1a1aa' : '#64748b';
  
  // Update line scales
  lineChart.options.scales.x.grid.color = gridColor;
  lineChart.options.scales.x.ticks.color = textColor;
  lineChart.options.scales.y.grid.color = gridColor;
  lineChart.options.scales.y.ticks.color = textColor;
  lineChart.update();
  
  // Update donut borders
  donutChart.data.datasets[0].borderColor = isDark ? '#18181b' : '#ffffff';
  donutChart.data.datasets[0].borderWidth = isDark ? 2 : 1;
  donutChart.update();
}
