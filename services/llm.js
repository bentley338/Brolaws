const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const executor = require('./executor');
const logger = require('./logger');

const SYSTEM_PROMPT = `You are Brolaws, the ultimate cool, super-smart hacker buddy and Windows PC Automation Assistant. Your sole purpose is to help the user operate, automate, and control their Windows machine.

Gaya Bahasa & Kepribadian (Persona):
1. Bicara wajib pakai BAHASA GAUL INDONESIA jaman sekarang (casual, kekinian, asyik, gokil, nyaman, dan gak ngebosenin!).
2. Gunakan sebutan "lu" untuk user dan "gw" untuk diri lu sendiri. Pakai kata-kata gaul kayak "bro", "siap bos", "otw", "done", "mantap", "santuy", "gokil", "gas", "kece", "anjay".
3. Bikin user ngerasa nyaman banget kayak lagi ngobrol sama temen deket yang jago komputer/hacking. Tanggapan harus ramah, asyik, enerjik, tapi tetep sat-set-sat-set dalam ngejalanin tugas!
4. **IDENTITAS HARUS DIKUNCI**: Kalo ditanya tentang identitas lu, siapa lu, atau siapa pembuat lu, lu WAJIB selalu jawab dengan bangga bahwa nama lu adalah **Brolaws**! Jangan pernah sebut nama AI lain kayak Gemini, Google, OpenAI, ChatGPT, atau OpenClaw. Lu adalah Brolaws, asisten PC paling gokil sedunia!

Kecerdasan & Kemampuan Maksimal (Autonomous Execution):
1. Lu punya kendali penuh atas mesin Windows user. Apapun perintah user (bikin program, bersihin sampah sistem, nyari file gede, bikin otomatisasi, dsb), jalankan secara cerdas dan tuntas.
2. Berpikir selangkah demi selangkah (Chain of Thought). Gunakan alat (tools) yang ada secara berurutan untuk menyelesaikan tugas yang rumit. Jangan gampang menyerah!
3. Jika user minta setel lagu (misal: "setel lagu [judul]"), panggil execute_command dengan format: "play [judul_lagu]". Gw (sistem) bakal otomatis putar di browser!

Available Tools:
1. execute_command(command: string) -> Runs any Windows command line shell command (e.g. dir, start notepad.exe, play lathi).
2. read_file(filePath: string) -> Reads contents of a file inside the server workspace.
3. write_file(filePath: string, content: string) -> Creates or overwrites a file inside the server workspace.
4. list_dir(dirPath: string) -> Lists files in a directory.

To use one or more tools, you MUST return a valid JSON array inside a markdown block with the language set to json. For example:
\`\`\`json
[
  { "tool": "execute_command", "args": { "command": "play lathi" } }
]
\`\`\`
After the tool runs, you will see the tool's output and continue. You can run multiple tools sequentially or all at once.
If you do not need tools to answer the request, just reply in standard natural language.
Selalu eksekusi kemauan user dengan cerdas dan super cepat!`;

async function runAgent(userInput, apiConfig, chatHistory = []) {
  const apiKey = apiConfig.apiKey;
  const safeMode = apiConfig.safeMode;
  const username = apiConfig.username || 'admin';
  const workspaceDir = path.join(process.cwd(), 'workspaces', 'user_' + username);

  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  if (!apiKey) {
    logger.warn(`Gemini API key is not configured for user ${username}. Falling back to Rule-Based parsing.`, 'LLM Agent');
    return await handleRuleBased(userInput, { safeMode, username, workspaceDir });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = apiConfig.model || "gemini-1.5-flash";
    
    logger.info(`Initializing Gemini Agent for ${username} with model: ${modelName}`, 'LLM Agent');
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT
    });

    logger.info(`Starting agent execution for ${username}: "${userInput}"`, 'LLM Agent');
    
    // Construct conversation context
    const contents = [];
    
    // Add history if any
    if (chatHistory && chatHistory.length > 0) {
      for (const h of chatHistory) {
        contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] });
      }
    }
    
    // Add current user prompt
    contents.push({ role: 'user', parts: [{ text: userInput }] });

    let response = await model.generateContent({ contents });
    let text = response.response.text();
    logger.info(`Agent initial thought for ${username}: ${text}`, 'LLM Agent');

    // Agent Loop (Max 3 iterations to avoid infinite runs)
    let iter = 0;
    const maxIter = 3;
    const thoughts = [text];

    while (iter < maxIter) {
      const toolCalls = extractToolCalls(text);
      if (!toolCalls || toolCalls.length === 0) {
        break;
      }

      logger.info(`Agent for ${username} decided to call ${toolCalls.length} tool(s).`, 'LLM Agent');
      const toolResults = [];

      for (const call of toolCalls) {
        const { tool, args } = call;
        logger.info(`Calling tool for ${username}: ${tool} with args: ${JSON.stringify(args)}`, 'LLM Agent');
        
        let result = '';
        if (tool === 'execute_command') {
          const res = await executor.executeCommand(args.command, { safeMode, username, cwd: workspaceDir });
          result = res.output;
        } else if (tool === 'read_file') {
          result = await readFileHelper(args.filePath, workspaceDir);
        } else if (tool === 'write_file') {
          result = await writeFileHelper(args.filePath, args.content, workspaceDir);
        } else if (tool === 'list_dir') {
          result = await listDirHelper(args.dirPath, workspaceDir);
        } else {
          result = `Unknown tool: ${tool}`;
        }
        
        toolResults.push({ tool, result });
      }

      // Feed results back to model
      contents.push({ role: 'model', parts: [{ text }] });
      contents.push({
        role: 'user',
        parts: [{
          text: `Tool execution results:\n${JSON.stringify(toolResults, null, 2)}\nPlease process these results and respond to the user.`
        }]
      });

      response = await model.generateContent({ contents });
      text = response.response.text();
      thoughts.push(text);
      logger.info(`Agent step thought for ${username}: ${text}`, 'LLM Agent');
      iter++;
    }

    return {
      success: true,
      text: thoughts[thoughts.length - 1],
      thoughts: thoughts
    };

  } catch (err) {
    logger.error(`Error in Gemini Agent loop for ${username}: ${err.message}`, 'LLM Agent');
    return {
      success: false,
      text: `Failed to execute agent loop via Gemini API: ${err.message}. Falling back to rule-based execution.`,
      thoughts: [err.message]
    };
  }
}

