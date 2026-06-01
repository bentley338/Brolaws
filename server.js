const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config();

const logger = require('./services/logger');
const executor = require('./services/executor');
const telegram = require('./services/telegram');
const llm = require('./services/llm');

const app = express();
const PORT = process.env.PORT || 5000;

// Multi-user sessions map: token -> user profile { username, email, name }
let activeSessions = {};

const authMiddleware = (req, res, next) => {
  if (
    !req.path.startsWith('/api') || 
    req.path === '/api/auth/login' || 
    req.path === '/api/auth/register' || 
    req.path === '/api/auth/google'
  ) {
    return next();
  }

  if (req.path === '/api/screenshot') {
    const queryToken = req.query.token;
    if (queryToken && activeSessions[queryToken]) {
      req.user = activeSessions[queryToken];
      return next();
    }
    return res.status(401).json({ success: false, message: 'Unauthorized screen view request.' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (activeSessions[token]) {
      req.user = activeSessions[token];
      return next();
    }
  }

  res.status(401).json({ success: false, message: 'Unauthorized session.' });
};

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Persistent database setup
const DB_DIR = path.join(__dirname, 'database');
const DB_PATH = path.join(DB_DIR, 'store.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR);
}

const DEFAULT_DB = {
  users: {
    "admin": {
      username: "admin",
      password: "brolaws123",
      email: "admin@brolaws.com",
      googleId: null,
      settings: {
        telegramToken: '',
        adminChatId: '',
        geminiApiKey: '',
        safeMode: false,
        geminiModel: 'gemini-2.5-flash',
        systemPrompt: 'You are Brolaws, the ultimate cool, super-smart hacker buddy and Windows PC Automation Assistant. Your sole purpose is to help the user operate, automate, and control their Windows machine.'
      }
    }
  }
};

function readDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return DEFAULT_DB;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const data = JSON.parse(raw);
    
    // Migration: If legacy single-user schema exists, migrate it immediately to Multi-User dictionary
    if (!data.users) {
      logger.info('Migrating legacy single-user database to multi-tenant schema...', 'Server');
      const migrated = {
        users: {
          "admin": {
            username: "admin",
            password: data.adminPassword || 'brolaws123',
            email: "admin@brolaws.com",
            googleId: null,
            settings: {
              telegramToken: data.telegramToken || '',
              adminChatId: data.adminChatId || '',
              geminiApiKey: data.geminiApiKey || '',
              safeMode: data.safeMode !== undefined ? data.safeMode : false,
              geminiModel: data.geminiModel || 'gemini-2.5-flash',
              systemPrompt: data.systemPrompt || 'You are Brolaws, the ultimate cool, super-smart hacker buddy and Windows PC Automation Assistant. Your sole purpose is to help the user operate, automate, and control their Windows machine.'
            }
          }
        }
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(migrated, null, 2), 'utf-8');
      return migrated;
    }
    return data;
  } catch (e) {
    logger.error(`Error reading settings from DB: ${e.message}`, 'Server');
    return DEFAULT_DB;
  }
}

function writeDatabase(dbData) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
    return true;
  } catch (e) {
    logger.error(`Error writing database to DB: ${e.message}`, 'Server');
    return false;
  }
}

// Automatically start all user configured Telegram Bots on startup
const initialDb = readDatabase();
Object.keys(initialDb.users).forEach(username => {
  const user = initialDb.users[username];
  if (user.settings && user.settings.telegramToken) {
    logger.info(`Auto-starting Telegram Bot for user: ${username}...`, 'Server');
    const apiConfig = {
      apiKey: user.settings.geminiApiKey,
      safeMode: user.settings.safeMode,
      systemPrompt: user.settings.systemPrompt,
      model: user.settings.geminiModel
    };
    telegram.startUserBot(username, user.settings.telegramToken, user.settings.adminChatId, apiConfig)
      .then(started => {
        if (started) logger.info(`Telegram Bot for user ${username} auto-started successfully.`, 'Server');
        else logger.warn(`Telegram Bot for user ${username} failed to auto-start. Check credentials.`, 'Server');
      });
  }
});

// Serve client production build static files if present
const clientBuildPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
}

// API Endpoints

