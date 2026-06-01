const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const logger = require('./services/logger');

const DB_PATH = path.join(__dirname, 'database', 'store.json');

async function diagnose() {
  logger.info('Starting Gemini API diagnostics...', 'Diagnostics');
  
  if (!fs.existsSync(DB_PATH)) {
    logger.error('No store.json database file found. Cannot load API key.', 'Diagnostics');
    return;
  }

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (e) {
    logger.error(`Failed to read database file: ${e.message}`, 'Diagnostics');
    return;
  }

  const apiKey = settings.geminiApiKey;
  if (!apiKey) {
    logger.error('No Gemini API Key found in settings! Please save one in the web dashboard first.', 'Diagnostics');
    return;
  }

  logger.info(`Validating key starting with: "${apiKey.substring(0, 6)}..."`, 'Diagnostics');

  try {
    // We will use the GoogleGenerativeAI client to list models
    // Since older versions of @google/generative-ai might not expose listModels directly on the main class in some exports,
    // we can also test direct fetch to see the available models.
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Attempt standard model list
    // Some SDK versions have a listModels method on the client instance or via ModelService
    logger.info('Querying Google Model Service list...', 'Diagnostics');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      const err = await response.text();
      logger.error(`API endpoint returned error: ${err}`, 'Diagnostics');
      return;
    }

    const data = await response.json();
    if (!data.models || data.models.length === 0) {
      logger.warn('Google API returned 0 models for this key.', 'Diagnostics');
      return;
    }

    logger.info('==== AVAILABLE MODELS FOR YOUR KEY ====', 'Diagnostics');
    data.models.forEach(m => {
      const shortName = m.name.replace('models/', '');
      logger.info(`Name: "${shortName}" (Supports: ${m.supportedGenerationMethods.join(', ')})`, 'Diagnostics');
    });
    logger.info('======================================', 'Diagnostics');

  } catch (err) {
    logger.error(`Diagnostics failed: ${err.message}`, 'Diagnostics');
  }
}

diagnose();
