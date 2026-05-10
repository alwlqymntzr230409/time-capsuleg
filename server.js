const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== الإعدادات ====================
const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";
const EMAILJS_PUBLIC_KEY = "yMWdxIn35VlreN0l_";
const EMAILJS_SERVICE_ID = "service_zo9ni5b";
const EMAILJS_TEMPLATE_ID = "template_y1f36sr";

const BOT_TOKEN = "8637511787:AAFp5o5T1fFPy0z0PiMpFQRyfM68xQl_clY";
const CHAT_ID = "8658052616";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let capsules = [];
const sentCapsules = new Set();

// ==================== استقبال الكبسولة ====================
app.post('/api/capsules', async (req, res) => {
  const { email, message, unlockDate } = req.body;
  const capsuleId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  
  const capsule = {
    id: capsuleId,
    email,
    message,
    unlockDate: new Date(unlockDate).toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  capsules.push(capsule);
  
  // إرسال إشعار للبوت
  try {
    await sendTelegramNotification(capsule);
  } catch (err) {
    console.error('خطأ في إرسال إشعار تيليجرام:', err.message);
  }
  
  res.json({ status: 'success', capsuleId, message: 'تم إرسال الكبسولة للمراجعة' });
});

// ==================== عرض الكبسولات ====================
app.get('/api/capsules', (req, res) => {
  const result = capsules.map(c => ({
    id: c.id,
    email: c.email,
    message: c.message,
    unlockDate: c.unlockDate,
    status: c.status,
    createdAt: c.createdAt
  }));
  res.json(result);
});

// ==================== Webhook تيليجرام ====================
app.post('/api/telegram-webhook', (req, res) => {
  const { callback_query } = req.body;
  
  if (callback_query) {
    const data = callback_query.data;
    const msg = callback_query.message;
    const chatId = msg.chat.id;
    const [action, capsuleId] = data.split('_');
    
    const capsule = capsules.find(c => c.id === capsuleId);
    
    if (!capsule) {
      answerCallback(chatId, callback_query.id, '❌ الكبسولة غير موجودة');
      return res.sendStatus(200);
    }
    
    if (action === 'approve') {
      capsule.status = 'approved';
      editMessageToApproved(chatId, msg.message_id, capsule);
      answerCallback(chatId, callback_query.id, '✅ تم قبول الكبسولة - ستصل في موعدها');
    } else if (action === 'reject') {
      capsule.status = 'rejected';
      editMessageToRejected(chatId, msg.message_id, capsule);
      answerCallback(chatId, callback_query.id, '❌ تم رفض الرسالة للأسف');
    }
  }
  
  res.sendStatus(200);
});

// ==================== دوال تيليجرام ====================
async function sendTelegramNotification(capsule) {
  const unlockDate = new Date(capsule.unlockDate).toLocaleString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  
  const text = `📬 كبسولة زمنية جديدة

👤 البريد: ${capsule.email}
📝 الرسالة: ${capsule.message.length > 100 ? capsule.message.slice(0, 100) + '...' : capsule.message}
📅 موعد الفتح: ${unlockDate}

⚖️ اختر:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ قبول', callback_data: `approve_${capsule.id}` },
        { text: '❌ رفض', callback_data: `reject_${capsule.id}` }
      ]
    ]
  };

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      reply_markup: keyboard
    })
  });
}

function editMessageToApproved(chatId, messageId, capsule) {
  const text = `📬 كبسولة زمنية - تم القبول ✅

👤 البريد: ${capsule.email}
📅 موعد الفتح: ${new Date(capsule.unlockDate).toLocaleString('ar-SA')}
📌 الحالة: ⏳ في الانتظار - ستصل في موعدها`;

  fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text
    })
  }).catch(err => console.error('خطأ في تعديل الرسالة:', err.message));
}

function editMessageToRejected(chatId, messageId, capsule) {
  const text = `📬 كبسولة زمنية - تم الرفض ❌

👤 البريد: ${capsule.email}
📌 الحالة: 🚫 لقد تم رفض الرسالة للأسف`;

  fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text
    })
  }).catch(err => console.error('خطأ في تعديل الرسالة:', err.message));
}

function answerCallback(chatId, callbackId, text) {
  fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text: text,
      show_alert: false
    })
  }).catch(err => console.error('خطأ في الرد:', err.message));
}

// ==================== فحص الكبسولات وإرسالها ====================
function checkAndSend() {
  const now = new Date();
  console.log(`🔍 فحص ${capsules.length} كبسولة - ${now.toLocaleString('ar-SA')}`);
  
  capsules.forEach(c => {
    if (c.status === 'approved' && new Date(c.unlockDate) <= now && !sentCapsules.has(c.id)) {
      console.log(`🚀 جاري إرسال الكبسولة إلى: ${c.email}`);
      
      fetch(EMAILJS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: c.email,
            message: c.message,
            time: new Date().toLocaleString('ar-SA')
          }
        })
      })
      .then(res => res.text())
      .then(text => {
        console.log(`📩 رد EmailJS: ${text}`);
        if (text === 'OK') {
          console.log(`✅ تم إرسال الإيميل بنجاح إلى: ${c.email}`);
          sentCapsules.add(c.id);
          c.status = 'sent';
          
          // إشعار تيليجرام بالإرسال
          fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: CHAT_ID,
              text: `✅ تم إرسال الكبسولة\n📧 إلى: ${c.email}\n📅 في: ${new Date().toLocaleString('ar-SA')}`
            })
          }).catch(err => console.error('خطأ إشعار الإرسال:', err.message));
        } else {
          console.error(`❌ فشل الإرسال. الرد: ${text}`);
        }
      })
      .catch(err => console.error(`❌ خطأ اتصال: ${err.message}`));
    }
  });
}

// فحص كل 10 ثواني
setInterval(checkAndSend, 10000);

// ==================== تشغيل السيرفر ====================
app.listen(PORT, () => {
  console.log(`🚀 Time Capsule server يعمل على المنفذ ${PORT}`);
  console.log(`🤖 بوت تيليجرام مفعل`);
  console.log(`📬 فحص الكبسولات كل 10 ثواني`);
});
