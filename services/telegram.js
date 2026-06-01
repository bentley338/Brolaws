const { Telegraf } = require('telegraf');
const logger = require('./logger');
const llm = require('./llm');

let botInstance = null;
let currentToken = null;
let currentAdminChatId = null;
let currentApiConfig = {};

async function startBot(token, adminChatId, apiConfig) {
  if (!token) {
    logger.warn('Cannot start Telegram Bot: Token is empty.', 'Telegram');
    return false;
  }

  // If already running with same config, do nothing
  if (
    botInstance &&
    currentToken === token &&
    currentAdminChatId === adminChatId &&
    JSON.stringify(currentApiConfig) === JSON.stringify(apiConfig)
  ) {
    logger.info('Telegram Bot is already running with up-to-date configuration.', 'Telegram');
    return true;
  }

  // Stop previous instance if running
  await stopBot();

  try {
    logger.info('Initializing Telegram Bot...', 'Telegram');
    const bot = new Telegraf(token);

    bot.start((ctx) => {
      const chatId = ctx.chat.id.toString();
      if (adminChatId && chatId !== adminChatId.toString()) {
        ctx.reply('❌ Access Denied: You are not authorized to control this OpenClaw server.');
        logger.warn(`Unauthorized startup request from Chat ID: ${chatId}`, 'Telegram');
        return;
      }
      ctx.reply('🤖 OpenClaw Control Hub Activated! Saya siap mendengarkan perintah Anda.\n\nKetik apa saja untuk berbicara dengan AI Agent, atau gunakan garis miring untuk shell command (contoh: /dir).');
    });

    bot.on('text', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const text = ctx.message.text;

      // Access restriction
      if (adminChatId && chatId !== adminChatId.toString()) {
        ctx.reply('❌ Access Denied: You are not authorized.');
        logger.warn(`Access denied to User ID ${chatId} sending: "${text}"`, 'Telegram');
        return;
      }

      logger.info(`Received Telegram message: "${text}"`, 'Telegram');
      
      // Let the user know the agent is processing
      await ctx.sendChatAction('typing');

      try {
        const result = await llm.runAgent(text, apiConfig);
        await ctx.reply(result.text);
      } catch (err) {
        logger.error(`Error processing command: ${err.message}`, 'Telegram');
        await ctx.reply(`❌ Gagal mengeksekusi perintah: ${err.message}`);
      }
    });

    // Launch bot polling asynchronously so it NEVER blocks the server API thread!
    bot.launch()
      .then(() => {
        logger.info('Telegram Bot successfully launched and polling!', 'Telegram');
        // Send startup notification if chat ID is set
        if (adminChatId) {
          bot.telegram.sendMessage(adminChatId, '🟢 *OpenClaw Server Connected!*\nSistem berhasil diaktifkan kembali. Siap menerima perintah dari Anda secara langsung.')
            .catch(e => logger.warn(`Failed to send startup message: ${e.message}`, 'Telegram'));
        }
      })
      .catch(err => {
        logger.error(`Failed to launch Telegram Bot polling: ${err.message}`, 'Telegram');
        botInstance = null;
      });
    
    botInstance = bot;
    currentToken = token;
    currentAdminChatId = adminChatId;
    currentApiConfig = apiConfig;

    logger.info('Telegram Bot initialized and launch sequence started.', 'Telegram');
    return true;
  } catch (err) {
    logger.error(`Failed to launch Telegram Bot: ${err.message}`, 'Telegram');
    botInstance = null;
    return false;
  }
}

async function stopBot() {
  if (botInstance) {
    logger.info('Stopping Telegram Bot polling...', 'Telegram');
    try {
      await botInstance.stop();
    } catch (e) {
      logger.error(`Error stopping bot: ${e.message}`, 'Telegram');
    }
    botInstance = null;
    currentToken = null;
    currentAdminChatId = null;
    logger.info('Telegram Bot stopped.', 'Telegram');
  }
}

async function sendDirectMessage(token, adminChatId, message) {
  if (!token || !adminChatId) return false;
  try {
    const tempBot = new Telegraf(token);
    await tempBot.telegram.sendMessage(adminChatId, message);
    return true;
  } catch (e) {
    logger.error(`Failed to send direct Telegram message: ${e.message}`, 'Telegram');
    throw e;
  }
}

function getStatus() {
  return botInstance !== null;
}

module.exports = {
  startBot,
  stopBot,
  sendDirectMessage,
  getStatus
};
