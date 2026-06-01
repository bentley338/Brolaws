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

app.use(cors());
app.use(express.json());

// Persistent store setup
const DB_DIR = path.join(__dirname, 'database');
const DB_PATH = path.join(DB_DIR, 'store.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR);
}

const DEFAULT_SETTINGS = {
  telegramToken: '',
  adminChatId: '',
  geminiApiKey: '',
  safeMode: false,
  geminiModel: 'gemini-1.5-flash',
  systemPrompt: 'You are OpenClaw, an advanced autonomous AI agent running on the user\'s local Windows machine.'
};

function readSettings() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    logger.error(`Error reading settings from DB: ${e.message}`, 'Server');
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (e) {
    logger.error(`Error writing settings to DB: ${e.message}`, 'Server');
    return false;
  }
}

// Automatically start Telegram Bot on startup if credentials exist
const initialSettings = readSettings();
if (initialSettings.telegramToken) {
  logger.info('Auto-starting Telegram Bot on startup...', 'Server');
  const apiConfig = {
    apiKey: initialSettings.geminiApiKey,
    safeMode: initialSettings.safeMode,
    systemPrompt: initialSettings.systemPrompt,
    model: initialSettings.geminiModel
  };
  telegram.startBot(initialSettings.telegramToken, initialSettings.adminChatId, apiConfig)
    .then(started => {
      if (started) logger.info('Telegram Bot auto-started successfully.', 'Server');
      else logger.warn('Telegram Bot failed to auto-start. Check credentials.', 'Server');
    });
}

// Serve client production build static files if present
const clientBuildPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
}

// API Endpoints

// 1. Get Status & System Metrics
app.get('/api/status', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramUsage = Math.round((usedMem / totalMem) * 100);

  // CPU Usage calculation
  const cpus = os.cpus();
  let totalCpuTime = 0;
  let totalIdleTime = 0;
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalCpuTime += cpu.times[type];
    }
    totalIdleTime += cpu.times.idle;
  });
  
  const load = os.loadavg();
  const cpuUsage = Math.round(load[0] * 100) || 12; // Standard idle load estimation

  res.json({
    botOnline: telegram.getStatus(),
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

// 2. Get Settings
app.get('/api/settings', (req, res) => {
  const settings = readSettings();
  res.json(settings);
});

// 3. Update Settings
app.post('/api/settings', async (req, res) => {
  const settings = req.body;
  
  if (writeSettings(settings)) {
    logger.info('System settings updated via web dashboard.', 'Server');
    
    // Dynamically start or update Telegram Bot
    const apiConfig = {
      apiKey: settings.geminiApiKey,
      safeMode: settings.safeMode,
      systemPrompt: settings.systemPrompt,
      model: settings.geminiModel
    };

    if (settings.telegramToken) {
      const started = await telegram.startBot(settings.telegramToken, settings.adminChatId, apiConfig);
      return res.json({ success: true, botStatus: started, message: 'Settings saved. Telegram Bot updated.' });
    } else {
      await telegram.stopBot();
      return res.json({ success: true, botStatus: false, message: 'Settings saved. Telegram Bot disabled.' });
    }
  } else {
    res.status(500).json({ success: false, message: 'Failed to write settings database file.' });
  }
});

// 4. Get System Logs
app.get('/api/logs', (req, res) => {
  res.json(logger.getLogs());
});

// 5. Run Command directly in Web Terminal
app.post('/api/terminal/run', async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, output: 'No command specified.' });
  }

  const settings = readSettings();
  const execResult = await executor.executeCommand(command, { safeMode: settings.safeMode });
  res.json(execResult);
});

// 6. Test Telegram Connection
app.post('/api/telegram/test', async (req, res) => {
  const { token, adminChatId } = req.body;
  if (!token || !adminChatId) {
    return res.status(400).json({ success: false, message: 'Token and Admin Chat ID are required.' });
  }

  try {
    await telegram.sendDirectMessage(token, adminChatId, '🔔 *Test Notification!*\nKoneksi dari OpenClaw Control Hub berhasil diverifikasi. Telegram Bot Anda sudah siap digunakan!');
    res.json({ success: true, message: 'Test message sent successfully to Telegram!' });
  } catch (e) {
    res.status(500).json({ success: false, message: `Telegram Test Failed: ${e.message}` });
  }
});

// 7. Chat Directly with AI Agent from Browser
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, text: 'No message specified.' });
  }

  const settings = readSettings();
  const apiConfig = {
    apiKey: settings.geminiApiKey,
    safeMode: settings.safeMode,
    systemPrompt: settings.systemPrompt,
    model: settings.geminiModel
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
  logger.info(`OpenClaw Server listening on port ${PORT}`, 'Server');
});
