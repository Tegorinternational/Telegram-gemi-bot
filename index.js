const express = require('express');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');
const app = express();
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

// Initialize Firebase Admin SDK
const serviceAccount = require('./telegram-gemi-bot-firebase-adminsdk-ni8ej-f9ed8c5c35.json'); // Update the path
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Enable CORS for all routes
app.use(cors());

// Mock user data storage
let username = '';
let profilePhotoUrl = '';
let userId = '';

// Bot start command
bot.start(async (ctx) => {
    username = ctx.from.username;
    userId = ctx.from.id;

    const photos = await bot.telegram.getUserProfilePhotos(userId);
    if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await bot.telegram.getFile(fileId);
        profilePhotoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    } else {
        profilePhotoUrl = '';
    }

    // Log userId to ensure it's being set correctly
    console.log('Storing user data:', { username, profilePhotoUrl, userId });

    // Ensure userId is a valid string
    if (userId) {
        // Store user data in Firestore
        await db.collection('users').doc(userId.toString()).set({
            username,
            profilePhotoUrl
        });
    } else {
        console.error('userId is not set correctly:', userId);
    }

    await ctx.reply(`Hello, ${username}, Choose an option:`, Markup.inlineKeyboard([
        Markup.button.url('Launch', 'https://telegram.me/TgGemiAiBot/TgGemiAiWeb')
    ]));
});


// New /referral command
bot.command('referral', async (ctx) => {
    const userId = ctx.from.id;
    const referralLink = `https://telegram.me/TgGemiAiBot?start=${userId}`;

    await ctx.reply(`Share this link to refer friends: ${referralLink}`);
});





// Handle referral link start
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/start')) {
        const referrerId = ctx.message.text.split(' ')[1];
        if (referrerId) {
            const referredUsername = ctx.from.username || 'custom';
            const referredId = ctx.from.id;

            // Store referral information in Firestore
            try {
                await db.collection('referrals').add({
                    referrerId,
                    referredId,
                    referredUsername,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log('Referral added:', { referrerId, referredId, referredUsername });
            } catch (error) {
                console.error('Error adding referral:', error);
            }
        }
    }
});




// Endpoint to get user data
app.get('/user', async (req, res) => {
    // Ensure userId is set before attempting to retrieve data
    if (userId) {
        const doc = await db.collection('users').doc(userId.toString()).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(doc.data());
    } else {
        res.status(400).json({ error: 'userId is not set' });
    }
});



// Endpoint to get referral data
app.get('/referrals', async (req, res) => {
    try {
        const snapshot = await db.collection('referrals').get();
        const referrals = snapshot.docs.map(doc => ({
            referrerId: doc.data().referrerId,
            referredId: doc.data().referredId,
            referredUsername: doc.data().referredUsername,
            timestamp: doc.data().timestamp
        }));
        res.json(referrals);
    } catch (error) {
        console.error('Error getting referrals:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

bot.launch();

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
