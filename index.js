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

    const refLink = `https://telegram.me/TgGemiAiBot?start=${userId}`;
    await ctx.reply(`Hello, ${username}, Choose an option`, 
    Markup.inlineKeyboard([
        [Markup.button.url('Play & Earn', 'https://telegram.me/TgGemiAiBot/TgGemiAiWeb')],
        [Markup.button.callback('Get Referral Link', 'referral')]
    ]));
});


bot.action('referral', async (ctx) => {
  const userId = ctx.from.id;
  username = ctx.from.username;
  const refLink = `https://telegram.me/TgGemiAiBot?start=${userId}`;
  
  
  const forwardKeyboard = Markup.inlineKeyboard([
        [Markup.button.switchToChat('Forward to a Friend',`\nTake your welcome bonus:\n💸 2,000 Coins 2X multiplier for the first 24 hours\n🔥 10,000 Coins 3X multiplier if you have Telegram Premium.\n\nUse referral link:\n${refLink}`)]
    ]);
  
    ctx.answerCbQuery(); // Stop loading state
    await ctx.reply(`Hello ${username},\n\nInvite friends and get bonuses for everyone who signs up 🎁\n\nYour referral link: ${refLink}`, forwardKeyboard); 
    
});



bot.command('referrals', async (ctx) => {
    const referrerId = ctx.message.text.split(' ')[1];
    const newUserId = ctx.from.id;
    const newUsername = ctx.from.username;
    
    const photos = await bot.telegram.getUserProfilePhotos(newUserId);
    let refProfilePhotoUrl = '';
    if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await bot.telegram.getFile(fileId);
        refProfilePhotoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    }

    // Save new user information
    users[newUserId] = { username: newUsername, refProfilePhotoUrl };

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
app.get('/user/:id', (req, res) => {
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
