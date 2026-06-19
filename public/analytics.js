/*
   TradeUNO Analytics Script
   Empty Metric States, Latency Simulators, and Chart.js Integrations
*/

// --- State Variables ---
let currentTheme = localStorage.getItem('theme') || 'light';
let activeTab = 'ga';
let isSynced = false;
let chartInstance = null;
let timePeriod = 'this-month';

// Sample Synced Datasets
const syncData = {
  ga: {
    metrics: {
      users: '8,412',
      newUsers: '6,104',
      sessions: '11,260',
      views: '28,450',
      bounce: '41.2%',
      duration: '3m 48s',
      engagement: '68.5%',
      pages: '2.5'
    },
    pages: [
      { path: '/collections/linen', views: '12,450' },
      { path: '/collections/cotton', views: '8,210' },
      { path: '/product/premium-white', views: '4,560' },
      { path: '/', views: '2,130' },
      { path: '/about', views: '1,100' }
    ],
    chart: {
      labels: ['Dec 1', 'Dec 6', 'Dec 11', 'Dec 16', 'Dec 21', 'Dec 26', 'Dec 30'],
      users: [120, 240, 310, 480, 520, 710, 850],
      sessions: [180, 320, 440, 610, 690, 880, 1100]
    }
  },
  gsc: {
    metrics: {
      users: '4,105', // representing Clicks
      newUsers: '3,210',
      sessions: '6,200', // representing Impressions
      views: '25,120',
      bounce: '3.4%', // representing CTR
      duration: '14.2', // representing Avg Position
      engagement: '74.2%',
      pages: '1.9'
    },
    pages: [
      { path: '/collections/wool', views: '5,120' },
      { path: '/collections/silk', views: '3,890' },
      { path: '/product/luxury-cashmere', views: '2,100' },
      { path: '/blog/summer-fabrics', views: '950' }
    ],
    chart: {
      labels: ['Dec 1', 'Dec 6', 'Dec 11', 'Dec 16', 'Dec 21', 'Dec 26', 'Dec 30'],
      users: [80, 150, 200, 280, 310, 390, 450],
      sessions: [110, 210, 290, 390, 430, 550, 620]
    }
  },
  seo: {
    metrics: {
      users: '68', // SEO Authority Score
      newUsers: '82', // Backlinks Authority
      sessions: '142', // Referring Domains
      views: '12', // Ranking Keywords
      bounce: '22%', // Crawl Errors
      duration: '2.1s', // Page Load Time
      engagement: '92.4%', // Mobile usability score
      pages: '4.8' // Schema markup index
    },
    pages: [
      { path: '/collections/denim', views: '1,420' },
      { path: '/blog/indigo-dye', views: '810' }
    ],
    chart: {
      labels: ['Dec 1', 'Dec 6', 'Dec 11', 'Dec 16', 'Dec 21', 'Dec 26', 'Dec 30'],
      users: [40, 45, 52, 58, 62, 65, 68],
      sessions: [60, 65, 70, 75, 79, 81, 82]
    }
  }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved Theme
  document.documentElement.setAttribute('data-theme', currentTheme);
  const toggler = document.getElementById('themeToggler');
  if (toggler) toggler.checked = (currentTheme === 'dark');

  // Load Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// --- Theme Controls ---
function toggleTheme() {
  const toggler = document.getElementById('themeToggler');
  currentTheme = toggler.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  showToast(`Switched to ${currentTheme === 'dark' ? 'Dark' : 'Light'} theme`, 'info');

  if (isSynced && chartInstance) {
    updateChartTheme();
  }
}

// --- Dismiss Banner ---
function dismissBanner() {
  const banner = document.getElementById('trialAlert');
  if (banner) {
    banner.classList.add('hidden');
    showToast('Trial notification banner dismissed', 'info');
  }
}

// --- Navigation Tabs ---
function switchSourceTab(source) {
  if (activeTab === source) return;
  
  // Update Active Class
  document.querySelectorAll('.tab-pill').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`tab-${source}`).classList.add('active');
  
  activeTab = source;
  showToast(`Navigated to ${source.toUpperCase()} view`, 'info');

  if (isSynced) {
    // If already synced, show loading skeletons before swapping data
    loadSyncedDataWithTransition();
  }
}

