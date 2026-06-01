const { Telegraf } = require('telegraf');
const logger = require('./logger');
const llm = require('./llm');

let activeBots = {};

async function startUserBot(username, token, adminChatId, apiConfig) {
  if (!token) {
    logger.warn(`Cannot start Telegram Bot for ${username}: Token is empty.`, 'Telegram');
    return false;
  }

  const userBot = activeBots[username];
  if (
    userBot &&
    userBot.token === token &&
    userBot.adminChatId === adminChatId &&
    JSON.stringify(userBot.apiConfig) === JSON.stringify(apiConfig)
  ) {
    logger.info(`Telegram Bot for ${username} is already running with up-to-date configuration.`, 'Telegram');
    return true;
  }

  // Stop previous instance if running
  await stopUserBot(username);

  try {
    logger.info(`Initializing Telegram Bot for ${username}...`, 'Telegram');
    const bot = new Telegraf(token);

    bot.start((ctx) => {
      const chatId = ctx.chat.id.toString();
      if (adminChatId && chatId !== adminChatId.toString()) {
        ctx.reply('❌ Access Denied: You are not authorized to control this Brolaws server.');
        logger.warn(`[User: ${username}] Unauthorized startup request from Chat ID: ${chatId}`, 'Telegram');
        return;
      }
      ctx.reply('🤖 Brolaws PC Controller Activated! Gw siap dengerin semua perintah lu, bro.\n\nKetik apa aja buat ngobrol santuy sama AI, atau ketik garis miring buat command shell langsung (contoh: /ss, /dir).');
    });

    bot.on('text', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const text = ctx.message.text;

      // Access restriction
      if (adminChatId && chatId !== adminChatId.toString()) {
        ctx.reply('❌ Access Denied: You are not authorized.');
        logger.warn(`[User: ${username}] Access denied to User ID ${chatId} sending: "${text}"`, 'Telegram');
        return;
      }

      logger.info(`[User: ${username}] Received Telegram message: "${text}"`, 'Telegram');

      // Direct screenshot capture hook
      const lowerText = text.trim().toLowerCase();
      if (['/ss', 'ss', 'screenshot', '/screenshot'].includes(lowerText)) {
        try {
          const executor = require('./executor');
          const res = await executor.takeScreenshot({ username });
          if (res.success) {
            await ctx.replyWithPhoto({ source: res.path }, { caption: '📸 Ini screenshot desktop lu saat ini, bro! (Brolaws Active Screen)' });
            logger.info(`[User: ${username}] Screenshot sent directly to Telegram chat.`, 'Telegram');
          } else {
            await ctx.reply(`❌ Gagal mengambil screenshot: ${res.error}`);
          }
        } catch (e) {
          logger.error(`[User: ${username}] Error taking/sending screenshot via Telegram: ${e.message}`, 'Telegram');
          await ctx.reply(`❌ Error taking/sending screenshot: ${e.message}`);
        }
        return;
      }
      
      // Let the user know the agent is processing
      await ctx.sendChatAction('typing');

      try {
        const result = await llm.runAgent(text, { ...apiConfig, username });
        await ctx.reply(result.text);
      } catch (err) {
        logger.error(`[User: ${username}] Error processing command: ${err.message}`, 'Telegram');
        await ctx.reply(`❌ Gagal mengeksekusi perintah: ${err.message}`);
      }
    });

    // Launch bot polling asynchronously so it NEVER blocks the server API thread!
    bot.launch()
      .then(() => {
        logger.info(`Telegram Bot for ${username} successfully launched and polling!`, 'Telegram');
        // Send startup notification if chat ID is set
        if (adminChatId) {
          bot.telegram.sendMessage(adminChatId, `🟢 *Brolaws Server Connected!*\nSistem berhasil diaktifkan kembali untuk akun ${username}. Siap menerima perintah dari Anda secara langsung.`)
            .catch(e => logger.warn(`[User: ${username}] Failed to send startup message: ${e.message}`, 'Telegram'));
        }
      })
      .catch(err => {
        logger.error(`[User: ${username}] Failed to launch Telegram Bot polling for ${username}: ${err.message}`, 'Telegram');
        delete activeBots[username];
      });
    
    activeBots[username] = {
      bot,
      token,
      adminChatId,
      apiConfig
    };

    logger.info(`Telegram Bot for ${username} initialized and launch sequence started.`, 'Telegram');
    return true;
  } catch (err) {
    logger.error(`[User: ${username}] Failed to launch Telegram Bot: ${err.message}`, 'Telegram');
    delete activeBots[username];
    return false;
  }
}

async function stopUserBot(username) {
  const userBot = activeBots[username];
  if (userBot) {
    logger.info(`Stopping Telegram Bot polling for ${username}...`, 'Telegram');
    try {
      await userBot.bot.stop();
    } catch (e) {
      logger.error(`Error stopping bot for ${username}: ${e.message}`, 'Telegram');
    }
    delete activeBots[username];
    logger.info(`Telegram Bot for ${username} stopped.`, 'Telegram');
  }
}

async function stopAllBots() {
  const usernames = Object.keys(activeBots);
  for (const username of usernames) {
    await stopUserBot(username);
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

function getUserBotStatus(username) {
  return activeBots[username] !== undefined;
}

module.exports = {
  startUserBot,
  stopUserBot,
  stopAllBots,
  sendDirectMessage,
  getUserBotStatus
};
