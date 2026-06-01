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

// Native PowerShell Screenshot Capturer
function takeScreenshot() {
  return new Promise((resolve) => {
    const outputPath = path.join(process.cwd(), 'screenshot.png');
    
    // Commands to load Drawing assembly, capture the PrimaryScreen bounds, and save as PNG
    const psCommand = `powershell -NoProfile -Command "
      [Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null;
      [Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
      $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height;
      $graphics = [System.Drawing.Graphics]::FromImage($bmp);
      $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size);
      $bmp.Save('${outputPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png);
      $graphics.Dispose();
      $bmp.Dispose();
    "`;

    logger.info('Capturing remote desktop screenshot via native PowerShell...', 'Executor');

    exec(psCommand, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Screenshot capture failed: ${error.message}`, 'Executor');
        return resolve({ success: false, error: error.message });
      }
      logger.info('Screenshot captured successfully and saved to disk.', 'Executor');
      resolve({ success: true, path: outputPath });
    });
  });
}

function executeCommand(commandStr, options = { safeMode: false }) {
  return new Promise((resolve) => {
    logger.cmd(`Executing: "${commandStr}"`, 'Executor');

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

    // Special handlers to open apps on Windows asynchronously
    let finalCommand = commandStr;
    const lowerCmd = commandStr.trim().toLowerCase();

    // Screenshot triggers
    if (['ss', '/ss', 'screenshot', '/screenshot'].includes(lowerCmd)) {
      takeScreenshot().then(res => {
        resolve({
          success: res.success,
          output: res.success ? 'Screenshot captured successfully.' : `Failed: ${res.error}`,
          error: !res.success
        });
      });
      return;
    }
    
    // Music playing handler (Auto-plays direct YouTube watch video link!)
    const musicPrefixes = ['setel lagu ', 'putar lagu ', 'play ', 'setel musik ', 'putar musik '];
    const matchedPrefix = musicPrefixes.find(prefix => lowerCmd.startsWith(prefix));
    
    if (matchedPrefix) {
      const songQuery = commandStr.substring(matchedPrefix.length).trim();
      logger.info(`Searching direct YouTube autoplay link for "${songQuery}"...`, 'Executor');
      
      getFirstYoutubeVideoId(songQuery).then(videoId => {
        let finalCmd = '';
        if (videoId) {
          finalCmd = `start "" "https://www.youtube.com/watch?v=${videoId}"`;
          logger.info(`Found video ID "${videoId}". Autoplay watch link initiated.`, 'Executor');
        } else {
          const escapedQuery = encodeURIComponent(songQuery);
          finalCmd = `start "" "https://www.youtube.com/results?search_query=${escapedQuery}"`;
          logger.info(`Direct match failed. Falling back to search results page.`, 'Executor');
        }
        
        runChildProcess(finalCmd, resolve);
      });
      return;
    }
    
    if (WINDOWS_APPS[lowerCmd]) {
      finalCommand = WINDOWS_APPS[lowerCmd];
    } else if (lowerCmd.startsWith('open ')) {
      const appName = lowerCmd.substring(5).trim();
      if (WINDOWS_APPS[appName]) {
        finalCommand = WINDOWS_APPS[appName];
      } else {
        // Try starting the program directly using Windows start command
        finalCommand = `start "" "${appName}"`;
      }
    }

    runChildProcess(finalCommand, resolve);
  });
}

function runChildProcess(finalCommand, resolve) {
  exec(finalCommand, { cwd: process.cwd() }, (error, stdout, stderr) => {
    const outText = stdout ? stdout.toString() : '';
    const errText = stderr ? stderr.toString() : '';
    
    if (error) {
      logger.error(`Command failed: ${error.message}`, 'Executor');
      return resolve({
        success: false,
        output: outText + '\n' + errText + '\n' + error.message,
        error: true
      });
    }

    logger.info(`Command completed successfully.`, 'Executor');
    resolve({
      success: true,
      output: outText || errText || 'Command executed successfully (no output).',
      error: false
    });
  });
}

module.exports = {
  executeCommand,
  takeScreenshot
};
