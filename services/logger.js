const logs = [];
const MAX_LOGS = 200;

function log(level, message, context = '') {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, context };
  logs.push(logEntry);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  const formatted = `[${timestamp}] [${level.toUpperCase()}] ${context ? `[${context}] ` : ''}${message}`;
  console.log(formatted);
}

module.exports = {
  info: (message, context) => log('info', message, context),
  warn: (message, context) => log('warn', message, context),
  error: (message, context) => log('error', message, context),
  cmd: (message, context) => log('cmd', message, context),
  getLogs: () => logs
};
