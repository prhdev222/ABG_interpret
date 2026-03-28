# ABG + Ventilator Interpreter

โปรแกรมช่วยแปลผล ABG, แนะนำการดู waveform, ให้ข้อเสนอแนะเรื่อง ventilator และมี interactive pathway สำหรับ weaning/extubation

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Radix UI (Select, Tooltip)
- Lucide React icons

## Development

```bash
npm install
npm run dev
```

## Deploy to Vercel

### วิธีที่ 1: ผ่าน Git (แนะนำ)

1. Push โค้ดขึ้น GitHub/GitLab/Bitbucket
2. ไปที่ [vercel.com](https://vercel.com) → Import Project
3. เลือก repository → Vercel จะตรวจจับ Vite อัตโนมัติ
4. กด Deploy

### วิธีที่ 2: ผ่าน Vercel CLI

```bash
npm i -g vercel
vercel
```

### วิธีที่ 3: ลาก zip ไปวาง

1. ไปที่ [vercel.com/new](https://vercel.com/new)
2. เลือก "Import" → ลาก folder โปรเจกต์นี้เข้าไป

## โครงสร้างไฟล์

```
abg-vent-app/
├── index.html
├── package.json
├── vercel.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── App.jsx              ← ตัวแอปหลัก
    ├── index.css
    ├── lib/
    │   └── utils.js
    └── components/ui/
        ├── badge.jsx
        ├── card.jsx
        ├── input.jsx
        ├── label.jsx
        ├── select.jsx
        ├── textarea.jsx
        └── tooltip.jsx
```