// 0.1 Register Manual
app.post('/api/auth/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi bro!' });
  }

  const db = readDatabase();
  const normalizedUser = username.trim().toLowerCase();
  
  if (db.users[normalizedUser]) {
    return res.status(400).json({ success: false, message: 'Username udah dipake sama orang lain bro, cari yang lain gih!' });
  }

  db.users[normalizedUser] = {
    username: username.trim(),
    password: password,
    email: email || `${normalizedUser}@brolaws.com`,
    googleId: null,
    settings: {
      telegramToken: '',
      adminChatId: '',
      geminiApiKey: '',
      safeMode: false,
      geminiModel: 'gemini-2.5-flash',
      systemPrompt: 'You are Brolaws, the ultimate cool, super-smart hacker buddy and Windows PC Automation Assistant. Your sole purpose is to help the user operate, automate, and control their Windows machine.'
    }
  };

  if (writeDatabase(db)) {
    // Instantiate user isolated workspace folder
    const userWorkspace = path.join(process.cwd(), 'workspaces', 'user_' + normalizedUser);
    if (!fs.existsSync(userWorkspace)) {
      fs.mkdirSync(userWorkspace, { recursive: true });
    }
    logger.info(`User registration successful: ${username.trim()}`, 'Server');
    res.json({ success: true, message: 'Registrasi berhasil! Silahkan login bro.' });
  } else {
    res.status(500).json({ success: false, message: 'Gagal mendaftarkan user baru di database.' });
  }
});

// 0.2 Login Manual
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password harus diisi bro!' });
  }

  const db = readDatabase();
  const normalizedUser = username.trim().toLowerCase();
  const user = db.users[normalizedUser];

  if (user && user.password === password) {
    const token = `brolaws-token-${Date.now()}-${Math.round(Math.random() * 100000)}`;
    activeSessions[token] = {
      username: user.username,
      email: user.email,
      normalizedUsername: normalizedUser
    };
    logger.info(`User successfully logged in: ${user.username}`, 'Server');
    res.json({ success: true, token, username: user.username });
  } else {
    logger.warn(`Failed manual login attempt for: ${username}`, 'Server');
    res.status(400).json({ success: false, message: 'Waduh, username atau password lu salah bro!' });
  }
});

// 0.3 Google Sign-In Mockup Bypass Handler
app.post('/api/auth/google', (req, res) => {
  const { email, name, googleId } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Google email wajib diisi!' });
  }

  const db = readDatabase();
  // Derive username from email prefix
  let derivedUsername = email.split('@')[0].trim();
  const normalizedUser = derivedUsername.toLowerCase();

  let isNew = false;
  // Auto-register if user doesn't exist
  if (!db.users[normalizedUser]) {
    logger.info(`Auto-registering Google user: ${email} -> ${derivedUsername}`, 'Server');
    db.users[normalizedUser] = {
      username: derivedUsername,
      password: `google-oauth-${Date.now()}`,
      email: email,
      googleId: googleId || `g-${Date.now()}`,
      settings: {
        telegramToken: '',
        adminChatId: '',
        geminiApiKey: '',
        safeMode: false,
        geminiModel: 'gemini-2.5-flash',
        systemPrompt: 'You are Brolaws, the ultimate cool, super-smart hacker buddy and Windows PC Automation Assistant. Your sole purpose is to help the user operate, automate, and control their Windows machine.'
      }
    };
    writeDatabase(db);
    
    // Create workspace folder
    const userWorkspace = path.join(process.cwd(), 'workspaces', 'user_' + normalizedUser);
    if (!fs.existsSync(userWorkspace)) {
      fs.mkdirSync(userWorkspace, { recursive: true });
    }
    isNew = true;
  }

  const user = db.users[normalizedUser];
  const token = `brolaws-google-token-${Date.now()}-${Math.round(Math.random() * 100000)}`;
  activeSessions[token] = {
    username: user.username,
    email: user.email,
    normalizedUsername: normalizedUser
  };

  logger.info(`Google Authentication successful for ${user.username}`, 'Server');
  res.json({ success: true, token, username: user.username, isNew });
});

// 0.4 Remote Desktop Screenshot Getter (User-isolated)
app.get('/api/screenshot', (req, res) => {
  const username = req.user.normalizedUsername;
  const workspaceDir = path.join(process.cwd(), 'workspaces', 'user_' + username);
  const screenshotPath = path.join(workspaceDir, 'screenshot.png');

  if (fs.existsSync(screenshotPath)) {
    res.sendFile(screenshotPath);
  } else {
    // Generate isolated screen capture
    executor.takeScreenshot({ username }).then(result => {
      if (result.success) {
        res.sendFile(result.path);
      } else {
        res.status(404).send('No screenshot captured yet for this user.');
      }
    });
  }
});

