const express = require('express');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');
const app = express();
const dotenv = require('dotenv');
const localPort = 3000



if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}



const bot = new Telegraf(process.env.BOT_TOKEN);

// Enable CORS for all routes
app.use(cors());

// Mock user data storage
let username = '';
let profilePhotoUrl = '';


bot.start( async (ctx) => {
    username = ctx.from.username;
    const userId = ctx.from.id;
    
    const photos = await bot.telegram.getUserProfilePhotos(userId);
    if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await bot.telegram.getFile(fileId);
        profilePhotoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    } else {
        profilePhotoUrl = '';
    }
    
    await ctx.reply(`Hello, ${username}, Choose an option:`, Markup.inlineKeyboard([
        Markup.button.url('Launch', 'https://telegram.me/TgGemiAiBot/TgGemiAiWeb')
    ]));
});


// Endpoint to get the username
app.get('/user', (req, res) => {
    res.json({ username, profilePhotoUrl });
});



if (process.env.NODE_ENV === 'production') {
    const port = process.env.PORT || {localPort};
    bot.launch({
        webhook: {
            domain: process.env.RENDER_EXTERNAL_URL,
            port: port
        }
    });
    
    app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

} else {
    bot.launch();
    app.listen(localPort, () => {
    console.log(`Server running on port ${localPort}`);
});
}