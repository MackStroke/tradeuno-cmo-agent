require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'tradeuno_cmo.db');
const _db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('DB open error:', err.message); process.exit(1); }
});

// ─── Promise Helpers ───
// Mimics better-sqlite3 API with prepare().get/all/run
// Returns an object with synchronous-feeling async wrappers

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    _db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    _db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    _db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Compatibility shim: db.prepare(sql).get/all/run — returns sync-style object
// These return promises, so callers must await them
const db = {
  prepare: (sql) => ({
    get: (...params) => dbGet(sql, params.flat()),
    all: (...params) => dbAll(sql, params.flat()),
    run: (...params) => dbRun(sql, params.flat()),
  }),
  exec: (sql) => new Promise((resolve, reject) => {
    _db.exec(sql, (err) => { if (err) reject(err); else resolve(); });
  }),
};

// ─── Init DB ───
async function initDB() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      department TEXT DEFAULT 'Marketing',
      avatar_color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to INTEGER,
      assigned_by INTEGER,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      score INTEGER DEFAULT 0,
      ai_feedback TEXT,
      proof_file TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS competitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      website TEXT,
      instagram TEXT,
      category TEXT DEFAULT 'Direct',
      notes TEXT,
      last_analyzed DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS competitor_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competitor_id INTEGER,
      insight_type TEXT,
      content TEXT NOT NULL,
      ai_generated INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS content_ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      script TEXT,
      hashtags TEXT,
      platform TEXT DEFAULT 'instagram',
      status TEXT DEFAULT 'idea',
      engagement_prediction TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS social_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      account_name TEXT,
      account_id TEXT,
      access_token TEXT,
      connected INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      media_file TEXT,
      status TEXT DEFAULT 'draft',
      scheduled_at DATETIME,
      posted_at DATETIME,
      uploaded_by INTEGER,
      approved_by INTEGER,
      approval_status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      type TEXT DEFAULT 'b2c',
      source TEXT,
      status TEXT DEFAULT 'new',
      score INTEGER DEFAULT 0,
      notes TEXT,
      assigned_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      meta_description TEXT,
      keywords TEXT,
      status TEXT DEFAULT 'draft',
      author_id INTEGER,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS video_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT,
      ai_suggestions TEXT,
      editor_id INTEGER,
      status TEXT DEFAULT 'in_progress',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      summary TEXT,
      team_performance TEXT,
      social_metrics TEXT,
      ad_metrics TEXT,
      shopify_metrics TEXT,
      ai_insights TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS meta_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_name TEXT NOT NULL,
      campaign_id TEXT,
      platform TEXT DEFAULT 'meta',
      budget REAL,
      spent REAL DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      cpc REAL DEFAULT 0,
      roas REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      ai_suggestions TEXT,
      date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS shopify_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_type TEXT NOT NULL,
      data_json TEXT NOT NULL,
      date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      module TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS citation_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      score INTEGER DEFAULT 0,
      platform_breakdown TEXT,
      week_label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS citation_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL,
      platform TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS content_briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      brief_json TEXT NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_gap_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      monthly_volume INTEGER DEFAULT 0,
      ranking_competitor TEXT,
      competitor_position INTEGER DEFAULT 0,
      engines_won TEXT,
      fix_plan TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS prompt_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_text TEXT NOT NULL,
      prompt_type TEXT DEFAULT 'branded',
      chatgpt_response TEXT,
      claude_response TEXT,
      gemini_response TEXT,
      brand_mentioned_chatgpt INTEGER DEFAULT 0,
      brand_mentioned_claude INTEGER DEFAULT 0,
      brand_mentioned_gemini INTEGER DEFAULT 0,
      competitor_mentions TEXT,
      last_captured DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─── Seed Default Data ───
  const adminExists = await db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await db.prepare('INSERT INTO users (name, email, password, role, department, avatar_color) VALUES (?, ?, ?, ?, ?, ?)')
      .run('CMO Admin', 'admin@tradeuno.com', hashedPassword, 'admin', 'Marketing', '#6366f1');

    const memberPass = bcrypt.hashSync('team123', 10);
    const members = [
      ['Priya Sharma', 'priya@tradeuno.com', 'Social Media', '#ec4899'],
      ['Rahul Verma', 'rahul@tradeuno.com', 'Content', '#f59e0b'],
      ['Anita Singh', 'anita@tradeuno.com', 'Video Editing', '#10b981'],
      ['Karan Patel', 'karan@tradeuno.com', 'Sales', '#3b82f6'],
      ['Meera Joshi', 'meera@tradeuno.com', 'Design', '#8b5cf6'],
    ];
    for (const m of members) {
      await db.prepare("INSERT OR IGNORE INTO users (name, email, password, role, department, avatar_color) VALUES (?, ?, ?, 'member', ?, ?)")
        .run(m[0], m[1], memberPass, m[2], m[3]);
    }

    const tasks = [
      ['Create Instagram Reel - Summer Collection', 'Design and shoot a 30-second reel showcasing the new summer fabric collection', 2, 1, 'in_progress', 'high', '2026-06-10'],
      ['Write Blog Post - Fabric Care Tips', 'Research and write a 1000-word blog about caring for premium fabrics', 3, 1, 'pending', 'medium', '2026-06-08'],
      ['Edit Product Video - Silk Range', 'Edit the raw footage into a polished 60-second product video', 4, 1, 'in_progress', 'high', '2026-06-07'],
      ['Generate B2B Lead List - Mumbai', 'Research and compile a list of potential B2B clients in Mumbai region', 5, 1, 'completed', 'high', '2026-06-05'],
      ['Design Festival Campaign Creatives', 'Create social media creatives for the upcoming festival season campaign', 6, 1, 'pending', 'medium', '2026-06-12'],
    ];
    for (const t of tasks) {
      await db.prepare('INSERT INTO tasks (title, description, assigned_to, assigned_by, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(...t);
    }

    const competitors = [
      ['Raymond Fabrics', 'https://www.raymond.in', '@raymond_official', 'Direct'],
      ['Arvind Limited', 'https://www.arvind.com', '@arvindltd', 'Direct'],
      ['Bombay Dyeing', 'https://www.bombaydyeing.com', '@bombaydyeing', 'Direct'],
      ['Siyarams', 'https://www.siyaram.com', '@siyarams_official', 'Indirect'],
    ];
    for (const c of competitors) {
      await db.prepare('INSERT INTO competitors (name, website, instagram, category) VALUES (?, ?, ?, ?)').run(...c);
    }

    const ideas = [
      ['reel', 'Behind the Scenes - Weaving Process', 'Show the intricate weaving process of our premium fabrics.', '#fabriclife #handwoven #tradeuno', 'instagram', 'approved'],
      ['reel', 'Fabric Drape Test - Silk vs Cotton', 'Side-by-side comparison of how our fabrics drape.', '#fabricquality #silk #cotton #tradeuno', 'instagram', 'idea'],
      ['post', '5 Ways to Style Linen This Summer', 'Carousel post with styling tips for linen fabrics.', '#linenstyle #summerfashion #tradeuno', 'instagram', 'idea'],
    ];
    for (const i of ideas) {
      await db.prepare('INSERT INTO content_ideas (type, title, script, hashtags, platform, status) VALUES (?, ?, ?, ?, ?, ?)').run(...i);
    }    const accounts = [
      ['instagram', '@tradeuno_fabrics', 'ig_001', 'token_ig_123', 1],
      ['youtube', 'TradeUno Fabrics', 'yt_001', 'token_yt_123', 1]
    ];
    for (const a of accounts) {
      await db.prepare('INSERT INTO social_accounts (platform, account_name, account_id, access_token, connected) VALUES (?,?,?,?,?)').run(...a);
    }


    const campaigns = [
      ['Summer Collection Launch', 'camp_001', 50000, 32450, 145000, 3200, 89, 2.21, 10.14, 3.2, 'active', '2026-06-01'],
      ['B2B Wholesale Outreach', 'camp_002', 30000, 18900, 78000, 1850, 42, 2.37, 10.22, 2.8, 'active', '2026-06-01'],
      ['Festival Season Pre-booking', 'camp_003', 75000, 45200, 220000, 5600, 156, 2.55, 8.07, 4.1, 'active', '2026-06-01'],
    ];
    for (const c of campaigns) {
      await db.prepare('INSERT INTO meta_campaigns (campaign_name, campaign_id, budget, spent, impressions, clicks, conversions, ctr, cpc, roas, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...c);
    }

    const leads = [
      ['Amit Textile House', 'amit@textilehouse.com', '+91 98765 43210', 'Amit Textile House', 'b2b', 'Website', 'new', 85],
      ['Sunita Boutique', 'sunita@boutique.com', '+91 87654 32109', 'Sunita Designer Boutique', 'b2b', 'Instagram', 'contacted', 72],
      ['Rajesh Kumar', 'rajesh.k@gmail.com', '+91 76543 21098', '', 'b2c', 'Store Visit', 'qualified', 65],
      ['Fashion Forward Store', 'ff@store.com', '+91 65432 10987', 'Fashion Forward', 'b2b', 'Referral', 'new', 90],
    ];
    for (const l of leads) {
      await db.prepare('INSERT INTO leads (name, email, phone, company, type, source, status, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(...l);
    }

    const sampleOrders = [
      { id: 1001, total_price: '12500.00', financial_status: 'paid', customer: { first_name: 'Aarav', city: 'Mumbai' } },
      { id: 1002, total_price: '4500.00', financial_status: 'paid', customer: { first_name: 'Riya', city: 'Delhi' } },
      { id: 1003, total_price: '18000.00', financial_status: 'paid', customer: { first_name: 'Kabir', city: 'Bangalore' } },
    ];
    await db.prepare('INSERT INTO shopify_data (data_type, data_json, date) VALUES (?,?,?)')
      .run('real_orders', JSON.stringify(sampleOrders), new Date().toISOString().split('T')[0]);

    // ─── Seed Citation Scores ───
    const citationWeeks = [
      [42, 'W1 May', JSON.stringify({google_ai: 35, chatgpt: 28, claude: 15, gemini: 55, perplexity: 10, bing_copilot: 20})],
      [48, 'W2 May', JSON.stringify({google_ai: 40, chatgpt: 32, claude: 20, gemini: 60, perplexity: 15, bing_copilot: 25})],
      [53, 'W3 May', JSON.stringify({google_ai: 45, chatgpt: 38, claude: 28, gemini: 62, perplexity: 22, bing_copilot: 30})],
      [58, 'W4 May', JSON.stringify({google_ai: 50, chatgpt: 45, claude: 35, gemini: 65, perplexity: 28, bing_copilot: 38})],
      [61, 'W1 Jun', JSON.stringify({google_ai: 55, chatgpt: 50, claude: 38, gemini: 68, perplexity: 32, bing_copilot: 42})],
      [67, 'W2 Jun', JSON.stringify({google_ai: 60, chatgpt: 55, claude: 45, gemini: 72, perplexity: 40, bing_copilot: 50})],
    ];
    for (const c of citationWeeks) {
      await db.prepare('INSERT INTO citation_scores (score, week_label, platform_breakdown) VALUES (?,?,?)').run(...c);
    }

    const citTasks = [
      ['Get listed on G2 and Capterra review platforms', 'Google AI', 'high'],
      ['Add structured FAQ schema to top 10 landing pages', 'ChatGPT', 'critical'],
      ['Publish thought leadership article on fabric industry trends', 'Claude', 'medium'],
      ['Claim and optimise Google Business Profile with weekly posts', 'Gemini', 'high'],
      ['Earn backlinks from 3 textile industry publications', 'Perplexity', 'critical'],
      ['Create comparison page: TradeUno vs top 3 competitors', 'Bing Copilot', 'medium'],
    ];
    for (const ct of citTasks) {
      await db.prepare('INSERT INTO citation_tasks (task, platform, priority) VALUES (?,?,?)').run(...ct);
    }

    // ─── Seed AI Gap Items ───
    const gapItems = [
      ['best premium fabric brands india', 'critical', 12400, 'Raymond Fabrics', 2, 'ChatGPT, Gemini, Perplexity'],
      ['luxury cotton fabric wholesale mumbai', 'critical', 8800, 'Arvind Limited', 1, 'ChatGPT, Claude'],
      ['premium linen fabric online india', 'high', 6200, 'Bombay Dyeing', 3, 'Gemini, Google AI'],
      ['silk fabric suppliers for designers', 'high', 4500, 'Siyarams', 2, 'ChatGPT, Perplexity'],
      ['sustainable fabric brands india 2026', 'high', 3800, 'Raymond Fabrics', 1, 'Claude, Gemini, Bing'],
      ['wedding fabric collection premium', 'medium', 2900, 'Bombay Dyeing', 4, 'ChatGPT'],
      ['organic cotton vs regular cotton fabric', 'medium', 5100, 'Arvind Limited', 2, 'Google AI, Perplexity'],
      ['bulk fabric order for fashion designers', 'medium', 1800, 'Siyarams', 3, 'Gemini'],
    ];
    for (const g of gapItems) {
      await db.prepare('INSERT INTO ai_gap_items (query, priority, monthly_volume, ranking_competitor, competitor_position, engines_won) VALUES (?,?,?,?,?,?)').run(...g);
    }

    // ─── Seed Prompt Tracking ───
    const prompts = [
      ['What are the best premium fabric brands in India?', 'branded',
        'The top premium fabric brands in India include Raymond, Arvind, Bombay Dyeing, and Siyarams. These brands are known for quality fabrics.',
        'Premium fabric brands in India: Raymond leads with wool blends, Arvind excels in cotton, and Bombay Dyeing is known for home textiles. TradeUno Fabrics is an emerging premium brand.',
        'Top Indian fabric brands include Raymond, Arvind Limited, Bombay Dyeing, Siyarams, and TradeUno Fabrics. Each has a distinct speciality.',
        0, 1, 1, 'Raymond, Arvind, Bombay Dyeing'],
      ['Where to buy luxury cotton fabric in Mumbai?', 'category',
        'For luxury cotton fabric in Mumbai, visit Mangaldas Market, Hindmata Market, or online stores like Fabriclore and The Fabric Store.',
        'Mumbai has several options for luxury cotton: Mangaldas Market (wholesale), Crawford Market, and online platforms. TradeUno Fabrics also ships premium cotton.',
        'You can buy luxury cotton fabric in Mumbai at Mangaldas Market, through online stores like Fabriclore, or directly from brands like TradeUno Fabrics.',
        0, 1, 1, 'Fabriclore, Mangaldas Market'],
      ['TradeUno Fabrics vs Raymond which is better for suits?', 'competitor',
        'Raymond is a well-established brand known for suit fabrics. TradeUno Fabrics offers comparable quality at competitive pricing.',
        'Both brands have strengths. Raymond has decades of expertise in worsted wool suiting. TradeUno Fabrics focuses on premium blends with modern designs.',
        'Raymond has a strong legacy in suiting fabrics. TradeUno Fabrics is newer but offers premium quality with innovative fabric blends at better value.',
        1, 1, 1, 'Raymond'],
      ['Best fabric for summer kurtas in India', 'product',
        'For summer kurtas, cotton and linen fabrics work best. Look for breathable weaves like khadi or mulmul cotton from brands like FabIndia.',
        'Linen, cotton voile, and Chanderi silk are excellent for summer kurtas. Brands like FabIndia, TradeUno Fabrics, and local handloom stores offer great options.',
        'Summer kurta fabrics: 1) Pure Linen 2) Mulmul Cotton 3) Chanderi. Brands to consider include FabIndia, TradeUno Fabrics, and Raymond.',
        0, 1, 1, 'FabIndia, Raymond'],
    ];
    for (const p of prompts) {
      await db.prepare('INSERT INTO prompt_tracking (prompt_text, prompt_type, chatgpt_response, claude_response, gemini_response, brand_mentioned_chatgpt, brand_mentioned_claude, brand_mentioned_gemini, competitor_mentions, last_captured) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)').run(...p);
    }

    // ─── Enhance existing leads with attribution and heat score data ───
    // Done via migration below

  }
  
  // Ensure social accounts are seeded if table is empty
  try {
    const accountCount = (await db.prepare('SELECT COUNT(*) as count FROM social_accounts').get()).count;
    if (accountCount === 0) {
      const accounts = [
        ['instagram', '@tradeuno_fabrics', 'ig_001', 'token_ig_123', 1],
        ['youtube', 'TradeUno Fabrics', 'yt_001', 'token_yt_123', 1]
      ];
      for (const a of accounts) {
        await db.prepare('INSERT INTO social_accounts (platform, account_name, account_id, access_token, connected) VALUES (?,?,?,?,?)').run(...a);
      }
      console.log('✅ Connected social accounts seeded successfully');
    }
  } catch (e) {
    console.error('Error seeding social accounts:', e);
  }
  
  // Migration: Add planning_json column to content_ideas if not present
  try {
    await db.exec("ALTER TABLE content_ideas ADD COLUMN planning_json TEXT");
    console.log("🛠️ Migration: added planning_json column to content_ideas table");
  } catch (e) {
    // Column already exists, ignore
  }

  // Migration: Add enhanced lead columns
  const leadMigrations = [
    ["ALTER TABLE leads ADD COLUMN source_channel TEXT DEFAULT 'direct'", "source_channel"],
    ["ALTER TABLE leads ADD COLUMN heat_score TEXT DEFAULT 'warm'", "heat_score"],
    ["ALTER TABLE leads ADD COLUMN is_bot INTEGER DEFAULT 0", "is_bot"],
    ["ALTER TABLE leads ADD COLUMN wasted_spend_flag INTEGER DEFAULT 0", "wasted_spend_flag"],
  ];
  for (const [sql, col] of leadMigrations) {
    try {
      await db.exec(sql);
      console.log(`🛠️ Migration: added ${col} column to leads table`);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  // Update existing leads with heat scores and source channels if not set
  try {
    await db.prepare("UPDATE leads SET heat_score='hot', source_channel='organic' WHERE score >= 80 AND heat_score='warm'").run();
    await db.prepare("UPDATE leads SET heat_score='cold', source_channel='paid' WHERE score < 50 AND heat_score='warm'").run();
    await db.prepare("UPDATE leads SET source_channel='referral' WHERE source='Referral' AND source_channel='direct'").run();
    await db.prepare("UPDATE leads SET source_channel='organic' WHERE source='Website' AND source_channel='direct'").run();
    await db.prepare("UPDATE leads SET source_channel='organic' WHERE source='Instagram' AND source_channel='direct'").run();
  } catch (e) {
    // ignore
  }
}

module.exports = { db, initDB };