// 1. Get Status & System Metrics
app.get('/api/status', (req, res) => {
  const username = req.user.normalizedUsername;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramUsage = Math.round((usedMem / totalMem) * 100);

  // CPU Usage calculation
  const cpus = os.cpus();
  const load = os.loadavg();
  const cpuUsage = Math.round(load[0] * 100) || 12;

  res.json({
    botOnline: telegram.getUserBotStatus(username),
    system: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      uptime: os.uptime(),
      ram: {
        total: Math.round(totalMem / (1024 * 1024 * 1024) * 10) / 10,
        used: Math.round(usedMem / (1024 * 1024 * 1024) * 10) / 10,
        percentage: ramUsage
      },
      cpu: {
        model: cpus[0].model,
        cores: cpus.length,
        percentage: Math.min(cpuUsage, 100)
      }
    }
  });
});

// 2. Get User Settings
app.get('/api/settings', (req, res) => {
  const username = req.user.normalizedUsername;
  const db = readDatabase();
  const user = db.users[username];

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  res.json(user.settings);
});

// 3. Update User Settings
app.post('/api/settings', async (req, res) => {
  const settings = req.body;
  const username = req.user.normalizedUsername;
  const db = readDatabase();
  const user = db.users[username];

  if (!user) {
    return res.status(404).json({ success: false, message: 'User profile not found.' });
  }

  user.settings = settings;
  
  if (writeDatabase(db)) {
    logger.info(`Settings updated for user: ${username}`, 'Server');
    
    // Dynamically start or update user-specific Telegram Bot
    const apiConfig = {
      apiKey: settings.geminiApiKey,
      safeMode: settings.safeMode,
      systemPrompt: settings.systemPrompt,
      model: settings.geminiModel
    };

    if (settings.telegramToken) {
      const started = await telegram.startUserBot(username, settings.telegramToken, settings.adminChatId, apiConfig);
      return res.json({ success: true, botStatus: started, message: 'Settings saved. Telegram Bot updated.' });
    } else {
      await telegram.stopUserBot(username);
      return res.json({ success: true, botStatus: false, message: 'Settings saved. Telegram Bot disabled.' });
    }
  } else {
    res.status(500).json({ success: false, message: 'Failed to write user settings database file.' });
  }
});

// 4. Get System Logs
app.get('/api/logs', (req, res) => {
  res.json(logger.getLogs());
});

// 5. Run Command directly in Web Terminal (Isolated to user workspace)
app.post('/api/terminal/run', async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, output: 'No command specified.' });
  }

  const username = req.user.normalizedUsername;
  const db = readDatabase();
  const user = db.users[username];
  const workspaceDir = path.join(process.cwd(), 'workspaces', 'user_' + username);

  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  const execResult = await executor.executeCommand(command, { 
    safeMode: user.settings.safeMode,
    username,
    cwd: workspaceDir
  });
  res.json(execResult);
});

// 6. Test Telegram Connection
app.post('/api/telegram/test', async (req, res) => {
  const { token, adminChatId } = req.body;
  if (!token || !adminChatId) {
    return res.status(400).json({ success: false, message: 'Token and Admin Chat ID are required.' });
  }

  try {
    await telegram.sendDirectMessage(token, adminChatId, '🔔 *Test Notification!*\nKoneksi dari Brolaws Control Hub berhasil diverifikasi. Telegram Bot Anda sudah siap digunakan!');
    res.json({ success: true, message: 'Test message sent successfully to Telegram!' });
  } catch (e) {
    res.status(500).json({ success: false, message: `Telegram Test Failed: ${e.message}` });
  }
});

// 7. Chat Directly with AI Agent from Browser (User-isolated settings & workspaces)
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, text: 'No message specified.' });
  }

  const username = req.user.normalizedUsername;
  const db = readDatabase();
  const user = db.users[username];

  const apiConfig = {
    apiKey: user.settings.geminiApiKey,
    safeMode: user.settings.safeMode,
    systemPrompt: user.settings.systemPrompt,
    model: user.settings.geminiModel,
    username
  };

  const agentResult = await llm.runAgent(message, apiConfig, history);
  res.json(agentResult);
});

// Catch-all route to serve Vite index.html in production
if (fs.existsSync(clientBuildPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  logger.info(`Brolaws Server listening on port ${PORT}`, 'Server');
});
