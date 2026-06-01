/**
 * Brolaws Local Client Agent Runner
 * ----------------------------------------------------
 * Runs on the user's local Windows PC.
 * Establishes a secure remote-connection with the Brolaws Public SaaS Web Broker,
 * executes shell tasks, captures local desktop screens, and streams output.
 * 
 * Usage:
 *   node brolaws-agent.js [serverUrl] [sessionToken]
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');

// Dynamic injection placeholders (pre-filled on download!)
const INJECTED_SERVER = "%%BROLAWS_SERVER%%";
const INJECTED_TOKEN = "%%BROLAWS_TOKEN%%";

const serverUrl = process.argv[2] || (INJECTED_SERVER.startsWith("%%") ? "http://localhost:5000" : INJECTED_SERVER);
const sessionToken = process.argv[3] || (INJECTED_TOKEN.startsWith("%%") ? "" : INJECTED_TOKEN);

if (!sessionToken) {
  console.error("❌ Error: Session token is missing! Please provide it as an argument or download a pre-configured agent.");
  console.log("Usage: node brolaws-agent.js [serverUrl] [sessionToken]");
  process.exit(1);
}

console.log("====================================================");
console.log("🔥 BROLOWS REMOTE CLIENT AGENT ACTIVE!");
console.log(`📡 Broker Server: ${serverUrl}`);
console.log(`👤 Client Machine: ${os.hostname()} (${os.platform()})`);
console.log("====================================================");

// Configs
const POLL_INTERVAL_MS = 1500;
let isPolling = false;

// HTTP request helper
function makeRequest(urlStr, method, headers = {}, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (e) => reject(e));

    if (bodyObj) {
      req.write(JSON.stringify(bodyObj));
    }
    req.end();
  });
}

// Background helper to fetch first YouTube video ID for instant autoplay!
async function getFirstYoutubeVideoId(query) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    // Since fetch might not be available in older Node.js, we implement a simple native fetch
    const response = await makeRequest(searchUrl, 'GET', {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const html = response.data;
    
    // Extract videoId from YouTube initial data json block
    const videoIdMatch = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
    if (videoIdMatch && videoIdMatch[1]) {
      return videoIdMatch[1];
    }
    return null;
  } catch (e) {
    console.warn(`[Warn] Failed to fetch direct YouTube video ID: ${e.message}`);
    return null;
  }
}

// Local Screenshot capture
function takeLocalScreenshot() {
  return new Promise((resolve) => {
    const tempPath = path.join(os.tmpdir(), `ss_${Date.now()}.png`);
    
    const psCommand = `powershell -NoProfile -Command "
      [Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null;
      [Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
      $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height;
      $graphics = [System.Drawing.Graphics]::FromImage($bmp);
      $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size);
      $bmp.Save('${tempPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png);
      $graphics.Dispose();
      $bmp.Dispose();
    "`;

    console.log("📸 Snapping display bounds via native PowerShell...");

    exec(psCommand, (error) => {
      if (error) {
        console.error(`❌ Screenshot capture failed: ${error.message}`);
        return resolve({ success: false, error: error.message });
      }

      try {
        const base64Image = fs.readFileSync(tempPath, { encoding: 'base64' });
        fs.unlinkSync(tempPath); // clean up
        console.log("📸 Screenshot converted successfully.");
        resolve({ success: true, base64: base64Image });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  });
}

// Execution dispatch
async function executeLocal(cmd) {
  const { id, command, type } = cmd;
  console.log(`\n📥 Received Command [${type}] ID: ${id}`);
  console.log(`   Command string: "${command}"`);

  // 1. Screenshot Handler
  if (type === 'screenshot' || ['ss', '/ss', 'screenshot', '/screenshot'].includes(command.trim().toLowerCase())) {
    const res = await takeLocalScreenshot();
    if (res.success) {
      await uploadResult(id, true, "Screenshot captured successfully.", res.base64);
    } else {
      await uploadResult(id, false, `Failed to capture screenshot: ${res.error}`);
    }
    return;
  }

  // 2. Music Player Autoplay Handler
  const lowerCmd = command.trim().toLowerCase();
  const musicPrefixes = ['setel lagu ', 'putar lagu ', 'play ', 'setel musik ', 'putar musik '];
  const matchedPrefix = musicPrefixes.find(prefix => lowerCmd.startsWith(prefix));

  if (matchedPrefix) {
    const songQuery = command.substring(matchedPrefix.length).trim();
    console.log(`🎵 Autoplay YouTube query: "${songQuery}"`);
    
    const videoId = await getFirstYoutubeVideoId(songQuery);
    let finalCmd = '';
    if (videoId) {
      finalCmd = `start "" "https://www.youtube.com/watch?v=${videoId}"`;
    } else {
      finalCmd = `start "" "https://www.youtube.com/results?search_query=${encodeURIComponent(songQuery)}"`;
    }
    
    exec(finalCmd, (error) => {
      if (error) {
        uploadResult(id, false, `Music player execution failed: ${error.message}`);
      } else {
        uploadResult(id, true, `Music player autoplay initiated successfully.`);
      }
    });
    return;
  }

  // 3. Application Whitelist Shortcodes
  const WINDOWS_APPS = {
    notepad: 'notepad.exe',
    calc: 'calc.exe',
    chrome: 'start chrome',
    explorer: 'explorer.exe',
    paint: 'mspaint.exe',
    cmd: 'start cmd.exe'
  };

  let finalCommand = command;
  if (WINDOWS_APPS[lowerCmd]) {
    finalCommand = WINDOWS_APPS[lowerCmd];
  } else if (lowerCmd.startsWith('open ')) {
    const appName = lowerCmd.substring(5).trim();
    if (WINDOWS_APPS[appName]) {
      finalCommand = WINDOWS_APPS[appName];
    } else {
      finalCommand = `start "" "${appName}"`;
    }
  }

  // 4. Standard shell execute
  console.log(`💻 Executing child process: "${finalCommand}"`);
  exec(finalCommand, (error, stdout, stderr) => {
    const outText = stdout ? stdout.toString() : '';
    const errText = stderr ? stderr.toString() : '';
    
    if (error) {
      console.error(`❌ Process error: ${error.message}`);
      uploadResult(id, false, outText + '\n' + errText + '\n' + error.message);
    } else {
      console.log(`✅ Command completed successfully.`);
      uploadResult(id, true, outText || errText || 'Command executed successfully (no output).');
    }
  });
}

// Upload outcome
async function uploadResult(id, success, output, screenshotBase64 = null) {
  try {
    const response = await makeRequest(`${serverUrl}/api/agent/result`, 'POST', {}, {
      id,
      success,
      output,
      screenshot: screenshotBase64
    });
    
    if (response.statusCode === 200) {
      console.log(`📤 Result for command ${id} reported successfully.`);
    } else {
      console.error(`❌ Failed to send result: Status ${response.statusCode}`);
    }
  } catch (e) {
    console.error(`❌ Network error while uploading result: ${e.message}`);
  }
}

// Polling loop
async function pollBroker() {
  if (isPolling) return;
  isPolling = true;

  try {
    const res = await makeRequest(`${serverUrl}/api/agent/poll`, 'GET');
    
    if (res.statusCode === 401) {
      console.error("❌ Unauthorized session! Please check your Session Token.");
      process.exit(1);
    }
    
    if (res.statusCode === 200) {
      const data = JSON.parse(res.data);
      if (data.commands && data.commands.length > 0) {
        for (const cmd of data.commands) {
          await executeLocal(cmd);
        }
      }
    }
  } catch (e) {
    console.warn(`[Connection Alert] Server unreachable: ${e.message}`);
  } finally {
    isPolling = false;
  }
}

// Tick loop
setInterval(pollBroker, POLL_INTERVAL_MS);
console.log("🟢 Listening for remote orders...");
