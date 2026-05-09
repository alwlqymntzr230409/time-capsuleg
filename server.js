const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// إعدادات EmailJS
const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";
const PUBLIC_KEY = "yMWdxIn35VlreN0l_";
const SERVICE_ID = "service_zo9ni5b";
const TEMPLATE_ID = "template_y1f36sr";

// قائمة الكبسولات (في الذاكرة - للسيرفر الحي)
let capsules = [];

// استقبال كبسولة جديدة
app.post('/api/capsules', (req, res) => {
  const { email, message, unlockDate } = req.body;
  capsules.push({
    email,
    message,
    unlockDate: new Date(unlockDate),
    status: 'locked'
  });
  res.json({ status: 'success' });
});

// عرض الكبسولات
app.get('/api/capsules', (req, res) => {
  res.json(capsules);
});

// فحص الكبسولات وإرسالها
function checkCapsules() {
  const now = new Date();
  capsules.forEach(c => {
    if (c.unlockDate <= now && c.status === 'locked') {
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
      }).then(() => {
        c.status = 'sent';
      }).catch(err => console.error('Error:', err));
    }
  });
}

// فحص كل 30 ثانية
setInterval(checkCapsules, 30000);

app.listen(PORT, () => {
  console.log(`🚀 Time Capsule server running on port ${PORT}`);
});
