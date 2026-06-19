require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const { db, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'tradeuno-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const upload = multer({ dest: path.join(__dirname, 'public/uploads/'), limits: { fileSize: 50 * 1024 * 1024 } });

// Auth middleware
function auth(req, res, next) { if (req.session.user) return next(); res.status(401).json({ error: 'Unauthorized' }); }
function adminOnly(req, res, next) { if (req.session.user?.role === 'admin') return next(); res.status(403).json({ error: 'Admin only' }); }

// ─── Gemini AI Helper ───
async function askAI(prompt, systemPrompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your-gemini-api-key-here') {
    return `[AI Demo Mode] This is a simulated AI response. Configure your GEMINI_API_KEY in .env for real AI.\n\nBased on your query about "${prompt.substring(0, 80)}...", here are key recommendations:\n\n1. Focus on data-driven decisions\n2. Optimize content for your target audience\n3. Track metrics and iterate regularly\n4. Leverage trending formats and hashtags\n5. Maintain brand consistency across channels`;
  }
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: key });
    let retries = 2;
    while (retries >= 0) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction: systemPrompt || 'You are the AI CMO assistant for TradeUno Fabrics, a premium fabric brand in India. Give actionable, specific marketing advice. Be concise but thorough.',
            temperature: 0.7,
            tools: [{ googleSearch: {} }],
          }
        });
        return response.text;
      } catch (err) {
        if (retries === 0 || !err.message.includes('503')) throw err;
        retries--;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (e) {
    if (e.message.includes('503') || e.message.includes('high demand') || e.message.includes('UNAVAILABLE')) {
      return '⚠️ The AI model is currently experiencing high demand. Please wait a moment and try again!';
    }
    return `AI Error: ${e.message}.`;
  }
}

