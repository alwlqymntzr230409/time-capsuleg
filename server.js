const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// إعدادات EmailJS الخاصة بك
const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";
const PUBLIC_KEY = "yMWdxIn35VlreN0l_";
const SERVICE_ID = "service_zo9ni5b";
const TEMPLATE_ID = "template_y1f36sr";

let capsules = [];

app.post('/api/capsules', (req, res) => {
  const { email, message, unlockDate } = req.body;
  capsules.push({
    email,
    message,
    unlockDate: new Date(unlockDate),
    status: 'locked'
  });
  console.log('✅ كبسولة جديدة:', email, 'فتح في:', unlockDate);
  res.json({ status: 'success' });
});

app.get('/api/capsules', (req, res) => {
  res.json(capsules);
});

function checkCapsules() {
  const now = new Date();
  console.log(`🔍 [${now.toLocaleString('ar-SA')}] فحص ${capsules.length} كبسولة...`);
  
  capsules.forEach((c, index) => {
    if (c.unlockDate <= now && c.status === 'locked') {
      console.log('🚀 محاولة إرسال الكبسولة إلى:', c.email);
      
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
      .then(response => response.text())
      .then(text => {
        console.log('📩 رد EmailJS:', text);
        if (text === 'OK') {
          console.log('✅ تم إرسال الإيميل بنجاح إلى:', c.email);
          c.status = 'sent';
        } else {
          console.error('❌ فشل إرسال الإيميل. الرد:', text);
        }
      })
      .catch(err => console.error('❌ خطأ في الاتصال بـ EmailJS:', err.message));
    }
  });
}

// فحص كل 30 ثانية
setInterval(checkCapsules, 30000);

app.listen(PORT, () => {
  console.log(`🚀 Time Capsule server يعمل على المنفذ ${PORT}`);
});
