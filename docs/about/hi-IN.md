![Image](https://raw.githubusercontent.com/guizmo-silva/markdown-editor/refs/heads/main/docs/logo/mkd-zimaos-icon.png)
# MKD — स्व-होस्टेड Markdown संपादक

व्यक्तिगत उपयोग के लिए बना स्व-होस्टेड Markdown संपादक, जो Docker के माध्यम से होम सर्वर, NAS डिवाइस और ZimaOS जैसे प्लेटफ़ॉर्म पर चलता है।

---
![MKD - स्व-होस्टेड Markdown संपादक](../../docs/screens/main_interface.png "संपादक की मुख्य स्क्रीन")

## विशेषताएँ

- **साइडबार** — दस्तावेज़ तत्वों का नेविगेटर (शीर्षक, उद्धरण, लिंक, चित्र, तालिकाएँ, अलर्ट और फ़ुटनोट) तथा एकीकृत फ़ाइल एक्सप्लोरर
- **व्यू मोड** — केवल कोड, केवल प्रीव्यू, या साथ-साथ विभाजित दृश्य
- **आयात** — `.md`, `.docx`, `.zip` (`.md` + चित्र) और `.txt` फ़ाइलें
- **निर्यात** — `.txt`, `.md`, `.pdf`, `.html`, `.docx` और `.zip` (स्थानीय रूप से लिंक किए गए चित्रों सहित);
  - `.docx` और `.pdf` जैसे प्रारूपों में तत्वों के रेंडरिंग को सटीक रूप से समझने के लिए, डिफ़ॉल्ट *workspace* में शामिल `markdown-cheat-sheet.md` फ़ाइल निर्यात करें।
- **स्वत: सहेजना**
- **टैब** — एक साथ कई दस्तावेज़ संपादित करें
- **कई भाषाओं में इंटरफ़ेस और वर्तनी जाँच** — पुर्तगाली, अंग्रेज़ी, स्पेनिश, फ्रेंच, जर्मन, रूसी, हिंदी और सरलीकृत चीनी
- **चित्र समर्थन** — बाहरी या लिंक किए गए चित्रों का आयात
- **लाइट और डार्क मोड**
- **आंतरिक रीसायकल बिन**

### समर्थित Markdown

- GitHub Flavored Markdown (GFM): तालिकाएँ, कार्य सूचियाँ, स्ट्राइकथ्रू, ऑटोलिंक
- अलर्ट (`[!NOTE]`, `[!WARNING]`, `[!TIP]`, आदि)
- फ़ुटनोट
- कोड ब्लॉक में सिंटैक्स हाइलाइटिंग
- गणितीय सूत्र

---

## स्थापना

पूरी मार्गदर्शिका **[docs/install/SETUP.hi-IN.md](../install/SETUP.hi-IN.md)** में देखें।

### त्वरित प्रारंभ

1. `docs/install/` फ़ोल्डर से [`docker-compose.yml`](../install/docker-compose.yml) डाउनलोड करें
1. उन फ़ोल्डरों के साथ volumes कॉन्फ़िगर करें जिन तक आप पहुँचना चाहते हैं
1. कंटेनर शुरू करें:

```bash
docker compose up -d
```

1. अपने ब्राउज़र में <http://localhost:3010> खोलें

> संपादक केवल `docker-compose.yml` में स्पष्ट रूप से कॉन्फ़िगर किए गए फ़ोल्डरों तक ही पहुँचता है — सर्वर के फ़ाइल सिस्टम तक कोई मनमाना पहुँच नहीं।

---

## विकास

### पूर्वापेक्षाएँ

| उपकरण | न्यूनतम संस्करण |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| Docker | 20.10+ (उत्पादन के लिए) |

### मुख्य निर्भरताएँ

#### Frontend

- [Next.js 16](https://nextjs.org/) + React 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [CodeMirror 6](https://codemirror.net/) — संपादक का मूल
- [react-markdown](https://github.com/remarkjs/react-markdown) + remark/rehype प्लगइन — प्रीव्यू रेंडरिंग
- [react-i18next](https://react.i18next.com/) — अंतर्राष्ट्रीयकरण
- [nspell](https://github.com/wooorm/nspell) — Hunspell शब्दकोशों के साथ वर्तनी जाँच

#### Backend

- [Express](https://expressjs.com/) + TypeScript
- [multer](https://github.com/expressjs/multer) — चित्र अपलोड
- [archiver](https://github.com/archiverjs/node-archiver) — ZIP निर्यात

### स्थानीय रूप से चलाना

**Backend:**

```bash
cd backend
npm install
npm run dev
```

**Frontend** (दूसरे टर्मिनल में):

```bash
cd frontend
npm install
npm run dev
```

- Frontend: <http://localhost:3000>
- API: <http://localhost:3001>

### प्रोजेक्ट संरचना

```text
markdown-editor/
├── frontend/
│   ├── app/                # रूट और लेआउट (Next.js App Router)
│   ├── components/         # React कंपोनेंट
│   │   ├── Editor/         # CodeMirror संपादक
│   │   ├── Preview/        # Markdown रेंडरिंग
│   │   ├── Toolbar/        # टूलबार
│   │   ├── Sidebar/        # एसेट साइडबार
│   │   ├── Tabs/           # टैब सिस्टम
│   │   └── FileBrowser/    # फ़ाइल ब्राउज़र
│   ├── hooks/
│   ├── locales/            # अनुवाद (प्रति भाषा JSON)
│   └── utils/
│
├── backend/
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middleware/
│       └── utils/
│
└── docker/
    ├── Dockerfile.frontend
    └── Dockerfile.backend
```

---

##### क्या यह प्रोग्राम आपके काम आया? तो मुझे एक कॉफ़ी पिलाएँ! 😉

<a href='https://ko-fi.com/M4M41W6IPV' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
