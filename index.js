const express = require('express');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');
const dotenv = require('dotenv');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion } = require('firebase/firestore');

dotenv.config();
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(cors()); // Enable CORS for all routes

// Initialize Firebase Client SDK
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const fireDbApp = initializeApp(firebaseConfig);
const db = getFirestore(fireDbApp);

// Function to get user profile photo URL
const getUserProfilePhotoUrl = async (userId) => {
    const photos = await bot.telegram.getUserProfilePhotos(userId);
    if (photos.total_count > 0) {
        const fileId = photos.photos[0][0].file_id;
        const file = await bot.telegram.getFile(fileId);
        return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    }
    return '';
};

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username;
    const referrerId = ctx.startPayload;

    const profilePhotoUrl = await getUserProfilePhotoUrl(userId);

    // Save user information to Firestore
    await setDoc(doc(db, 'users', userId.toString()), {
        username,
        profilePhotoUrl
    });

    // Handle referrals
    if (referrerId) {
        const referrerDoc = await getDoc(doc(db, 'users', referrerId));
        if (referrerDoc.exists()) {
            const referralDoc = await getDoc(doc(db, 'referrals', referrerId));
            if (referralDoc.exists()) {
                await updateDoc(doc(db, 'referrals', referrerId), {
                    referrals: arrayUnion(userId)
                });
            } else {
                await setDoc(doc(db, 'referrals', referrerId), {
                    referrals: [userId]
                });
            }
        }
    }

    const refLink = `https://telegram.me/TgGemiAiBot?start=${userId}`;
    await ctx.reply(`Hello, ${username}, Choose an option`,
        Markup.inlineKeyboard([
            [Markup.button.url('Play & Earn', 'https://telegram.me/TgGemiAiBot/TgGemiAiWeb')],
            [Markup.button.callback('Get Referral Link', 'referral')]
        ])
    );
});

bot.action('referral', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username;
    const refLink = `https://telegram.me/TgGemiAiBot?start=${userId}`;

    const forwardKeyboard = Markup.inlineKeyboard([
        [Markup.button.switchToChat('Forward to a Friend', `\nTake your welcome bonus:\n💸 2,000 Coins 2X multiplier for the first 24 hours\n🔥 10,000 Coins 3X multiplier if you have Telegram Premium.\n\nUse referral link:\n${refLink}`)]
    ]);

    ctx.answerCbQuery(); // Stop loading state
    await ctx.reply(`Hello ${username},\n\nInvite friends and get bonuses for everyone who signs up 🎁\n\nYour referral link: ${refLink}`, forwardKeyboard);
});

bot.command('referrals', async (ctx) => {
    const referrerId = ctx.message.text.split(' ')[1];
    const newUserId = ctx.from.id;
    const newUsername = ctx.from.username;

    const refProfilePhotoUrl = await getUserProfilePhotoUrl(newUserId);

    // Save new user information to Firestore
    await setDoc(doc(db, 'users', newUserId.toString()), {
        username: newUsername,
        profilePhotoUrl: refProfilePhotoUrl
    });

    // Add the new user to the referrer's referrals in Firestore
    const referrerDoc = await getDoc(doc(db, 'users', referrerId));
    if (referrerDoc.exists()) {
        const referralDoc = await getDoc(doc(db, 'referrals', referrerId));
        if (referralDoc.exists()) {
            await updateDoc(doc(db, 'referrals', referrerId), {
                referrals: arrayUnion(newUserId)
            });
        } else {
            await setDoc(doc(db, 'referrals', referrerId), {
                referrals: [newUserId]
            });
        }
    }

    await ctx.reply(`Hello, ${newUsername}, you have joined using a referral link.`);
});

// Endpoint to get user info
app.get('/user/:id', async (req, res) => {
    const userId = req.params.id;
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
        res.json(userDoc.data());
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Endpoint to get referral info
app.get('/referrals/:id', async (req, res) => {
    const userId = req.params.id;
    const referralsDoc = await getDoc(doc(db, 'referrals', userId));
    if (referralsDoc.exists()) {
        const referralIds = referralsDoc.data().referrals || [];
        const referralData = [];
        for (const referralId of referralIds) {
            const userDoc = await getDoc(doc(db, 'users', referralId.toString()));
            if (userDoc.exists()) {
                referralData.push(userDoc.data());
            }
        }
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
