const express = require('express');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');
const app = express();
const dotenv = require('dotenv');




if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}



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

bot.launch();

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