// ─── AI Predictive Analytics Helper ───
async function calculateMetricsHelper({ category, subCategory, caption, script, slides, videoPlatforms }) {
  // 1. Query connected accounts
  let connectedAccounts = [];
  try {
    connectedAccounts = await db.prepare("SELECT * FROM social_accounts WHERE connected = 1").all();
  } catch (err) {
    console.error("Error reading social accounts:", err);
  }
  
  // 2. Query approved/posted history
  let approvedPostsCount = 0;
  try {
    const row = await db.prepare("SELECT COUNT(*) as count FROM social_posts WHERE approval_status = 'approved' OR status = 'posted'").get();
    approvedPostsCount = row ? row.count : 0;
  } catch (err) {
    console.error("Error reading social posts:", err);
  }
  
  // 3. Caption & Hashtag Analysis
  const cleanCaption = caption || '';
  const hashtagCount = (cleanCaption.match(/#/g) || []).length;
  let spamMultiplier = 1.0;
  if (hashtagCount > 15) {
    spamMultiplier = 0.7; // stuffing hashtags penalizes reach
  } else if (hashtagCount >= 3 && hashtagCount <= 10) {
    spamMultiplier = 1.1; // optimal hashtag usage
  }
  
  let captionMultiplier = 1.0;
  if (cleanCaption.trim().length > 0) {
    if (cleanCaption.trim().length < 10) {
      captionMultiplier = 0.9;
    } else if (cleanCaption.trim().length > 1000) {
      captionMultiplier = 0.9;
    }
  }
  
  // 4. Calculate Audience base and consistency
  // Selected platforms:
  let selectedPlatforms = [];
  if (category === 'video') {
    selectedPlatforms = Array.isArray(videoPlatforms) ? videoPlatforms : [];
  } else {
    selectedPlatforms = ['instagram']; // standard image platform default is Instagram
  }
  
  let baseReach = 100;
  selectedPlatforms.forEach(p => {
    // map platform values to social_accounts platforms
    // e.g. reels/shorts/youtube -> instagram/youtube
    let dbPlatformName = p;
    if (p === 'reels') dbPlatformName = 'instagram';
    if (p === 'shorts' || p === 'youtube') dbPlatformName = 'youtube';
    
    const isConnected = connectedAccounts.some(acc => acc.platform.toLowerCase() === dbPlatformName.toLowerCase());
    if (isConnected) {
      baseReach += 1200;
    } else {
      baseReach += 50; // low organic reach for unconnected account
    }
  });
  
  const consistencyMultiplier = 1.0 + Math.min(0.5, approvedPostsCount * 0.1);
  const finalReach = Math.round(baseReach * consistencyMultiplier);
  
  // 5. Category specific calculations
  let score = 65;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let reshares = 0;
  let saves = 0;
  let watchTime = '-';
  
  if (category === 'video') {
    const activePlats = selectedPlatforms.length > 0 ? selectedPlatforms : ['reels'];
    let totalLikes = 0, totalComments = 0, totalShares = 0, totalReshares = 0, totalSaves = 0;
    let scoreSum = 0;
    let watchTimeSum = 0;
    
    const cleanScript = script || '';
    const scriptLength = cleanScript.trim().length;
    // Base duration in seconds based on script length (approx 15 chars per second)
    const durationSeconds = Math.max(Math.min(Math.round(scriptLength / 15), 60), 3);
    
    activePlats.forEach(p => {
      let platReach = finalReach;
      let durationMultiplier = 1.0;
      let platScore = 70;
      let platLikes = 0;
      let platComments = 0;
      let platShares = 0;
      let platReshares = 0;
      let platSaves = 0;
      let platWatchSecs = durationSeconds;
      
      if (p === 'reels') {
        // Peak Reels duration is 10s-25s
        if (durationSeconds >= 10 && durationSeconds <= 25) {
          durationMultiplier = 1.4;
        } else if (durationSeconds > 45 || durationSeconds < 5) {
          durationMultiplier = 0.8;
        }
        platScore = Math.round(75 * durationMultiplier * spamMultiplier * captionMultiplier);
        platReach = Math.round(platReach * 1.2);
        
        platWatchSecs = Math.round(durationSeconds * (0.6 + durationMultiplier * 0.2));
        
        platLikes = Math.round(platReach * (0.08 * durationMultiplier * spamMultiplier));
        platComments = Math.round(platLikes * 0.05);
        platShares = Math.round(platLikes * 0.12);
        platReshares = Math.round(platShares * 0.8);
        platSaves = Math.round(platLikes * 0.10);
        
      } else if (p === 'shorts') {
        // Peak Shorts duration is 10-25s
        if (durationSeconds >= 10 && durationSeconds <= 25) {
          durationMultiplier = 1.4;
        } else if (durationSeconds > 45 || durationSeconds < 5) {
          durationMultiplier = 0.8;
        }
        platScore = Math.round(72 * durationMultiplier * spamMultiplier * captionMultiplier);
        platReach = Math.round(platReach * 1.1);
        
        platWatchSecs = Math.round(durationSeconds * (0.8 + durationMultiplier * 0.3)); // loop view bonus
        
        platLikes = Math.round(platReach * (0.07 * durationMultiplier * spamMultiplier));
        platComments = Math.round(platLikes * 0.04);
        platShares = Math.round(platLikes * 0.08);
        platReshares = Math.round(platShares * 0.5);
        platSaves = Math.round(platLikes * 0.02);
        
      } else if (p === 'youtube') {
        // Longform video: duration is scaled up
        const longformDuration = Math.max(Math.min(Math.round(scriptLength / 12), 600), 60);
        platScore = Math.round(68 * spamMultiplier * captionMultiplier);
        platWatchSecs = Math.round(longformDuration * 0.45);
        
        platLikes = Math.round(platReach * (0.05 * spamMultiplier));
        platComments = Math.round(platLikes * 0.08);
        platShares = Math.round(platLikes * 0.04);
        platReshares = 0;
        platSaves = Math.round(platLikes * 0.15);
        
      } else if (p === 'linkedin') {
        if (durationSeconds >= 10 && durationSeconds <= 25) {
          durationMultiplier = 1.3;
        }
        platScore = Math.round(70 * durationMultiplier * spamMultiplier * captionMultiplier);
        platWatchSecs = Math.round(durationSeconds * (0.5 + durationMultiplier * 0.2));
        
        platLikes = Math.round(platReach * (0.06 * durationMultiplier * spamMultiplier));
        platComments = Math.round(platLikes * 0.12);
        platShares = Math.round(platLikes * 0.06);
        platReshares = Math.round(platLikes * 0.10);
        platSaves = Math.round(platLikes * 0.08);
      }
      
      scoreSum += platScore;
      totalLikes += platLikes;
      totalComments += platComments;
      totalShares += platShares;
      totalReshares += platReshares;
      totalSaves += platSaves;
      watchTimeSum += platWatchSecs;
    });
    
    score = Math.min(98, Math.round(scoreSum / activePlats.length));
    likes = totalLikes;
    comments = totalComments;
    shares = totalShares;
    reshares = totalReshares;
    saves = totalSaves;
    
    const avgWatchSecs = Math.round(watchTimeSum / activePlats.length);
    if (avgWatchSecs >= 60) {
      const mins = Math.floor(avgWatchSecs / 60);
      const secs = avgWatchSecs % 60;
      watchTime = `${mins}m ${secs}s`;
    } else {
      watchTime = `${avgWatchSecs}s`;
    }
    
  } else {
    // Category: Image
    const isCarousel = subCategory === 'carousel';
    const activeSlides = Array.isArray(slides) ? slides.filter(s => s.action !== 'remove').length : 2;
    
    if (isCarousel) {
      // Dwell time peaks at 5-8 slides
      let slidesMultiplier = 1.0;
      if (activeSlides >= 5 && activeSlides <= 8) {
        slidesMultiplier = 1.3;
      } else if (activeSlides < 3) {
        slidesMultiplier = 0.9;
      } else if (activeSlides > 8) {
        slidesMultiplier = 0.95;
      }
      
      score = Math.min(98, Math.round(78 * slidesMultiplier * spamMultiplier * captionMultiplier));
      const carouselReach = Math.round(finalReach * 1.15); // dwell time reach boost
      
      likes = Math.round(carouselReach * (0.09 * slidesMultiplier * spamMultiplier));
      comments = Math.round(likes * 0.06);
      shares = Math.round(likes * 0.05);
      reshares = Math.round(likes * 0.03);
      saves = Math.round(likes * 0.35 * (activeSlides >= 5 ? 1.5 : 1.0)); // high saves on carousels!
      watchTime = `${(activeSlides * 3.5).toFixed(1)}s`; // average dwell time
      
    } else {
      // Single Post
      score = Math.min(98, Math.round(60 * spamMultiplier * captionMultiplier));
      likes = Math.round(finalReach * (0.07 * spamMultiplier));
      comments = Math.round(likes * 0.04);
      shares = Math.round(likes * 0.03);
      reshares = Math.round(likes * 0.02);
      saves = Math.round(likes * 0.08);
      watchTime = '-';
    }
  }
  
  return {
    engagement_score: Math.max(10, score),
    likes,
    comments,
    shares,
    reshares,
    saves,
    watch_time: watchTime
  };
}

// ═══ AUTH ROUTES ═══
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, avatar_color: user.avatar_color };
    res.json({ user: req.session.user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });
app.get('/api/me', (req, res) => { res.json({ user: req.session.user || null }); });

// ═══ TEAM & TASKS ═══
app.get('/api/team', auth, async (req, res) => {
  try {
    const members = await db.prepare('SELECT id, name, email, role, department, avatar_color FROM users').all();
    res.json(members);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const tasks = await db.prepare('SELECT t.*, u.name as assignee_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id ORDER BY t.created_at DESC').all();
    res.json(tasks);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { title, description, assigned_to, priority, due_date } = req.body;
    const r = await db.prepare('INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, due_date) VALUES (?,?,?,?,?,?)').run(title, description, assigned_to, req.session.user.id, priority, due_date);
    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const { status, score, ai_feedback } = req.body;
    const sets = []; const vals = [];
    if (status) { sets.push('status=?'); vals.push(status); if (status === 'completed') sets.push('completed_at=CURRENT_TIMESTAMP'); }
    if (score !== undefined) { sets.push('score=?'); vals.push(score); }
    if (ai_feedback) { sets.push('ai_feedback=?'); vals.push(ai_feedback); }
    vals.push(req.params.id);
    await db.prepare(`UPDATE tasks SET ${sets.join(',')} WHERE id=?`).run(...vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/tasks/:id/upload', auth, upload.single('proof'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    await db.prepare("UPDATE tasks SET proof_file=?, status=? WHERE id=?").run('/uploads/' + req.file.filename, 'submitted', req.params.id);
    res.json({ ok: true, file: req.file.filename });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/tasks/:id/score', auth, adminOnly, async (req, res) => {
  try {
    const task = await db.prepare('SELECT t.*, u.name as assignee_name FROM tasks t LEFT JOIN users u ON t.assigned_to=u.id WHERE t.id=?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Not found' });
    const prompt = `Score this marketing task (0-100) and give brief feedback:\nTask: ${task.title}\nDescription: ${task.description}\nAssigned to: ${task.assignee_name}\nStatus: ${task.status}\nDue: ${task.due_date}\nProvide: Score (number), Strengths, Areas to improve, Overall assessment. Format clearly.`;
    const feedback = await askAI(prompt);
    const scoreMatch = feedback.match(/(\d{1,3})/);
    const score = scoreMatch ? Math.min(parseInt(scoreMatch[1]), 100) : 75;
    await db.prepare("UPDATE tasks SET score=?, ai_feedback=?, status='completed', completed_at=CURRENT_TIMESTAMP WHERE id=?").run(score, feedback, task.id);
    res.json({ score, feedback });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ CONTENT IDEAS ═══
app.get('/api/content', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM content_ideas ORDER BY created_at DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/content/generate', auth, async (req, res) => {
  try {
    const { type, topic, platform } = req.body;
    const prompt = `Generate a ${type || 'reel'} idea for TradeUno Fabrics on ${platform || 'Instagram'}.\nTopic: ${topic || 'trending fabric content'}\n\nProvide:\n1. Title (catchy)\n2. Full Script/Description\n3. Hashtags (10-15)\n4. Best posting time\n5. Engagement prediction\n6. Hook line for first 3 seconds`;
    const result = await askAI(prompt);
    const idea = await db.prepare('INSERT INTO content_ideas (type, title, script, hashtags, platform, created_by) VALUES (?,?,?,?,?,?)').run(type || 'reel', topic || 'AI Generated Idea', result, '', platform || 'instagram', req.session.user.id);
    res.json({ id: idea.lastInsertRowid, content: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/content/:id', auth, async (req, res) => {
  try {
    const { status, planning_json } = req.body;
    const sets = []; const vals = [];
    if (status !== undefined) { sets.push('status=?'); vals.push(status); }
    if (planning_json !== undefined) { sets.push('planning_json=?'); vals.push(planning_json); }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await db.prepare(`UPDATE content_ideas SET ${sets.join(',')} WHERE id=?`).run(...vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/content/:id/generate-plan', auth, async (req, res) => {
  try {
    const { category, subCategory } = req.body;
    const idea = await db.prepare('SELECT * FROM content_ideas WHERE id=?').get(req.params.id);
    if (!idea) return res.status(404).json({ error: 'Content idea not found' });
    
    const prompt = `You are a professional social media manager and content strategist for TradeUno Fabrics.
We are developing a content plan for the following liked idea:
Title: ${idea.title}
Base Script Topic: ${idea.script}
Category: ${category} (either "video" or "image")
Sub-category: ${subCategory} (for video: "reels", "linkedin", "youtube", "shorts"; for image: "single_post", "carousel")

Develop a highly detailed, professional plan. You must return only a valid JSON object matching the schema below. No markdown formatting, no code block wrapper, no preamble. Just raw JSON.

Schema:
{
  "caption": "A catchy social media caption with 3-5 hashtags",
  "script_details": {
    "script": "If video: Full scene-by-scene script. If image single_post: Detailed description of the image layout/visual copy.",
    "overlay_text": "If video: Suggestion for on-screen text overlays. If image: Suggestion for image overlay text."
  },
  "slides": [
    // ONLY if subCategory is "carousel" (otherwise leave empty array):
    { "slideNum": 1, "text": "Visual description and text for slide 1", "action": "keep", "annotation": "" },
    { "slideNum": 2, "text": "Visual description and text for slide 2", "action": "keep", "annotation": "" }
  ],
  "analytics": {
    "engagement_score": 85,
    "likes": 1250,
    "comments": 65,
    "shares": 140,
    "reshares": 35,
    "saves": 280,
    "watch_time": "14.2s"
  }
}`;

    const responseText = await askAI(prompt, 'You are the AI CMO for TradeUno Fabrics. Output only a valid JSON object matching the requested schema. No markdown, no preamble. Pure JSON.');
    let sanitized = responseText.trim();
    if (sanitized.startsWith('```')) {
      sanitized = sanitized.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
    }
    
    const planData = JSON.parse(sanitized);
    
    // Overwrite simulated metrics generated by Gemini using the server-side algorithm to maintain consistency
    const slidesForHelper = planData.slides || [];
    const videoPlatformsForHelper = category === 'video' ? [subCategory] : [];
    const scriptForHelper = planData.script_details?.script || '';
    
    const analytics = await calculateMetricsHelper({
      category,
      subCategory,
      caption: planData.caption || '',
      script: scriptForHelper,
      slides: slidesForHelper,
      videoPlatforms: videoPlatformsForHelper
    });
    
    planData.analytics = analytics;
    res.json(planData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/content/predict-analytics', auth, async (req, res) => {
  try {
    const { category, subCategory, caption, script, slides, videoPlatforms } = req.body;
    const analytics = await calculateMetricsHelper({
      category,
      subCategory,
      caption,
      script,
      slides,
      videoPlatforms
    });
    res.json({ analytics });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══ COMPETITORS ═══
app.get('/api/competitors', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM competitors ORDER BY created_at DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/competitors', auth, async (req, res) => {
  try {
    const { name, website, instagram, category } = req.body;
    const r = await db.prepare('INSERT INTO competitors (name, website, instagram, category) VALUES (?,?,?,?)').run(name, website, instagram, category);
    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/competitors/:id/analyze', auth, async (req, res) => {
  try {
    const comp = await db.prepare('SELECT * FROM competitors WHERE id=?').get(req.params.id);
    if (!comp) return res.status(404).json({ error: 'Not found' });
    const prompt = `Analyze this competitor of TradeUno Fabrics:\nCompetitor: ${comp.name}\nWebsite: ${comp.website}\nInstagram: ${comp.instagram}\nCategory: ${comp.category}\n\nProvide:\n1. Estimated strengths & weaknesses\n2. Their likely content strategy\n3. What TradeUno can learn\n4. Opportunities to differentiate\n5. Recommended counter-strategies\n6. Market positioning`;
    const analysis = await askAI(prompt);
    await db.prepare('INSERT INTO competitor_insights (competitor_id, insight_type, content) VALUES (?,?,?)').run(comp.id, 'full_analysis', analysis);
    await db.prepare('UPDATE competitors SET last_analyzed=CURRENT_TIMESTAMP WHERE id=?').run(comp.id);
    res.json({ analysis });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/competitors/:id/insights', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM competitor_insights WHERE competitor_id=? ORDER BY created_at DESC').all(req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ SOCIAL MEDIA ═══
app.get('/api/social/accounts', auth, async (req, res) => {
  try { res.json(await db.prepare('SELECT * FROM social_accounts').all()); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/social/accounts', auth, adminOnly, async (req, res) => {
  try {
    const { platform, account_name, account_id, access_token } = req.body;
    const r = await db.prepare('INSERT INTO social_accounts (platform, account_name, account_id, access_token, connected) VALUES (?,?,?,?,1)').run(platform, account_name, account_id || '', access_token || '');
    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/social/posts', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT p.*, u.name as uploader_name FROM social_posts p LEFT JOIN users u ON p.uploaded_by=u.id ORDER BY p.created_at DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/social/posts', auth, upload.single('media'), async (req, res) => {
  try {
    const { platform, content, scheduled_at } = req.body;
    const media = req.file ? '/uploads/' + req.file.filename : null;
    const r = await db.prepare('INSERT INTO social_posts (platform, content, media_file, scheduled_at, uploaded_by, approval_status) VALUES (?,?,?,?,?,?)').run(platform, content, media, scheduled_at, req.session.user.id, req.session.user.role === 'admin' ? 'approved' : 'pending');
    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/social/posts/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    await db.prepare('UPDATE social_posts SET approval_status=? WHERE id=?').run(req.body.status, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ LEADS ═══
app.get('/api/leads', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT l.*, u.name as assignee_name FROM leads l LEFT JOIN users u ON l.assigned_to=u.id ORDER BY l.score DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/leads', auth, async (req, res) => {
  try {
    const { name, email, phone, company, type, source, notes } = req.body;
    const r = await db.prepare('INSERT INTO leads (name, email, phone, company, type, source, notes) VALUES (?,?,?,?,?,?,?)').run(name, email, phone, company, type, source, notes);
    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/leads/:id', auth, async (req, res) => {
  try {
    const { status, assigned_to, notes } = req.body;
    const sets = []; const vals = [];
    if (status) { sets.push('status=?'); vals.push(status); }
    if (assigned_to) { sets.push('assigned_to=?'); vals.push(assigned_to); }
    if (notes) { sets.push('notes=?'); vals.push(notes); }
    if (sets.length) { vals.push(req.params.id); await db.prepare(`UPDATE leads SET ${sets.join(',')} WHERE id=?`).run(...vals); }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/leads/generate', auth, async (req, res) => {
  try {
    const { type, location, industry } = req.body;
    const prompt = `Generate 5 potential ${type || 'B2B'} leads for TradeUno Fabrics.\nLocation: ${location || 'Pan India'}\nIndustry: ${industry || 'Textiles & Fashion'}\n\nFor each lead provide:\n1. Business/Person Name\n2. Type of business\n3. Why they're a good lead\n4. Suggested approach\n5. Lead score (1-100)`;
    const result = await askAI(prompt);
    res.json({ leads: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ BLOGS ═══
app.get('/api/blogs', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT b.*, u.name as author_name FROM blogs b LEFT JOIN users u ON b.author_id=u.id ORDER BY b.created_at DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/blogs', auth, async (req, res) => {
  try {
    const { title, content, meta_description, keywords, status } = req.body;
    const r = await db.prepare('INSERT INTO blogs (title, content, meta_description, keywords, status, author_id) VALUES (?,?,?,?,?,?)').run(title, content, meta_description, keywords, status || 'draft', req.session.user.id);
    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/blogs/generate', auth, async (req, res) => {
  try {
    const { topic } = req.body;
    const prompt = `Write a professional blog post for TradeUno Fabrics.\nTopic: ${topic || 'Fabric care and styling tips'}\n\nProvide:\n1. SEO-optimized Title\n2. Meta Description (160 chars)\n3. Keywords\n4. Full blog content (800-1000 words)\n\nTone: Professional yet approachable.`;
    const result = await askAI(prompt);
    res.json({ blog: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ VIDEO SUGGESTIONS ═══
app.get('/api/videos', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT v.*, u.name as editor_name FROM video_projects v LEFT JOIN users u ON v.editor_id=u.id ORDER BY v.created_at DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/videos', auth, upload.single('video'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file ? '/uploads/' + req.file.filename : null;
    const r = await db.prepare('INSERT INTO video_projects (title, description, file_path, editor_id) VALUES (?,?,?,?)').run(title, description, file, req.session.user.id);
    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/videos/:id/suggest', auth, async (req, res) => {
  try {
    const video = await db.prepare('SELECT * FROM video_projects WHERE id=?').get(req.params.id);
    if (!video) return res.status(404).json({ error: 'Not found' });
    const prompt = `Give video editing suggestions for better reach:\nVideo: ${video.title}\nDescription: ${video.description}\n\nProvide:\n1. Hook strategy\n2. Pacing recommendations\n3. Text overlays\n4. Music/audio\n5. Transitions\n6. CTA placement\n7. Optimal length per platform\n8. Thumbnail suggestions`;
    const suggestions = await askAI(prompt);
    await db.prepare('UPDATE video_projects SET ai_suggestions=? WHERE id=?').run(suggestions, video.id);
    res.json({ suggestions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ META ADS ═══
app.get('/api/meta/campaigns', auth, async (req, res) => {
  try { res.json(await db.prepare('SELECT * FROM meta_campaigns ORDER BY created_at DESC').all()); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/meta/campaigns', auth, async (req, res) => {
  try {
    const { campaign_name, budget, impressions, clicks, conversions, spent, ctr, cpc, roas, date } = req.body;
    const r = await db.prepare('INSERT INTO meta_campaigns (campaign_name, budget, impressions, clicks, conversions, spent, ctr, cpc, roas, date) VALUES (?,?,?,?,?,?,?,?,?,?)').run(campaign_name, budget, impressions, clicks, conversions, spent, ctr, cpc, roas, date);
    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/meta/sync', auth, async (req, res) => {
  const { META_ACCESS_TOKEN, META_AD_ACCOUNT_ID } = process.env;
  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) return res.status(400).json({ error: 'Configure META_ACCESS_TOKEN and META_AD_ACCOUNT_ID in .env' });
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/act_${META_AD_ACCOUNT_ID}/campaigns?fields=name,insights{spend,impressions,clicks,conversions,cpc,ctr}&access_token=${META_ACCESS_TOKEN}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    await db.prepare('DELETE FROM meta_campaigns').run();
    for (const camp of data.data) {
      const insights = camp.insights?.data?.[0] || {};
      await db.prepare('INSERT INTO meta_campaigns (campaign_name, campaign_id, spent, impressions, clicks, ctr, cpc, date) VALUES (?,?,?,?,?,?,?,?)')
        .run(camp.name, camp.id, insights.spend || 0, insights.impressions || 0, insights.clicks || 0, insights.ctr || 0, insights.cpc || 0, new Date().toISOString().split('T')[0]);
    }
    res.json({ ok: true, count: data.data.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/meta/analyze', auth, async (req, res) => {
  try {
    const campaigns = await db.prepare('SELECT * FROM meta_campaigns ORDER BY created_at DESC LIMIT 10').all();
    const campData = campaigns.map(c => `${c.campaign_name}: Spent ₹${c.spent}, Impressions ${c.impressions}, Clicks ${c.clicks}, CTR ${c.ctr}%, CPC ₹${c.cpc}`).join('\n');
    const prompt = `Analyze these Meta ad campaigns for TradeUno Fabrics:\n\n${campData || 'No active campaigns'}\n\nProvide:\n1. Performance assessment\n2. Budget reallocation recommendations\n3. Audience targeting suggestions\n4. Creative optimization tips\n5. ROAS improvement strategy`;
    const analysis = await askAI(prompt);
    res.json({ analysis });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ SHOPIFY INSIGHTS ═══
app.get('/api/shopify/data', auth, async (req, res) => {
  try { res.json(await db.prepare('SELECT * FROM shopify_data ORDER BY created_at DESC LIMIT 30').all()); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/shopify/sync', auth, async (req, res) => {
  const { SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN } = process.env;
  if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) return res.status(400).json({ error: 'Configure SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN in .env' });
  try {
    const response = await fetch(`https://${SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json?status=any`, { headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN } });
    const data = await response.json();
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    await db.prepare('INSERT INTO shopify_data (data_type, data_json, date) VALUES (?,?,?)').run('real_orders', JSON.stringify(data.orders), new Date().toISOString().split('T')[0]);
    res.json({ ok: true, count: data.orders.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/shopify/analyze', auth, async (req, res) => {
  try {
    const realOrders = await db.prepare("SELECT data_json FROM shopify_data WHERE data_type='real_orders' ORDER BY created_at DESC LIMIT 1").get();
    const contextData = realOrders ? `Recent Shopify Orders:\n${realOrders.data_json.substring(0, 1500)}` : 'No real store data synced yet.';
    const prompt = `As CMO of TradeUno Fabrics, provide e-commerce insights.\n\n${contextData}\n\n1. Product Performance\n2. Order Pattern Insights\n3. Customer Segmentation\n4. Pricing Strategy\n5. Bundle ideas\n6. Retention strategies`;
    const insights = await askAI(prompt);
    await db.prepare('INSERT INTO shopify_data (data_type, data_json, date) VALUES (?,?,?)').run('ai_analysis', JSON.stringify({ insights }), new Date().toISOString().split('T')[0]);
    res.json({ insights });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ REPORTS ═══
app.get('/api/reports', auth, async (req, res) => {
  try { res.json(await db.prepare('SELECT * FROM daily_reports ORDER BY report_date DESC LIMIT 30').all()); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/reports/generate', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const taskStats = await db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all();
    const totalLeads = (await db.prepare('SELECT COUNT(*) as c FROM leads').get()).c;
    const pendingPosts = (await db.prepare("SELECT COUNT(*) as c FROM social_posts WHERE approval_status='pending'").get()).c;
    const campaigns = await db.prepare("SELECT * FROM meta_campaigns WHERE status='active'").all();
    const avgScoreRow = await db.prepare('SELECT AVG(score) as avg FROM tasks WHERE score > 0').get();
    const avgScore = avgScoreRow?.avg || 0;
    const adSpendRow = await db.prepare("SELECT SUM(spent) as total FROM meta_campaigns WHERE status='active'").get();
    const adSpend = adSpendRow?.total || 0;
    const totalBlogs = (await db.prepare('SELECT COUNT(*) as c FROM blogs').get()).c;
    const contentIdeasCount = (await db.prepare('SELECT COUNT(*) as c FROM content_ideas').get()).c;
    const competitorCount = (await db.prepare('SELECT COUNT(*) as c FROM competitors').get()).c;
    const recentTasks = await db.prepare('SELECT title, status, score FROM tasks ORDER BY created_at DESC LIMIT 5').all();

    const prompt = `Generate a daily marketing report for TradeUno Fabrics founders.

Date: ${today}
Task Stats: ${JSON.stringify(taskStats)}
Recent Tasks: ${JSON.stringify(recentTasks)}
Average Task Score: ${Math.round(avgScore)}/100
Total Leads: ${totalLeads}
Pending Social Posts: ${pendingPosts}
Active Ad Campaigns: ${campaigns.length}
Active Ad Spend: ₹${adSpend}
Total Blogs: ${totalBlogs}
Total Content Ideas: ${contentIdeasCount}
Total Competitors Monitored: ${competitorCount}

You MUST return your response as a raw JSON object matching this schema. Do not include markdown wraps.
{
  "date": "${today}",
  "executive_summary": "...",
  "metrics": [
    { "category": "Tasks", "metric": "Pending / Completed / Avg Score", "value": "..." },
    { "category": "Leads", "metric": "Total Leads", "value": "..." },
    { "category": "Social Media", "metric": "Posts Pending Approval", "value": "..." },
    { "category": "Meta Ads", "metric": "Active Campaigns / Spend", "value": "..." }
  ],
  "work_categories": [
    { "category": "Content Studio", "work_done": "...", "status": "..." },
    { "category": "Blog Engine", "work_done": "...", "status": "..." },
    { "category": "Video Lab", "work_done": "...", "status": "..." },
    { "category": "Competitor Intel", "work_done": "...", "status": "..." },
    { "category": "Lead Finder", "work_done": "...", "status": "..." }
  ],
  "key_wins": ["...", "..."],
  "areas_for_improvement": ["...", "..."],
  "recommendations": ["...", "...", "..."]
}`;

    const reportText = await askAI(prompt, 'You are the AI CMO for TradeUno Fabrics. Output only a valid JSON object matching the requested schema. No markdown, no preamble. Pure JSON.');
    let sanitized = reportText.trim();
    if (sanitized.startsWith('```')) sanitized = sanitized.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');

    await db.prepare('DELETE FROM daily_reports WHERE report_date=?').run(today);
    await db.prepare('INSERT INTO daily_reports (report_date, summary, team_performance, ai_insights) VALUES (?,?,?,?)').run(today, sanitized, JSON.stringify(taskStats), sanitized);
    res.json({ report: sanitized, date: today });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ AI ASSISTANT ═══
app.post('/api/ai/chat', auth, async (req, res) => {
  try {
    const { message, module } = req.body;
    await db.prepare('INSERT INTO ai_conversations (user_id, role, content, module) VALUES (?,?,?,?)').run(req.session.user.id, 'user', message, module || 'general');
    const sysPrompt = `You are the AI CMO for TradeUno Fabrics, a premium fabric brand in India. Current module: ${module || 'general'}. Be specific, actionable, and data-driven.`;
    const reply = await askAI(message, sysPrompt);
    await db.prepare('INSERT INTO ai_conversations (user_id, role, content, module) VALUES (?,?,?,?)').run(req.session.user.id, 'assistant', reply, module || 'general');
    res.json({ reply });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/ai/history', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM ai_conversations WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.session.user.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ CITATION SCORE ═══
app.get('/api/citation/score', auth, async (req, res) => {
  try {
    const scores = await db.prepare('SELECT * FROM citation_scores ORDER BY id ASC').all();
    const latest = scores[scores.length - 1] || { score: 0, platform_breakdown: '{}' };
    const prev = scores.length >= 2 ? scores[scores.length - 2] : { score: 0 };
    res.json({ current: latest, previous: prev, history: scores });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/citation/breakdown', auth, async (req, res) => {
  try {
    const latest = await db.prepare('SELECT * FROM citation_scores ORDER BY id DESC LIMIT 1').get();
    if (!latest) return res.json({ breakdown: {} });
    res.json({ breakdown: JSON.parse(latest.platform_breakdown || '{}'), score: latest.score, week: latest.week_label });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/citation/tasks', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM citation_tasks ORDER BY CASE priority WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, created_at DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/citation/refresh', auth, async (req, res) => {
  try {
    const competitors = await db.prepare('SELECT name FROM competitors').all();
    const compNames = competitors.map(c => c.name).join(', ');
    const prompt = `You are an AI visibility analyst for TradeUno Fabrics (premium fabric brand, India).
Competitors: ${compNames || 'Raymond, Arvind, Bombay Dyeing, Siyarams'}.
Estimate the brand's current AI citation score (0-100) and per-platform breakdown for these AI engines: Google AI Overview, ChatGPT, Claude, Gemini, Perplexity, Bing Copilot.
Also generate 4 actionable tasks to improve citation gaps.

Return ONLY a raw JSON object:
{
  "score": 70,
  "breakdown": {"google_ai": 60, "chatgpt": 55, "claude": 45, "gemini": 72, "perplexity": 40, "bing_copilot": 50},
  "tasks": [
    {"task": "Action item text", "platform": "Platform name", "priority": "critical|high|medium"}
  ]
}`;
    const result = await askAI(prompt, 'You are an AI visibility analyst. Output only valid JSON. No markdown.');
    let sanitized = result.trim();
    if (sanitized.startsWith('```')) sanitized = sanitized.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
    
    try {
      const data = JSON.parse(sanitized);
      const weekNum = Math.ceil(new Date().getDate() / 7);
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const weekLabel = `W${weekNum} ${monthNames[new Date().getMonth()]}`;
      
      await db.prepare('INSERT INTO citation_scores (score, week_label, platform_breakdown) VALUES (?,?,?)').run(data.score, weekLabel, JSON.stringify(data.breakdown));
      
      if (data.tasks && data.tasks.length > 0) {
        for (const t of data.tasks) {
          await db.prepare('INSERT INTO citation_tasks (task, platform, priority) VALUES (?,?,?)').run(t.task, t.platform, t.priority || 'medium');
        }
      }
      res.json({ score: data.score, breakdown: data.breakdown, tasks: data.tasks });
    } catch (parseErr) {
      res.json({ score: 65, raw: sanitized });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ AI CONTENT ENGINE (SEO BRIEFS) ═══
app.get('/api/seo/briefs', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM content_briefs ORDER BY created_at DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/seo/brief', auth, async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: 'Keyword is required' });
    
    const competitors = await db.prepare('SELECT name, website FROM competitors LIMIT 3').all();
    const compContext = competitors.map(c => `${c.name} (${c.website})`).join(', ');
    
    const prompt = `You are an expert SEO content strategist for TradeUno Fabrics (premium Indian fabric brand).
Target keyword: "${keyword}"
Top competitors: ${compContext || 'Raymond, Arvind, Bombay Dyeing'}

Generate a complete SEO content brief. Return ONLY a raw JSON object:
{
  "keyword": "${keyword}",
  "search_intent": "informational|transactional|navigational",
  "difficulty": "easy|medium|hard",
  "title_variations": ["Title 1 optimised for CTR", "Title 2", "Title 3"],
  "meta_description": "Compelling meta description under 160 chars",
  "heading_structure": {
    "h1": "Main heading",
    "h2s": ["Section 1", "Section 2", "Section 3", "Section 4"],
    "h3s": ["Subsection 1.1", "Subsection 2.1"]
  },
  "related_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "lsi_keywords": ["semantic1", "semantic2", "semantic3", "semantic4"],
  "competitor_gap": {
    "what_they_wrote": "Summary of what top 3 competitors covered",
    "what_they_missed": "Angles and topics they failed to cover that TradeUno can own"
  },
  "word_count_target": 1500,
  "content_outline": "Brief paragraph describing the ideal content flow"
}`;
    const result = await askAI(prompt, 'You are an SEO strategist. Output only valid JSON. No markdown.');
    let sanitized = result.trim();
    if (sanitized.startsWith('```')) sanitized = sanitized.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
    
    await db.prepare('INSERT INTO content_briefs (keyword, brief_json, created_by) VALUES (?,?,?)').run(keyword, sanitized, req.session.user.id);
    res.json({ keyword, brief: sanitized });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ AI GAP ANALYSIS ═══
app.get('/api/gaps', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM ai_gap_items ORDER BY CASE priority WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, monthly_volume DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/gaps/scan', auth, async (req, res) => {
  try {
    const competitors = await db.prepare('SELECT name FROM competitors').all();
    const compNames = competitors.map(c => c.name).join(', ');
    const existing = await db.prepare('SELECT query FROM ai_gap_items').all();
    const existingQueries = existing.map(g => g.query).join('; ');
    
    const prompt = `You are an AI search gap analyst for TradeUno Fabrics (premium fabric brand, India).
Competitors: ${compNames || 'Raymond, Arvind, Bombay Dyeing, Siyarams'}.
Already tracked queries: ${existingQueries || 'none'}

Find 5 NEW search queries/prompts where competitors get cited by AI engines but TradeUno does NOT.
Return ONLY a raw JSON array:
[
  {
    "query": "the exact search query",
    "priority": "critical|high|medium",
    "monthly_volume": 5000,
    "ranking_competitor": "Competitor Name",
    "competitor_position": 2,
    "engines_won": "ChatGPT, Gemini"
  }
]`;
    const result = await askAI(prompt, 'AI search analyst. Output only valid JSON array. No markdown.');
    let sanitized = result.trim();
    if (sanitized.startsWith('```')) sanitized = sanitized.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
    
    const gaps = JSON.parse(sanitized);
    for (const g of gaps) {
      await db.prepare('INSERT INTO ai_gap_items (query, priority, monthly_volume, ranking_competitor, competitor_position, engines_won) VALUES (?,?,?,?,?,?)').run(g.query, g.priority, g.monthly_volume, g.ranking_competitor, g.competitor_position, g.engines_won);
    }
    res.json({ gaps });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/gaps/:id/fix', auth, async (req, res) => {
  try {
    const gap = await db.prepare('SELECT * FROM ai_gap_items WHERE id=?').get(req.params.id);
    if (!gap) return res.status(404).json({ error: 'Gap not found' });
    
    const prompt = `Create a one-click fix plan for this AI search gap for TradeUno Fabrics:
Query: "${gap.query}"
Competitor winning: ${gap.ranking_competitor} (position ${gap.competitor_position})
Engines they win on: ${gap.engines_won}
Monthly volume: ${gap.monthly_volume}

Provide a brief actionable fix plan (3-5 bullet points) to get TradeUno cited for this query.`;
    const plan = await askAI(prompt);
    await db.prepare('UPDATE ai_gap_items SET fix_plan=?, status=\'planned\' WHERE id=?').run(plan, gap.id);
    res.json({ plan });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ CUSTOM PROMPT TRACKING ═══
app.get('/api/prompts', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM prompt_tracking ORDER BY created_at DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/prompts', auth, async (req, res) => {
  try {
    const { prompt_text, prompt_type } = req.body;
    if (!prompt_text) return res.status(400).json({ error: 'Prompt text required' });
    const r = await db.prepare('INSERT INTO prompt_tracking (prompt_text, prompt_type) VALUES (?,?)').run(prompt_text, prompt_type || 'branded');
    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/prompts/:id/capture', auth, async (req, res) => {
  try {
    const prompt = await db.prepare('SELECT * FROM prompt_tracking WHERE id=?').get(req.params.id);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    
    const aiPrompt = `Simulate how 3 different AI assistants (ChatGPT, Claude, Gemini) would answer this user question:
"${prompt.prompt_text}"

Context: TradeUno Fabrics is a premium fabric brand in India. Check if TradeUno gets mentioned.
Competitors include: Raymond, Arvind, Bombay Dyeing, Siyarams.

Return ONLY a raw JSON object:
{
  "chatgpt": "ChatGPT's simulated response (2-3 sentences)",
  "claude": "Claude's simulated response (2-3 sentences)",
  "gemini": "Gemini's simulated response (2-3 sentences)",
  "brand_mentioned_chatgpt": true/false,
  "brand_mentioned_claude": true/false,
  "brand_mentioned_gemini": true/false,
  "competitor_mentions": "Comma-separated competitor names mentioned"
}`;
    const result = await askAI(aiPrompt, 'Simulate AI assistant responses. Output only valid JSON.');
    let sanitized = result.trim();
    if (sanitized.startsWith('```')) sanitized = sanitized.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
    
    const data = JSON.parse(sanitized);
    await db.prepare(`UPDATE prompt_tracking SET 
      chatgpt_response=?, claude_response=?, gemini_response=?,
      brand_mentioned_chatgpt=?, brand_mentioned_claude=?, brand_mentioned_gemini=?,
      competitor_mentions=?, last_captured=CURRENT_TIMESTAMP WHERE id=?`).run(
      data.chatgpt, data.claude, data.gemini,
      data.brand_mentioned_chatgpt ? 1 : 0,
      data.brand_mentioned_claude ? 1 : 0,
      data.brand_mentioned_gemini ? 1 : 0,
      data.competitor_mentions || '', prompt.id
    );
    res.json({ responses: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/prompts/suggest', auth, async (req, res) => {
  try {
    const prompt = `Generate 6 prompt suggestions that buyers in the premium fabric/textile industry would ask AI assistants.
Group them by type: Branded (about TradeUno), Competitor (comparing brands), Category (about fabric types), Product (about specific products).
Return ONLY a raw JSON array:
[{"prompt": "Question text", "type": "branded|competitor|category|product"}]`;
    const result = await askAI(prompt, 'Output only valid JSON array.');
    let sanitized = result.trim();
    if (sanitized.startsWith('```')) sanitized = sanitized.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
    res.json({ suggestions: JSON.parse(sanitized) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ ENHANCED LEADS DASHBOARD ═══
app.get('/api/leads/dashboard', auth, async (req, res) => {
  try {
    const totalLeads = (await db.prepare('SELECT COUNT(*) as c FROM leads WHERE is_bot=0').get()).c;
    const hotLeads = (await db.prepare("SELECT COUNT(*) as c FROM leads WHERE heat_score='hot' AND is_bot=0").get()).c;
    const warmLeads = (await db.prepare("SELECT COUNT(*) as c FROM leads WHERE heat_score='warm' AND is_bot=0").get()).c;
    const coldLeads = (await db.prepare("SELECT COUNT(*) as c FROM leads WHERE heat_score='cold' AND is_bot=0").get()).c;
    const botCount = (await db.prepare('SELECT COUNT(*) as c FROM leads WHERE is_bot=1').get()).c;
    
    const byChannel = await db.prepare("SELECT source_channel, COUNT(*) as count FROM leads WHERE is_bot=0 GROUP BY source_channel").all();
    const bySource = await db.prepare("SELECT source, COUNT(*) as count FROM leads WHERE is_bot=0 GROUP BY source").all();
    
    res.json({ totalLeads, hotLeads, warmLeads, coldLeads, botCount, byChannel, bySource });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/leads/wasted-spend', auth, async (req, res) => {
  try {
    const campaigns = await db.prepare("SELECT * FROM meta_campaigns WHERE status='active' ORDER BY spent DESC").all();
    const wastedCampaigns = campaigns.filter(c => {
      const roas = parseFloat(c.roas) || 0;
      return roas < 1.5 && parseFloat(c.spent) > 5000;
    }).map(c => ({
      ...c,
      reason: parseFloat(c.roas) < 1 ? 'Negative ROI — spending more than earning' : 'ROAS below 1.5x threshold — marginal returns'
    }));
    res.json({ wasted: wastedCampaigns, total_wasted: wastedCampaigns.reduce((s, c) => s + parseFloat(c.spent || 0), 0) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/leads/ask', auth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });
    
    const leads = await db.prepare('SELECT * FROM leads WHERE is_bot=0 LIMIT 50').all();
    const campaigns = await db.prepare('SELECT * FROM meta_campaigns LIMIT 10').all();
    
    const context = `Leads data (${leads.length} leads): ${JSON.stringify(leads.slice(0, 20))}
Campaign data: ${JSON.stringify(campaigns)}`;
    
    const aiPrompt = `You are a marketing analytics assistant for TradeUno Fabrics. 
A user asked this plain-English question about their leads/campaigns:
"${question}"

Here's the data context:
${context}

Answer concisely and specifically with numbers where possible.`;
    const answer = await askAI(aiPrompt);
    res.json({ answer });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ DASHBOARD STATS ═══
app.get('/api/dashboard/stats', auth, async (req, res) => {
  try {
    const totalTasks = (await db.prepare('SELECT COUNT(*) as c FROM tasks').get()).c;
    const completedTasks = (await db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='completed'").get()).c;
    const pendingTasks = (await db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status='pending'").get()).c;
    const totalLeads = (await db.prepare('SELECT COUNT(*) as c FROM leads').get()).c;
    const b2bLeads = (await db.prepare("SELECT COUNT(*) as c FROM leads WHERE type='b2b'").get()).c;
    const b2cLeads = (await db.prepare("SELECT COUNT(*) as c FROM leads WHERE type='b2c'").get()).c;
    const pendingPosts = (await db.prepare("SELECT COUNT(*) as c FROM social_posts WHERE approval_status='pending'").get()).c;
    const activeCampaigns = (await db.prepare("SELECT COUNT(*) as c FROM meta_campaigns WHERE status='active'").get()).c;
    const totalBlogs = (await db.prepare('SELECT COUNT(*) as c FROM blogs').get()).c;
    const contentIdeas = (await db.prepare('SELECT COUNT(*) as c FROM content_ideas').get()).c;
    const teamMembers = (await db.prepare('SELECT COUNT(*) as c FROM users').get()).c;
    const avgScoreRow = await db.prepare('SELECT AVG(score) as avg FROM tasks WHERE score > 0').get();
    const avgScore = avgScoreRow?.avg || 0;
    const adSpendRow = await db.prepare("SELECT SUM(spent) as total FROM meta_campaigns WHERE status='active'").get();
    const adSpend = adSpendRow?.total || 0;
    const impressionsRow = await db.prepare("SELECT SUM(impressions) as total FROM meta_campaigns WHERE status='active'").get();
    const totalImpressions = impressionsRow?.total || 0;
    res.json({ totalTasks, completedTasks, pendingTasks, totalLeads, b2bLeads, b2cLeads, pendingPosts, activeCampaigns, totalBlogs, contentIdeas, teamMembers, avgScore: Math.round(avgScore), adSpend, totalImpressions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ NOTIFICATIONS ═══
app.get('/api/notifications', auth, async (req, res) => {
  try {
    res.json(await db.prepare('SELECT * FROM notifications WHERE user_id=? OR user_id IS NULL ORDER BY created_at DESC LIMIT 20').all(req.session.user.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Start server after DB is ready ───
initDB().then(() => {
  const startServer = (port) => {
    const server = app.listen(port, '0.0.0.0', () => {
      const os = require('os');
      const nets = os.networkInterfaces();
      let localIP = 'localhost';
      for (const iface of Object.values(nets)) {
        for (const addr of iface) {
          if (addr.family === 'IPv4' && !addr.internal) { localIP = addr.address; break; }
        }
        if (localIP !== 'localhost') break;
      }
      console.log(`\n🚀 TradeUno CMO Agent is LIVE!\n`);
      console.log(`   Local:   http://localhost:${port}`);
      console.log(`   Network: http://${localIP}:${port}  ← Share this with other devices\n`);
      console.log(`📧 Admin:  admin@tradeuno.com / admin123`);
      console.log(`👥 Team:   priya@tradeuno.com / team123\n`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} in use, trying next port...`);
        const nextPort = port + 1;
        if (nextPort <= 3010) {
          startServer(nextPort);
        } else {
          console.error('No available ports found. Exiting.');
          process.exit(1);
        }
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  };

  // Start on default port 3000 or env PORT
  const INITIAL_PORT = parseInt(process.env.PORT, 10) || 3000;
  startServer(INITIAL_PORT);
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
