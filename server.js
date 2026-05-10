const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// إعدادات EmailJS الخاصة بك
const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";
const PUBLIC_KEY = "yMWdxIn35VlreN0l_"; // حسابك
const SERVICE_ID = "service_zo9ni5b";   // خدمتك
const TEMPLATE_ID = "template_y1f36sr"; // قالبك

let capsules = [];

// استقبال كبسولة جديدة من الواجهة
app.post('/api/capsules', (req, res) => {
  const { email, message, unlockDate } = req.body;
  capsules.push({
    email,
    message,
    unlockDate: new Date(unlockDate),
    status: 'locked'
  });
  console.log('✅ كبسولة جديدة:', email);
  res.json({ status: 'success' });
});

// عرض الكبسولات المخزنة
app.get('/api/capsules', (req, res) => {
  res.json(capsules);
});

// فحص الكبسولات كل 30 ثانية وإرسال الإيميلات تلقائياً
function checkCapsules() {
  const now = new Date();
  capsules.forEach((c, index) => {
    if (c.unlockDate <= now && c.status === 'locked') {
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
      .then(response => {
        if (response.ok) {
          console.log('✅ تم إرسال الإيميل بنجاح إلى:', c.email);
          c.status = 'sent';
        } else {
          console.error('❌ فشل الإرسال:', response.status);
        }
        return response.text();
      })
      .then(text => console.log('📩 رد EmailJS:', text))
      .catch(err => console.error('❌ خطأ في الاتصال:', err));
    }
  });
}

// تشغيل الفحص كل 30 ثانية
setInterval(checkCapsules, 30000);

app.listen(PORT, () => {
  console.log(`🚀 Time Capsule server يعمل على المنفذ ${PORT}`);
});
