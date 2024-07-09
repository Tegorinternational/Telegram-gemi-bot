const express = require('express');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Enable CORS for all routes
app.use(cors());

// Mock user data storage
let users = {}; // { userId: { username, profilePhotoUrl } }
let referrals = {}; // { referrerId: [userId, userId, ...] }
let userid = '';
let username = '';
let profilePhotoUrl = '';

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    userid = ctx.from.id;
    username = ctx.from.username;
    const referrerId = ctx.startPayload;

    const photos = await bot.telegram.getUserProfilePhotos(userId);
    
    if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await bot.telegram.getFile(fileId);
        profilePhotoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    }

    // Save user information
    users[userId] = { username, profilePhotoUrl };

    // Handle referrals
    if (referrerId && users[referrerId]) {
        if (!referrals[referrerId]) {
            referrals[referrerId] = [];
        }
        referrals[referrerId].push(userId);
    }

    const refLink = `https://telegram.me/TgGemiAiBot?start=${userId} : /start`;
    await ctx.reply(`Hello, ${username}, Choose an option: ${refLink}`, Markup.inlineKeyboard([
        Markup.button.url('Launch', 'https://telegram.me/TgGemiAiBot/TgGemiAiWeb'),
        Markup.button.url('Your Referral Link', `${refLink}`)
    ]));
});

bot.command('referral', async (ctx) => {
    const referrerId = ctx.message.text.split(' ')[1];
    const newUserId = ctx.from.id;
    const newUsername = ctx.from.username;
    
    const photos = await bot.telegram.getUserProfilePhotos(newUserId);
    let profilePhotoUrl = '';
    if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await bot.telegram.getFile(fileId);
        profilePhotoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    }

    // Save new user information
    users[newUserId] = { username: newUsername, profilePhotoUrl };

    // Add the new user to the referrer's referrals
    if (users[referrerId]) {
        if (!referrals[referrerId]) {
            referrals[referrerId] = [];
        }
        referrals[referrerId].push(newUserId);
    }

    await ctx.reply(`Hello, ${newUsername}, you have joined using a referral link.`);
});

// Endpoint to get user info
app.get('/user', (req, res) => {
    res.json({ userid, username, profilePhotoUrl });
});

// Endpoint to get referral info
app.get('/referrals/:id', (req, res) => {
    const userId = req.params.id;
    if (referrals[userId]) {
        const referralData = referrals[userId].map(referralId => users[referralId]);
        res.json(referralData);
    } else {
        res.status(404).json({ error: 'No referral found' });
    }
});

bot.launch();

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
