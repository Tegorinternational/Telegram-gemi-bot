const express = require('express');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000; // Use port 3000 as default

const bot = new Telegraf(process.env.BOT_TOKEN);

// Enable CORS for all routes
app.use(cors());

// Mock user data storage
let username = '';

bot.start((ctx) => {
    username = ctx.from.username;
    ctx.reply(`Hello, ${username}, Choose an option:`, Markup.inlineKeyboard([
        Markup.button.url('Launch', 'https://telegram.me/TgGemiAiBot/TgGemiAiWeb')
    ]));
});

// Endpoint to get the username
app.get('/username', (req, res) => {
    res.json({ username });
});

// Launch bot with webhook in production
if (process.env.NODE_ENV === 'production') {
    const webhookUrl = process.env.RENDER_EXTERNAL_URL + '/webhook'; // Adjust as per your Render setup
    bot.launch({
        webhook: {
            domain: webhookUrl,
            port: port // Use the same port as the Express server
        }
    });
    console.log(`Bot launched with webhook at ${webhookUrl}`);
} else {
    // Launch bot in polling mode in development
    bot.launch();
    console.log('Bot launched in polling mode');
}

// Start Express server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