// --- Time Period Changes ---
function changeTimePeriod() {
  const period = document.getElementById('timeSelect').value;
  timePeriod = period;
  
  if (isSynced) {
    loadSyncedDataWithTransition();
  } else {
    showToast(`Placeholder filter applied for ${period.replace('-', ' ')}`, 'info');
  }
}

// --- Modal Handlers ---
function openAddSiteModal() {
  document.getElementById('addSiteModal').classList.add('open');
}

function closeAddSiteModal() {
  document.getElementById('addSiteModal').classList.remove('open');
}

// --- Sync Submit simulation ---
function handleSyncSubmit(event) {
  event.preventDefault();
  const url = document.getElementById('domainUrl').value;
  const source = document.getElementById('integrationSource').value;
  
  closeAddSiteModal();
  showToast(`Initiating data sync for ${url}...`, 'info');
  
  // Transition into skeleton loading phase
  triggerLoadingPhase(() => {
    isSynced = true;
    loadSyncedData();
    showToast(`Successfully synced ${url} metrics!`, 'success');
  });
}

// --- Refresh Dashboard Trigger ---
function triggerRefresh() {
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn.classList.add('spin-anim');
  
  if (isSynced) {
    triggerLoadingPhase(() => {
      refreshBtn.classList.remove('spin-anim');
      randomizeActiveData();
      showToast('Analytics dashboard refreshed', 'success');
    });
  } else {
    setTimeout(() => {
      refreshBtn.classList.remove('spin-anim');
      showToast('Synced source status checked (No integrations found).', 'info');
    }, 1000);
  }
}

// --- Shimmer Skeleton Loader Simulation ---
function triggerLoadingPhase(callback) {
  const cards = document.querySelectorAll('.kpi-card');
  const chartWrapper = document.getElementById('chartArea');
  const pagesWrapper = document.getElementById('pagesArea');
  const pagesList = document.getElementById('pagesList');
  const canvas = document.getElementById('analyticsChart');

  // Convert cards to skeleton wrappers
  cards.forEach(card => {
    const title = card.querySelector('.kpi-card-title').textContent;
    card.setAttribute('data-prev-title', title);
    card.innerHTML = `
      <div class="kpi-card-header">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-icon"></div>
      </div>
      <div class="skeleton skeleton-value"></div>
      <div class="skeleton skeleton-text" style="width: 70%; margin-top:6px;"></div>
    `;
    card.classList.add('skeleton-container');
  });

  // Hide Chart content and show shimmer
  if (canvas) canvas.style.display = 'none';
  const watermark = document.getElementById('chartWatermark');
  if (watermark) watermark.style.display = 'none';
  
  const chartShimmer = document.createElement('div');
  chartShimmer.id = 'chartShimmer';
  chartShimmer.className = 'skeleton';
  chartShimmer.style.width = '100%';
  chartShimmer.style.height = '100%';
  chartShimmer.style.borderRadius = 'var(--radius-md)';
  chartWrapper.appendChild(chartShimmer);

  // Hide Top Pages content and show shimmer
  if (pagesWrapper) pagesWrapper.style.display = 'none';
  if (pagesList) pagesList.style.display = 'none';
  
  const pagesShimmer = document.createElement('div');
  pagesShimmer.id = 'pagesShimmer';
  pagesShimmer.className = 'skeleton';
  pagesShimmer.style.width = '100%';
  pagesShimmer.style.height = '100%';
  pagesShimmer.style.borderRadius = 'var(--radius-md)';
  pagesShimmer.style.minHeight = '200px';
  document.getElementById('pagesArea').parentNode.appendChild(pagesShimmer);

  // Let shimmer pulse for 1.8 seconds
  setTimeout(() => {
    // Remove shimmers
    const cShimmer = document.getElementById('chartShimmer');
    if (cShimmer) cShimmer.remove();
    
    const pShimmer = document.getElementById('pagesShimmer');
    if (pShimmer) pShimmer.remove();

    callback();
  }, 1500);
}

