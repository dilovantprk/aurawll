# AGENTS.md — Aura Project AI Rules
# Bu dosyayı her AI asistan otomatik okur. DEĞİŞTİRME.

## Proje Özeti
Aura, polyvagal teori tabanlı bir wellness web uygulamasıdır.
Stack: Vanilla HTML + ES Modules (no bundler) + Vanilla CSS
Entry point: `index.html` → `app.js` → `js/` modülleri

---

## ALTIN KURALLAR — BUNLARI ASLA ÇIĞNE

### JS Mimarisi
- **Yeni JS kodu SADECE `js/` altına yazılır.** Root'a hiçbir zaman `.js` dosyası ekleme.
- **3 katman var, birbirini geçme:**
  - `js/core/` → Saf logic, state, DOM referansları (UI çağrısı yapamaz)
  - `js/components/` → UI bileşenleri (core'u import eder, service'leri kullanır)
  - `js/services/` → Firebase, audio, sensory gibi dış servisler
- **`app.js`** sadece orchestrator'dır — iş mantığı buraya yazılmaz.
- Import yolu hatası yapma: `js/components/` → `../core/`, `../services/` şeklinde relative import kullan.

### CSS Mimarisi
- **Yeni CSS SADECE ilgili `css/components/*.css` dosyasına yazılır.**
- `css/base.css` → Sadece: design token'lar, reset, `.view`, `.glass-panel`, butonlar, form input'ları. COMPONENT STİLİ EKLEME.
- `css/layout.css` → Sadece: grid, nav, responsive breakpoints. COMPONENT STİLİ EKLEME.
- `style.css` → Sadece `@import` hub'ı. Buraya CSS yazma.
- Yeni bir component CSS dosyası oluşturursan `style.css`'e import ekle.

### Bileşen → CSS eşlemesi
| Bileşen | CSS Dosyası |
|---|---|
| Login, Register, Auth ekranı | `css/components/auth.css` |
| Check-in akışı, rhizome chips, HUD | `css/components/checkin.css` |
| Dashboard, cockpit cards, history | `css/components/dashboard.css` |
| Insight, vagal triangle, heatmap | `css/components/insight.css` |
| Meditation cards, filter chips | `css/components/meditation.css` |
| Modal, info overlay | `css/components/modals.css` |
| Notebook, journal | `css/components/notebook.css` |
| Settings, profile, toggles | `css/components/settings.css` |
| Welcome / onboarding ekranı | `css/components/welcome.css` |
| Tüm animasyonlar (@keyframes) | `css/animations.css` |

---

## SIKÇA YAPILAN HATALAR — BUNLARDAN KAÇIN

1. **`../../someFile.js` şeklinde root'a çıkan import** — `js/services/` veya `js/core/` kullan.
2. **`base.css`'e component stili eklemek** — doğru component CSS dosyasına yaz.
3. **`layout.css`'e component stili eklemek** — aynı şekilde.
4. **Aynı class'ı iki farklı CSS dosyasında tanımlamak** — önce `grep` ile kontrol et.
5. **JS kodunu CSS dosyasına yazmak** — editörde yanlış dosya açıksa dikkat et.
6. **`app.js`'e iş mantığı yazmak** — sadece import + init + navigate buraya.
7. **Root'a yeni `.js` dosyası eklemek** — her zaman `js/` altına.

---

## DÜZENLEME YAPILACAK DOSYAYDI NEREDE BUL

```
app.js                    → Uygulama entry point (sadece import + init + navigate)
firebase.js               → Firebase config (dokunma)
firebase-messaging-sw.js  → Push notification SW (dokunma)
sw.js                     → Service Worker (dokunma)
translations.js           → i18n string'leri

js/core/state.js          → AppState objesi, localStorage helpers
js/core/dom.js            → Tüm DOM element referansları (elements.xxx)
js/core/constants.js      → SOMATIC_MAP, EMOTION_OPTIONS, protocols
js/core/vagal-engine.js   → Polyvagal hesaplama motoru
js/core/utils.js          → Yardımcı fonksiyonlar
js/core/i18n.js           → t() çeviri fonksiyonu

js/services/auth.js       → Login, register, guest, logout (CANONICAL - authService.js değil)
js/services/sensory.js    → Audio/sensory engine
js/services/meditation-audio.js → Meditasyon ses motoru
js/services/insight-engine.js   → Haftalık insight hesaplama

js/components/auth.js     → Auth UI (tab switching, form)
js/components/checkin.js  → 6 adımlı check-in akışı
js/components/dashboard.js → Dashboard render
js/components/meditation-flow.js → Meditasyon oynatma UI
js/components/meditations.js     → Meditasyon listesi
js/components/insight.js  → Insight view render
js/components/settings.js → Settings view
js/components/notebook.js → Notebook/journal
js/components/modals.js   → Info modals
js/components/welcome.js  → Welcome screen
js/components/onboarding.js → Onboarding flow
js/components/exercise.js → Breathing exercise
js/components/vagal-visuals.js → Vagal triangle animasyonu
```

---

## HIZLI KONTROL — BİR ŞEY EKLEMEDEN ÖNCE

```bash
# Broken import var mı?
grep -rn "from '\.\./\.\." js/ --include="*.js"

# Bir class zaten CSS'te var mı?
grep -rn ".MY_CLASS" css/

# Orphan dosya var mı?
ls *.js
```

Veya tek komutla (proje kökünden çalıştır):
```bash
cd /Users/dilovan/Documents/antigrvty && bash scripts/health-check.sh
```

---

## _archive/ KLASÖRÜ
Kaldırılan/deprecated dosyalar buradadır. Buradan import YAPMA.
Bunlara referans verme, bunları silme.

```
_archive/audio-engine.js      (→ js/services/sensory.js)
_archive/vagal-logic.js       (→ js/core/vagal-engine.js)
_archive/meditation.js        (→ js/components/meditation-flow.js)
_archive/settings.js          (→ js/components/settings.js)
_archive/authService.js       (→ js/services/auth.js)
_archive/icons_data.js        (kullanılmıyor)
```
