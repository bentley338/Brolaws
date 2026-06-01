const { exec } = require('child_process');
const logger = require('./logger');
const path = require('path');
const fs = require('fs');

// Whitelist of common applications we can open directly on Windows
const WINDOWS_APPS = {
  notepad: 'notepad.exe',
  calc: 'calc.exe',
  chrome: 'start chrome',
  explorer: 'explorer.exe',
  paint: 'mspaint.exe',
  cmd: 'start cmd.exe'
};

// Background helper to fetch first YouTube video ID for instant autoplay!
async function getFirstYoutubeVideoId(query) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) return null;
    const html = await response.text();
    
    // Extract videoId from YouTube initial data json block
    const videoIdMatch = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
    if (videoIdMatch && videoIdMatch[1]) {
      return videoIdMatch[1];
    }
    return null;
  } catch (e) {
    logger.warn(`Failed to fetch direct YouTube video ID: ${e.message}`, 'Executor');
    return null;
  }
}
// Command Broker State
let pendingCommands = {}; // username -> array of pending command objects
let commandResolvers = {}; // commandId -> callback resolver function
let activeAgents = {}; // username -> timestamp of last heartbeat poll

function isAgentOnline(username) {
  return activeAgents[username] && (Date.now() - activeAgents[username] < 6000);
}

function getPendingCommands(username) {
  activeAgents[username] = Date.now(); // update heartbeat
  const list = pendingCommands[username] || [];
  pendingCommands[username] = []; // clear queue after retrieval
  return list;
}

function registerHeartbeat(username) {
  activeAgents[username] = Date.now();
}

function resolveCommand(id, success, output, screenshotBase64, username) {
  // If screenshot payload is uploaded by the local runner, save it in the user's isolated workspace
  if (screenshotBase64) {
    const workspaceDir = path.join(process.cwd(), 'workspaces', 'user_' + username);
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }
    const screenshotPath = path.join(workspaceDir, 'screenshot.png');
    try {
      fs.writeFileSync(screenshotPath, Buffer.from(screenshotBase64, 'base64'));
      logger.info(`[Broker] Custom screenshot saved for user: ${username}`, 'Executor');
    } catch (e) {
      logger.error(`[Broker] Error saving uploaded screenshot: ${e.message}`, 'Executor');
    }
  }

  if (commandResolvers[id]) {
    commandResolvers[id]({ success, output });
    delete commandResolvers[id];
    return true;
  }
  return false;
}

// Native PowerShell Screenshot Capturer
function takeScreenshot(options = {}) {
  return new Promise((resolve) => {
    const username = options.username || 'admin';
    const workspaceDir = path.join(process.cwd(), 'workspaces', 'user_' + username);
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }
    const outputPath = path.join(workspaceDir, 'screenshot.png');

    // If local client agent is online, request screen capture from agent
    if (isAgentOnline(username)) {
      logger.info(`[Broker] Requesting remote screen capture from client agent of: ${username}`, 'Executor');
      
      const commandId = `cmd-${Date.now()}-${Math.round(Math.random() * 100000)}`;
      if (!pendingCommands[username]) {
        pendingCommands[username] = [];
      }
      pendingCommands[username].push({
        id: commandId,
        command: 'screenshot',
        type: 'screenshot'
      });

      // 15 seconds timeout
      const timeout = setTimeout(() => {
        delete commandResolvers[commandId];
        resolve({ success: false, error: 'Screenshot capture from client timed out.' });
      }, 15000);

      commandResolvers[commandId] = (result) => {
        clearTimeout(timeout);
        if (result.success) {
          resolve({ success: true, path: outputPath });
        } else {
          resolve({ success: false, error: result.output || 'Agent failed to capture display.' });
        }
      };
      return;
    }

    resolve({ success: false, error: 'Local agent is offline.' });
  });
}

function executeCommand(commandStr, options = { safeMode: false }) {
  return new Promise((resolve) => {
    const username = options.username || 'admin';
    const workspaceDir = path.join(process.cwd(), 'workspaces', 'user_' + username);
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    // Safe mode basic checks
    if (options.safeMode) {
      const dangerousTerms = ['rmdir /s', 'del /f /s', 'format', 'shutdown', 'registry'];
      const lowercaseCmd = commandStr.toLowerCase();
      if (dangerousTerms.some(term => lowercaseCmd.includes(term))) {
        const errMsg = 'Execution blocked: Command violates Safe Mode policy.';
        logger.warn(errMsg, 'Executor');
        return resolve({ success: false, output: errMsg, error: true });
      }
    }

    // If client runner agent is online, forward command to queue
    if (isAgentOnline(username)) {
      logger.info(`[Broker] Forwarding command to agent ${username}: "${commandStr}"`, 'Executor');
      
      const commandId = `cmd-${Date.now()}-${Math.round(Math.random() * 100000)}`;
      if (!pendingCommands[username]) {
        pendingCommands[username] = [];
      }
      pendingCommands[username].push({
        id: commandId,
        command: commandStr,
        type: 'shell'
      });

      // 20 seconds timeout
      const timeout = setTimeout(() => {
        delete commandResolvers[commandId];
        resolve({
          success: false,
          output: `⚠️ Timeout: PC lu gak merespon perintah dalam 20 detik, bro. Coba cek CMD di PC lu apakah agent-nya masih jalan.`,
          error: true
        });
      }, 20000);

      commandResolvers[commandId] = (result) => {
        clearTimeout(timeout);
        resolve({
          success: result.success,
          output: result.output,
          error: !result.success
        });
      };
      return;
    }

    // Fallback: local agent is offline
    const errMsg = `Waduh bro! PC lu belum terhubung ke Brolaws nih.\n\nSilahkan download Brolaws Agent di Dashboard lu, terus jalanin perintah:\n  node brolaws-agent.js\ndi CMD komputer lu biar gw bisa dapet akses aman ke PC lu! Gas!`;
    logger.warn(`[Broker] Command blocked: Agent for ${username} is offline.`, 'Executor');
    resolve({ success: false, output: errMsg, error: true });
  });
}

module.exports = {
  executeCommand,
  takeScreenshot,
  getPendingCommands,
  resolveCommand,
  isAgentOnline,
  registerHeartbeat
};
