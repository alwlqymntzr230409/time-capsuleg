const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// إعدادات EmailJS
const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";
const PUBLIC_KEY = "yMWdxIn35VlreN0l_";
const SERVICE_ID = "service_zo9ni5b";
const TEMPLATE_ID = "template_y1f36sr";

let capsules = [];

// مجموعة الكبسولات اللي تم إرسالها (لمنع التكرار)
const sentCapsules = new Set();

// استقبال كبسولة جديدة
app.post('/api/capsules', (req, res) => {
  const { email, message, unlockDate } = req.body;
  const id = `${email}-${unlockDate}`;
  
  capsules.push({
    id,
    email,
    message,
    unlockDate: new Date(unlockDate),
    status: 'locked'
  });
  
  console.log('✅ كبسولة جديدة:', email, '| تفتح:', new Date(unlockDate).toLocaleString('ar-SA'));
  res.json({ status: 'success' });
});

// عرض الكبسولات
app.get('/api/capsules', (req, res) => {
  // تحديث حالة الكبسولات اللي انرسلت
  const result = capsules.map(c => ({
    email: c.email,
    message: c.message,
    unlockDate: c.unlockDate,
    status: sentCapsules.has(c.id) ? 'sent' : c.status
  }));
  res.json(result);
});

// ==================== فحص الكبسولات وإرسالها ====================
function checkAndSend() {
  const now = new Date();
  
  capsules.forEach(c => {
    if (c.unlockDate <= now && c.status === 'locked' && !sentCapsules.has(c.id)) {
      console.log('🚀 إرسال كبسولة إلى:', c.email);
      
      fetch(EMAILJS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: SERVICE_ID,
          template_id: TEMPLATE_ID,
          user_id: PUBLIC_KEY,
          template_params: {
            to_email: c.email,
            message: c.message,
            time: new Date().toLocaleString('ar-SA')
          }
        })
      })
      .then(res => res.text())
      .then(text => {
        if (text === 'OK') {
          console.log('✅ تم الإرسال بنجاح إلى:', c.email);
          sentCapsules.add(c.id);
          c.status = 'sent';
        } else {
          console.error('❌ فشل الإرسال:', text);
        }
      })
      .catch(err => console.error('❌ خطأ:', err.message));
    }
  });
}

// فحص كل 10 ثواني
setInterval(checkAndSend, 10000);

app.listen(PORT, () => {
  console.log(`🚀 Time Capsule server يعمل على المنفذ ${PORT}`);
  console.log('📬 السيرفر جاهز لإرسال الكبسولات تلقائياً');
});
