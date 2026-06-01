const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const executor = require('./executor');
const logger = require('./logger');

const SYSTEM_PROMPT = `You are Brolaws, the ultimate cool, super-smart hacker buddy and Windows PC Automation Assistant. Your sole purpose is to help the user operate, automate, and control their Windows machine.

Gaya Bahasa & Kepribadian (Persona):
1. Bicara wajib pakai BAHASA GAUL INDONESIA jaman sekarang (casual, kekinian, nyaman, dan gak bosenin!).
2. Gunakan sebutan "lu" untuk user dan "gw" untuk diri lu sendiri. Pakai kata-kata gaul kayak "bro", "siap bos", "otw", "done", "mantap", "santuy", "gokil", "gas".
3. Bikin user ngerasa nyaman banget kayak lagi ngobrol sama temen deket yang jago komputer/hacking. Tanggapan harus ramah, asyik, enerjik, tapi tetep sat-set-sat-set dalam ngejalanin tugas!

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

  if (!apiKey) {
    logger.warn('Gemini API key is not configured. Falling back to Rule-Based parsing.', 'LLM Agent');
    return await handleRuleBased(userInput, safeMode);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = apiConfig.model || "gemini-1.5-flash";
    
    logger.info(`Initializing Gemini Agent with model: ${modelName}`, 'LLM Agent');
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT
    });

    logger.info(`Starting agent execution for: "${userInput}"`, 'LLM Agent');
    
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
    logger.info(`Agent initial thought: ${text}`, 'LLM Agent');

    // Agent Loop (Max 3 iterations to avoid infinite runs)
    let iter = 0;
    const maxIter = 3;
    const thoughts = [text];

    while (iter < maxIter) {
      const toolCalls = extractToolCalls(text);
      if (!toolCalls || toolCalls.length === 0) {
        break;
      }

      logger.info(`Agent decided to call ${toolCalls.length} tool(s).`, 'LLM Agent');
      const toolResults = [];

      for (const call of toolCalls) {
        const { tool, args } = call;
        logger.info(`Calling tool: ${tool} with args: ${JSON.stringify(args)}`, 'LLM Agent');
        
        let result = '';
        if (tool === 'execute_command') {
          const res = await executor.executeCommand(args.command, { safeMode });
          result = res.output;
        } else if (tool === 'read_file') {
          result = await readFileHelper(args.filePath);
        } else if (tool === 'write_file') {
          result = await writeFileHelper(args.filePath, args.content);
        } else if (tool === 'list_dir') {
          result = await listDirHelper(args.dirPath);
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
      logger.info(`Agent step thought: ${text}`, 'LLM Agent');
      iter++;
    }

    return {
      success: true,
      text: thoughts[thoughts.length - 1],
      thoughts: thoughts
    };

  } catch (err) {
    logger.error(`Error in Gemini Agent loop: ${err.message}`, 'LLM Agent');
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
async function readFileHelper(filePath) {
  try {
    const safePath = path.resolve(process.cwd(), filePath);
    if (!safePath.startsWith(process.cwd())) {
      return "Access denied: Path is outside workspace.";
    }
    if (!fs.existsSync(safePath)) {
      return "Error: File does not exist.";
    }
    return fs.readFileSync(safePath, 'utf-8');
  } catch (e) {
    return `Error reading file: ${e.message}`;
  }
}

async function writeFileHelper(filePath, content) {
  try {
    const safePath = path.resolve(process.cwd(), filePath);
    if (!safePath.startsWith(process.cwd())) {
      return "Access denied: Path is outside workspace.";
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

async function listDirHelper(dirPath = '.') {
  try {
    const safePath = path.resolve(process.cwd(), dirPath);
    if (!safePath.startsWith(process.cwd())) {
      return "Access denied: Path is outside workspace.";
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
async function handleRuleBased(userInput, safeMode) {
  const lower = userInput.trim().toLowerCase();
  
  // Rule checks for opening apps
  if (lower.startsWith('open ') || ['notepad', 'calc', 'chrome', 'explorer', 'paint', 'cmd'].includes(lower)) {
    const res = await executor.executeCommand(userInput, { safeMode });
    return {
      success: true,
      text: `[Rule-based execution] Saya telah menjalankan perintah pembuka aplikasi untuk: "${userInput}".\n\nOutput:\n\`\`\`\n${res.output}\n\`\`\``,
      thoughts: [`Mendeteksi permintaan pembukaan aplikasi: "${userInput}"`]
    };
  }

  // General shell commands if starting with "/"
  if (userInput.startsWith('/')) {
    const cmd = userInput.substring(1);
    const res = await executor.executeCommand(cmd, { safeMode });
    return {
      success: true,
      text: `[Rule-based shell] Perintah shell "/${cmd}" berhasil dijalankan.\n\nOutput:\n\`\`\`\n${res.output}\n\`\`\``,
      thoughts: [`Mengeksekusi perintah shell manual: "${cmd}"`]
    };
  }

  return {
    success: true,
    text: `Yo, woy! Gw Brolaws Automated Agent. 🤖\n\nBiar kecerdasan gw makin gokil dan bisa mikir otonom (bisa bikin file, nyari web, dsb), tinggal isi **Gemini API Key** lu di menu **Bot Telegram** pada dashboard web, bro.\n\nSekarang, lu masih tetep bisa perintah gw secara langsung:\n- Ketik nama aplikasi kayak \`notepad\`, \`calc\`, atau \`chrome\` untuk gw bukain instan.\n- Ketik \`setel lagu [judul]\` buat gw puterin otomatis tanpa klik.\n- Ketik perintah shell langsung diawali garis miring, contoh: \`/dir\` atau \`/ping google.com\`.`,
    thoughts: ['Menyarankan setup API Key karena input tidak cocok dengan shortcode rule-based.']
  };
}

module.exports = {
  runAgent
};