// --- Sync Data Loader ---
function loadSyncedData() {
  const current = syncData[activeTab];
  
  // 1. Re-render KPI cards
  renderKPICards(current.metrics);
  
  // 2. Render Canvas Chart
  renderChartWidget(current.chart);
  
  // 3. Render Top Pages list
  renderTopPagesList(current.pages);
}

function loadSyncedDataWithTransition() {
  triggerLoadingPhase(() => {
    loadSyncedData();
  });
}

function renderKPICards(metrics) {
  const kpiDefs = [
    { id: 'kpi-users', title: 'Total Users', value: metrics.users, caption: 'Synced via GA4', icon: 'users' },
    { id: 'kpi-new-users', title: 'New Users', value: metrics.newUsers, caption: 'Synced via GA4', icon: 'user-plus' },
    { id: 'kpi-sessions', title: 'Sessions', value: metrics.sessions, caption: 'Synced via GA4', icon: 'mouse-pointer-click' },
    { id: 'kpi-views', title: 'Pageviews', value: metrics.views, caption: 'Synced via GA4', icon: 'eye' },
    { id: 'kpi-bounce', title: 'Bounce Rate', value: metrics.bounce, caption: 'Lower is better', icon: 'activity' },
    { id: 'kpi-duration', title: 'Avg. Duration', value: metrics.duration, caption: 'Synced via GA4', icon: 'clock' },
    { id: 'kpi-engagement', title: 'Engagement Rate', value: metrics.engagement, caption: 'Synced via GA4', icon: 'gauge' },
    { id: 'kpi-pages-session', title: 'Pages/Session', value: metrics.pages, caption: 'Synced via GA4', icon: 'layers' }
  ];

  // Adjust metric captions based on source console
  if (activeTab === 'gsc') {
    kpiDefs[0].title = 'Total Clicks';
    kpiDefs[2].title = 'Total Impressions';
    kpiDefs[4].title = 'Avg. CTR';
    kpiDefs[4].caption = 'Higher is better';
    kpiDefs[5].title = 'Avg. Position';
  } else if (activeTab === 'seo') {
    kpiDefs[0].title = 'Authority Score';
    kpiDefs[0].caption = 'Out of 100';
    kpiDefs[1].title = 'Backlink Index';
    kpiDefs[2].title = 'Ref. Domains';
    kpiDefs[3].title = 'Rank Keywords';
    kpiDefs[4].title = 'Crawl Errors';
    kpiDefs[5].title = 'Page Speed';
    kpiDefs[6].title = 'Mobile usability';
    kpiDefs[7].title = 'Schema markup';
  }

  kpiDefs.forEach(def => {
    const card = document.getElementById(def.id);
    card.className = 'kpi-card';
    card.innerHTML = `
      <div class="kpi-card-header">
        <span class="kpi-card-title">${def.title}</span>
        <i data-lucide="${def.icon}" size="14" class="kpi-card-icon"></i>
      </div>
      <span class="kpi-card-value">${def.value}</span>
      <span class="kpi-card-caption">${def.caption}</span>
    `;
  });

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// --- Chart rendering ---
function renderChartWidget(chartData) {
  const canvas = document.getElementById('analyticsChart');
  canvas.style.display = 'block';
  
  const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
  const gridColor = isDark ? '#27272a' : '#e2e8f0';
  const textColor = isDark ? '#a1a1aa' : '#64748b';

  const ctx = canvas.getContext('2d');
  
  // Destroy previous instances if any
  if (chartInstance) {
    chartInstance.destroy();
  }

  const gradient1 = ctx.createLinearGradient(0, 0, 0, 240);
  gradient1.addColorStop(0, 'rgba(250, 204, 21, 0.4)');
  gradient1.addColorStop(1, 'rgba(250, 204, 21, 0.0)');

  const gradient2 = ctx.createLinearGradient(0, 0, 0, 240);
  gradient2.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
  gradient2.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: activeTab === 'gsc' ? 'Clicks' : 'Users',
          data: chartData.users,
          borderColor: '#facc15',
          backgroundColor: gradient1,
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 2,
          pointBackgroundColor: '#facc15'
        },
        {
          label: activeTab === 'gsc' ? 'Impressions' : 'Sessions',
          data: chartData.sessions,
          borderColor: '#f59e0b',
          backgroundColor: gradient2,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          borderDash: [4, 4]
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
}

function updateChartTheme() {
  if (!chartInstance) return;
  const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');
  const gridColor = isDark ? '#27272a' : '#e2e8f0';
  const textColor = isDark ? '#a1a1aa' : '#64748b';

  chartInstance.options.scales.x.grid.color = gridColor;
  chartInstance.options.scales.x.ticks.color = textColor;
  chartInstance.options.scales.y.grid.color = gridColor;
  chartInstance.options.scales.y.ticks.color = textColor;
  chartInstance.update();
}

// --- Render Top Synced Pages ---
function renderTopPagesList(pages) {
  const pagesArea = document.getElementById('pagesArea');
  pagesArea.style.display = 'none';
  
  const pagesList = document.getElementById('pagesList');
  pagesList.style.display = 'flex';
  pagesList.innerHTML = '';
  
  pages.forEach(p => {
    const node = document.createElement('div');
    node.className = 'page-list-item';
    node.innerHTML = `
      <span class="page-path">${p.path}</span>
      <span class="page-views-badge">${p.views.toLocaleString()}</span>
    `;
    pagesList.appendChild(node);
  });
}

// --- Randomize Active Data ---
function randomizeActiveData() {
  const metrics = syncData[activeTab].metrics;
  
  // Select values and random shifts
  const shiftVal = (val) => Math.floor(parseInt(val.replace(/,/g, '')) * (0.95 + Math.random() * 0.1)).toLocaleString();
  
  document.querySelector('#kpi-users .kpi-card-value').textContent = shiftVal(metrics.users);
  document.querySelector('#kpi-new-users .kpi-card-value').textContent = shiftVal(metrics.newUsers);
  document.querySelector('#kpi-sessions .kpi-card-value').textContent = shiftVal(metrics.sessions);
  document.querySelector('#kpi-views .kpi-card-value').textContent = shiftVal(metrics.views);

  if (chartInstance) {
    chartInstance.data.datasets[0].data = chartInstance.data.datasets[0].data.map(v => Math.floor(v * (0.9 + Math.random() * 0.2)));
    chartInstance.data.datasets[1].data = chartInstance.data.datasets[1].data.map(v => Math.floor(v * (0.9 + Math.random() * 0.2)));
    chartInstance.update();
  }
}

// --- Search Handler ---
function handleSearch() {
  const query = document.getElementById('searchField').value.toLowerCase();
  
  if (isSynced) {
    const listItems = document.querySelectorAll('.page-list-item');
    listItems.forEach(item => {
      const path = item.querySelector('.page-path').textContent.toLowerCase();
      if (path.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }
}

// --- Global helper triggers ---
function showToast(message, type = 'success') {
  const toast = document.getElementById('toastWidget');
  const toastText = document.getElementById('toastText');
  toastText.textContent = message;

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

function triggerPricing() {
  showToast('Pricing checkout loading...', 'info');
}

function triggerNotification() {
  showToast('No new notifications', 'info');
}