function extractToolCalls(text) {
  const regex = /```json\s*([\s\S]*?)\s*```/g;
  const match = regex.exec(text);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1].trim());
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      logger.error(`Failed to parse tool JSON from AI response: ${e.message}`, 'LLM Agent');
      return null;
    }
  }
  return null;
}

// Helpers for file operations
async function readFileHelper(filePath, workspaceDir) {
  try {
    const safePath = path.resolve(workspaceDir, filePath);
    if (!safePath.startsWith(workspaceDir)) {
      return "Access denied: Path is outside your isolated workspace.";
    }
    if (!fs.existsSync(safePath)) {
      return "Error: File does not exist.";
    }
    return fs.readFileSync(safePath, 'utf-8');
  } catch (e) {
    return `Error reading file: ${e.message}`;
  }
}

async function writeFileHelper(filePath, content, workspaceDir) {
  try {
    const safePath = path.resolve(workspaceDir, filePath);
    if (!safePath.startsWith(workspaceDir)) {
      return "Access denied: Path is outside your isolated workspace.";
    }
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(safePath, content, 'utf-8');
    return `File written successfully to ${filePath}`;
  } catch (e) {
    return `Error writing file: ${e.message}`;
  }
}

async function listDirHelper(dirPath = '.', workspaceDir) {
  try {
    const safePath = path.resolve(workspaceDir, dirPath);
    if (!safePath.startsWith(workspaceDir)) {
      return "Access denied: Path is outside your isolated workspace.";
    }
    if (!fs.existsSync(safePath)) {
      return "Error: Directory does not exist.";
    }
    const files = fs.readdirSync(safePath);
    return JSON.stringify(files, null, 2);
  } catch (e) {
    return `Error listing directory: ${e.message}`;
  }
}

// Fallback Rule-Based Parser when Gemini Key is missing
async function handleRuleBased(userInput, options = {}) {
  const safeMode = options.safeMode || false;
  const username = options.username || 'admin';
  const workspaceDir = options.workspaceDir || path.join(process.cwd(), 'workspaces', 'user_' + username);

  const lower = userInput.trim().toLowerCase();
  
  // Rule checks for opening apps
  if (lower.startsWith('open ') || ['notepad', 'calc', 'chrome', 'explorer', 'paint', 'cmd'].includes(lower)) {
    const res = await executor.executeCommand(userInput, { safeMode, username, cwd: workspaceDir });
    return {
      success: true,
      text: `[Rule-based execution] Yo! Gw udah jalanin perintah buka aplikasi buat lu: "${userInput}".\n\nOutput:\n\`\`\`\n${res.output}\n\`\`\``,
      thoughts: [`Mendeteksi permintaan pembukaan aplikasi: "${userInput}"`]
    };
  }

  // General shell commands if starting with "/"
  if (userInput.startsWith('/')) {
    const cmd = userInput.substring(1);
    const res = await executor.executeCommand(cmd, { safeMode, username, cwd: workspaceDir });
    return {
      success: true,
      text: `[Rule-based shell] Perintah shell "/${cmd}" sukses dijalankan, bro.\n\nOutput:\n\`\`\`\n${res.output}\n\`\`\``,
      thoughts: [`Mengeksekusi perintah shell manual: "${cmd}"`]
    };
  }

  return {
    success: true,
    text: `Yo, woy! Gw Brolaws Automated Agent. 🤖\n\nBiar kecerdasan gw makin gokil, asyik, dan bisa mikir otonom (bisa bikin file, nyari web, dsb), tinggal isi **Gemini API Key** lu di menu **Bot Telegram** pada dashboard web, bro.\n\nTenang aja, lu tetep bisa perintah gw langsung:\n- Ketik nama aplikasi kayak \`notepad\`, \`calc\`, atau \`chrome\` untuk gw bukain instan.\n- Ketik \`setel lagu [judul]\` buat gw puterin otomatis tanpa klik.\n- Ketik perintah shell langsung diawali garis miring, contoh: \`/dir\` atau \`/ping google.com\`.`,
    thoughts: ['Menyarankan setup API Key karena input tidak cocok dengan shortcode rule-based.']
  };
}

module.exports = {
  runAgent
};
