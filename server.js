const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  console.log('✅ كبسولة جديدة:', email);
  res.json({ status: 'success' });
});

// عرض الكبسولات
app.get('/api/capsules', (req, res) => {
  res.json(capsules);
});

app.listen(PORT, () => {
  console.log(`🚀 Time Capsule server يعمل على المنفذ ${PORT}`);
});
