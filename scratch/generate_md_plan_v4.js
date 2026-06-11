import fs from 'fs';
import { locales } from '../translations.js';

// Compile all updates: User feedback v3 + Simplified translation review
const compiledEdits = {
  // Navigation & Tabs (Consistent TR)
  nav_checkin: 'Durum Kontrolü',
  dash_start: 'Durum Kontrolünü Başlat',
  dash_recent: 'Son Durum Kontrolleri',
  dash_empty: 'Henüz durum kontrolü yapmadın. Yukarıdan yolculuğa başla.',
  dash_no_weekly: 'Örüntünü görebilmek için birkaç durum kontrolü daha tamamla.',
  dash_no_weekly_desc: 'İçgörüler ve modeller, birkaç durum kontrolü daha yaptıktan sonra aktif hale gelecektir.',
  notebook_empty: 'Henüz kayıt yok. Günlüğünü başlatmak için bir durum kontrolü tamamla.',

  // CBTI & Sleep
  sleep_subtitle: 'uykuya geçiş ritüeli',
  sleep_cbti_desc: 'Uykun gelmiyorsa yatakta dönüp durarak kendini zorlama. <br><br>Yataktan çık ve başka bir odaya geç. Loş bir ışıkta otur veya zihnini yormayacak, basit bir şeyler oku. <br><br>Yalnızca gözlerin ağırlaşmaya başladığında yatağına geri dön.',
  sleep_btn_understood: 'Anladım',
  
  // Focus Mode
  focus_title: 'Odak Modu',
  focus_desc: 'Zihnini derin odaklanmaya hazırlayan sesler.',
  focus_tasks: 'odak niyetlerin',
  focus_tasks_subtitle: 'zihnini hedeflerine odakla',
  focus_label_config: 'Oturum Ayarları',
  focus_confirm_stop: 'Mevcut odağın bölünecek ve oturum verilerin sıfırlanacak.',
  focus_session_done: 'Harika odaklandın, seans bitti!',

  // Ambient & Soundscapes
  ambient_desc: 'Zihnini dinlendiren ve odaklayan ses ortamları.',
  amb_stream: 'Sakin akan dere',
  amb_spaceship: 'Uzay Gemisi Kabini',
  amb_midnight: 'Gece Yarısı Huzuru',
  
  // Colloquial Chatty Dashboard
  dash_special_2: 'Kafayı durduramıyorum, bir türlü uyuyamıyorum... Sen de mi buradasın?',
  checkin_ventral: 'İyi ve güvendesin, {name}.',
  checkin_sympathetic: 'Dengeni buldun.',
  checkin_dorsal: 'Kendinle yeniden bağ kurdun.',
  dash_strength: 'Denge İstikrarı',
  insight_hero_desc: 'Haftalık Özet',
  dash_take_moment: 'Bugün kendine ait bir an ayır.',
  
  // Compassion & Warm Copy
  compassion_wired: 'Birkaç gündür yoğun tempoda devam ediyorsun. Bu cesaret ister. Bugün belki de zihnin yerine bedeninin sesini dinlemelisin. 💛',
  compassion_foggy: 'Son zamanlarda her şey çok ağır gelmiş olabilir. Olsun, bu çok normal; bedenin seni korumaya çalışıyor. Biraz esnemek veya kalkıp bir bardak su almak o sisi dağıtmaya yardımcı olabilir. 💙',
  vagal_ventral: 'Ventral (Güvenli ve Sosyal)',
  vagal_dorsal: 'Dorsal (Kapanma ve Hareketsizlik)',
  vagal_symp: 'Sempatik (Savaş veya Kaç)',
  vagal_recommendation_default: 'Sinir sistemin gayet esnek ve sağlıklı görünüyor. Bu dengeli halini korumak için günlük çalışmalarına devam edebilirsin.',
  dash_nudge_desc: 'Kendinle bağ kurman için küçük, nazik hatırlatıcılar.',

  // Somatic Sensations (Simple and clean)
  step_1: '1 / 6',
  step_2: '2 / 6',
  step_3: '3 / 6',
  step_4: '4 / 6',
  step_5: '5 / 6',
  step_6: '6 / 6',
  step_2b: '2B / 6',
  somatic_title: 'Şu an bedeninde ne hissediyorsun?',
  somatic_subtitle: 'En fazla 3 tane seçebilirsin.',
  som_calm_grounded: 'Sakin ve topraklanmış hissediyorum',
  som_chest_tightness: 'Sıkışma hissi',
  som_chest_pressure: 'Baskı',
  som_stomach_turbulence: 'Karnımda hareketlilik / çalkantı',
  som_light_expansion: 'Ferahlık',
  som_light_softness: 'Yumuşama',
  som_light_floating: 'Hafiflik',
  som_breath_shallow_ref: 'Sığ nefes',
  som_energy_bursting: 'Taşan enerji',
  som_energy_electric: 'Elektriklenme',
  som_calm_rooted: 'Yere sağlam basan',
  mar_savor_title: 'Bugün fark ettiğin güzel bir detay var mı?',
  se_scattered: 'Zihnim darmadağın',
  se_frustrated: 'Huzursuz',
  se_spaced_out: 'Uzaklaşmış / Kopmuş',
  se_other: 'Başka...',
  emotion_title: 'Bu hissi nasıl isimlendirirsin?',
  emotion_subtitle: 'Sana en yakın olanları seç (en fazla 3)',
  emo_sad: 'Üzgün',

  // No Science Jargon
  info_heatmap_title: 'Sinir Sistemi Durum Dağılımı',
  info_heatmap_body: 'Sinir sistemi durumlarının (Ventral, Sempatik, Dorsal) uzun vadeli dağılımını haritalandırır. Bu analiz, temel fizyolojik durumunu ve zaman içindeki regülasyon (dengeleme) eğilimlerini belirler.',
  info_resilience_title: 'Sinir Sistemi Esnekliği',
  info_resilience_body: 'Fizyolojik esnekliğini ölçer; sisteminin durumlar arası geçiş yapabilme hızını ve kolaylığını gösterir. Yüksek esneklik, dayanıklı bir sinir sistemine işaret eder.',
  info_insight_body: 'Aura, durum kontrollerini analiz ederek sana en uygun rahatlama yollarını önerir.',
  info_notebook_title: 'Beden Günlüğü',
  info_notebook_body: 'İçsel durumlarını ve hislerini yazmak, beden ve zihin arasındaki bağı güçlendirerek sakinleşmeni kolaylaştırır.',
  info_vagal_analysis_body: 'Bu analiz, son durum kontrolü verilerine dayanarak otonom sinir sisteminin temel eğilimlerini yansıtır. Örüntülerin, strese nasıl uyum sağladığını ve zaman içinde nasıl dinlendiğini ortaya koyar.',
  info_exercise_body: 'Sistemin için en etkili kaldıraç noktasıdır. Bu protokol, biyolojik tepki sıklığına ve başarı oranına göre otomatik olarak seçilir.',
  info_focus_body: "Aura Odak, otonom (istemsiz çalışan) dengelenmeyle senkronize edilmiş çalışma döngülerini (25/5) kullanır. Dinlendirici arka plan sesleri ekleyerek odaklanmayı kolaylaştırırken, planlı molalarla zihinsel tükenmişliği önler.",
  info_meditations_body: 'Otonom (istemsiz çalışan) sinir sistemini düzenlemek için tasarlanmış rehberli seanslar. Belirli ritmik nefes kalıpları kullanarak durumunu; stres (sempatik) veya kapanma (dorsal) halinden, güvenli sosyal katılım (ventral) haline kendin taşıyabilirsin.',
  info_step2_body: 'Enerji ve rahatlık düzeyini Russell modeli üzerinde işaretlemek, o anki fizyolojik durumunun çok boyutlu bir anlık görüntüsünü çıkarır.',
  info_sleep_body: 'Uyku modülü, sinir sistemini aktif uyarılma halinden güvenli dinlenme haline geçirmek için NSDR (Uykusuz Derin Dinlenme) ve CBT-i prensiplerini kullanır. Derin toparlanma ve melatonin üretimi için gereken fizyolojik değişimi destekler.',
  info_step4_title: 'Değişimi Hissetme',
  info_step6_title: 'İyi Hissi Pekiştirme',
  info_step6_body: 'Ulaştığın bu huzurlu hali bedendeki güzel bir hisse odaklanarak kalıcı hale getir. Zihnini kasıtlı olarak bu olumlu hisse yönlendirmek, beynin sürekli olumsuza odaklanma eğilimini kırar.',

  // Breathing protocols (No Jargon)
  mc_p_478: 'Kaygı hissettiğinde sinir sistemin alarm durumuna geçer. Uzun nefes verdiğindeyse vücudun sakinleşip yavaşlar.',
  mc_p_sigh: 'Gergin olduğunda nefesin daralır. Üst üste iki kez nefes alıp yavaşça vermek, vücudu rahatlatmanın en hızlı yollarından biridir.',
  mc_p_grounding: 'Zihnin dağıldığında derin nefes vererek dikkatini bedenine ve ana geri getirebilirsin.',
  mc_p_box: 'Kendini boşlukta veya hayattan kopuk hissettiğinde, nefes alıp verme sürelerini eşitlemek zihnini yeniden canlandırır.',
  mc_p_bellows: 'Uyuşukluk, sistemin düşük uyarılma halidir. Hızlı nefesler kalbi hızlandırır ve bedeni uyandırır.',
  mc_p_phys_sigh: 'Burundan üst üste iki kısa nefes alıp ağızdan uzunca vermek, kalp atış hızını düşürmenin ve akciğerleri rahatlatmanın en hızlı yoludur.',
  mc_p_ext_exhale: 'Nefes vermeyi nefes almaktan daha uzun tutarak kalp atış hızını düşürür ve sakinleştirir.',

  // Science Info Titles Simplified
  sci_p_478_title: 'Nefesle Gevşeme',
  sci_p_sigh_title: 'Akciğerleri Rahatlatma',
  sci_p_bellows_title: 'Zihni Canlandırma',
  sci_p_resonance_title: 'Kalp ve Zihin Uyumu',
  sci_p_grounding_title: 'Beden Farkındalığı ve Güven',
  sci_p_phys_sigh_title: 'Hızlı Sakinleşme Mekanizması',
  sci_p_coherent_title: 'Kalp Ritmini Dengeleme',
  sci_p_ext_exhale_title: 'Derin Sakinleşme',
  sci_p_cyclic_sigh_title: 'Ruh Halini Düzenleme',
  sci_p_fire_title: 'Zihni Hızlandırma ve Odaklanma',
  sci_p_nadi_title: 'Zihinsel Dengeleme',
  sci_p_box_title: 'Baskı Altında Sakin Kalma',

  // Onboarding (Natural Turkish)
  onb_1_title: 'Sinir sistemin sürekli seninle konuşuyor.',
  onb_1_sub: 'Aura, bedeninin sesini dinlemene ve ona doğru şekilde yanıt vermene yardımcı olur.',
  onb_2_title: 'Dengen şaşmış olabilir, bu çok normal.',
  onb_2_sub: 'Sinir sistemin sadece bir ruh hali değildir; biyolojik bir durumdur. Sistem fazla yüklendiğinde hayatta kalma moduna geçer: tetikte, puslu veya kapanmış. Bunu sen seçmedin. Ama onunla birlikte çalışabilirsin. Belirli nefes kalıpları beyne doğrudan şu sinyali gönderir: <em>Artık burası güvenli.</em> Bu bir efsane değil, tamamen fizyoloji.',
  onb_3_sub: 'Durumunu fark etmek için 30 saniye. Düzenlemek için 3 dakika. Bedenine işlemesi için 20 saniye.',
  onb_4_title: 'Durum kontrolüne hazır mısın?',
  notif_modal_title: 'Aura\'dan günlük bir hatırlatma ister misin?',
  notif_modal_desc: 'Bugün durum kontrolü yaptığın saate yakın bir zamanda sana şefkatlice yazacağız. Bildirim kirliliği veya suçluluk hissi yok.',
  done_desc: 'Sinir sistemin sana minnettar.',

  // Microcopy (Natural Turkish)
  scan_478_4: 'Bırak bu sakinlik bedenine yerleşsin.',
  scan_sigh_0: 'Aldığın derin nefes zihnini rahatlattı. Geriye kalan boşluğu ve hafifliği hisset.',
  scan_sigh_1: 'Zihnini oraya odaklayarak derin bir nefes al.',
  scan_sigh_2: 'Çenende, omuzlarında veya alnında hala gerginlik hissediyor musun?',
  scan_sigh_4: 'Yaşadığın hayal kırıklığını bir başarısızlık değil, sadece bir işaret olarak gör.',
  scan_grounding_3: 'Şu an odadan gelen tek bir sese odaklan. Sadece dinle.',
  scan_grounding_4: 'Şu an buradasın, tam da bu odada. Bu an senin için yeterli.',
  scan_box_1: 'Bedeninin ağırlığını hisset. Buradasın ve gerçeksin.',
  scan_box_4: 'Bu dinginliği kendi nefesinle yarattın.',
  scan_resonance_0: 'Zaten aradığın o sakinliğe ulaştın. Bu anın keyfini çıkar.',
  scan_resonance_4: 'Bunu kendi nefesinle yaptın, bunu unutma.',

  // Legal (Formal is okay, but natural)
  guest_cta_title: 'Yolculuğunu Kaydet',
  prof_identity: 'Biyo-Kimlik',
  prof_active_days: '{count} Gündür Aktif',
  prof_volume: 'Akustik Derinlik',
  prof_volume_desc: 'Akustik ses seviyesi',
  
  // Market & Modules
  market_status_active: 'Kullanımda',
  market_status_inactive: 'Kapalı',
  market_status_locked: 'Kilitli',
  market_btn_disable: 'Kapat',
  market_btn_enable: 'Aç',
  market_btn_install: 'Uygulamaya Ekle',
  market_desc: 'Genişletilmiş wellness araçlarını keşfet ve sistemine ekle.',

  // Matrix Insights (Colloquial & Warm)
  insight_template: 'Bu aralar genellikle {time} saatlerinde "{emotion}" hissediyorsun. Bedeninin bir mola vermeye ihtiyacı olabilir. 💛',
  insight_growth_desc: 'Sinir sistemi esnekliğin bu hafta %{percent} arttı. 🚀',
  insight_circadian_desc: 'Regülasyonun en derin olduğu anları {time} saatlerinde yakalıyorsun. ☀️',
  insight_advice_desc: 'Bedenin yüksek esneklik gösteriyor; yarın biraz daha uzun bir meditasyon deneyebilirsin. 🧘',
  insight_wired_title: 'Huzursuz ve Tetikte',
  insight_wired_desc: 'Sistemin bu aralar oldukça yoğun çalışıyor.',
  insight_foggy_title: 'Düşük Enerji',
  insight_foggy_desc: 'Sistemin şu an tasarruf modunda.',
  insight_okay_title: 'Dengeli Akış',
  insight_okay_desc: 'Denge ve güven durumundasın.',
  insight_compassion_needed: 'Sisteminin şu an biraz ekstra şefkate ihtiyacı var.',
  insight_loading: 'Aura haftalık örüntülerini analiz ediyor...',
  insight_foggy_chronic_night: 'Sistemin kapanmış ve hareketsiz. Sadece güvende hissetmeye ve anda kalmaya odaklan.',
  insight_okay_light_day: 'Sistemin dengede ve aktif. Odaklanmak için harika bir zaman.',
  insight_okay_medium_day: 'Düzenli regülasyon. Sakin ve "anda" kalmayı başarıyorsun.',
  insight_okay_chronic_day: 'Sinir sistemin bugün yüksek akış modunda.',
  insight_okay_light_night: 'Bedenin derin bir toparlanmaya geçiyor.',
  insight_okay_medium_night: 'Sakin kapanış. Regülasyon pürüzsüz ve uykuya hazır.',
  insight_okay_chronic_night: 'Derin güven hissi. Gece saatlerinde yüksek bir huzur yakaladın.',
  insight_wired_light_day: 'Sabah uyarılmışlığı (Kortizol) doğaldır. Bu enerjiyi harekete dök.',
  insight_wired_medium_day: 'Yüksek uyarılmışlık. Bunalmayı önlemek için 2 dakikalık reset dene.',
  insight_wired_chronic_day: 'Sürekli tetiktesin. Bedenin çok yoruldu; biraz hareket etmen lazım.',
  insight_wired_light_night: 'Geç saat uyarılmışlığı. Kısa bir soğuma uykuyu kolaylaştırabilir.',
  insight_wired_medium_night: 'Huzursuz akşam. Melatonin baskılanıyor olabilir; ışıkları kıs.',
  insight_wired_chronic_night: 'Kronik gece uyarılması. Sistem "açık" kaldı. Acil uyku hijyeni odaklı kal.',
  insight_foggy_light_day: 'Yavaş sabah başlangıcı. Soğuk suyla duyularını nazikçe uyar.',
  insight_foggy_medium_day: 'Ağır enerji. Sistem tasarruf modunda. Hafif esneme dene.',
  insight_foggy_chronic_day: 'Kronik donma hali. Sevdiğin biriyle bağlantı kur ya da ufacık bir hareketle başla.',
  insight_foggy_light_night: 'Sistemin ağırlaştı ve dinlenmeye hazır.',
  insight_foggy_medium_night: 'Derin korunma. Bağlantı düşük; bedensel sıcaklığa odaklan.',
  insight_bloom: 'Zinde',
  insight_serene: 'Huzurlu',
  insight_storm: 'Fırtınalı',
  insight_light: 'Hafif',

  // Notebook (Wellbeing Journal)
  notebook_desc: 'Kişisel farkındalık günlüğün.',
  
  // Time and Relative strings
  time_mins_ago: '{count} dk önce',
  time_days_ago: '{count} gün önce'
};

const groups = {
  grup_4_sleep_focus_ambient: {
    title: 'Grup 4: Uyku, Odak ve Ambiyans',
    regex: [/^sleep_/, /^focus_/, /^amb_/, /^ambient_/, /^meditation_loading_desc$/]
  },
  grup_5_dashboard_and_badges: {
    title: 'Grup 5: Gösterge Paneli ve Rozetler',
    regex: [/^dash_/, /^badge_/, /^compassion_/, /^vagal_/, /^checkin_/]
  },
  grup_6_somatic_sensations: {
    title: 'Grup 6: Somatik Duyumlar ve Durum Girişleri',
    regex: [/^som_/, /^picker_/, /^state_/, /^bs_/, /^step_/, /^grid_/, /^mar_/, /^somatic_/]
  },
  grup_7_emotions_and_subemotions: {
    title: 'Grup 7: Duygular ve Alt-Duygular',
    regex: [/^emotion_/, /^emo_/, /^se_/, /^sub_/]
  },
  grup_8_exercises_and_science: {
    title: 'Grup 8: Egzersizler, Bilimsel Açıklamalar ve Bilgi Panelleri',
    regex: [/^ex_/, /^mc_p_/, /^sci_/, /^info_/, /^recommendation_title$/]
  },
  grup_9_onboarding_and_other: {
    title: 'Grup 9: Onboarding ve Bildirimler',
    regex: [/^onb_/, /^done_/, /^notif_/, /^scan_/]
  },
  grup_10_intentions_and_legal: {
    title: 'Grup 10: Günün Niyeti ve Yasal Metinler',
    regex: [/^intent_/, /^bite_/, /^market_/, /^tod_/, /^day_/, /^plasticity_/]
  },
  grup_11_insights: {
    title: 'Grup 11: Haftalık İçgörüler (Matrix)',
    regex: [/^insight_/]
  },
  grup_12_notebook: {
    title: 'Grup 12: Günlük (Notebook)',
    regex: [/^notebook_/]
  },
  grup_13_time_and_dates: {
    title: 'Grup 13: Zaman ve Tarihler',
    regex: [/^time_/]
  }
};

let md = `# Aura Türkçe Metinler Düzeltme ve İnceleme Planı (V4)

Geri bildirimleriniz doğrultusunda güncellenmiş ve tamamen Türkçeleştirilmiş plan sürümü.

`;

const enKeys = Object.keys(locales.en);

for (const keyId in groups) {
  const g = groups[keyId];
  md += `## ${g.title}\n\n`;
  md += `| Anahtar (Key) | İngilizce (EN) | Mevcut Türkçe (TR) | Güncel Öneri (V4) |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;

  enKeys.forEach(key => {
    if (g.regex.some(regex => regex.test(key))) {
      const en = locales.en[key] ? locales.en[key].replace(/\n/g, '<br>').replace(/\|/g, '\\|') : '';
      const tr = locales.tr[key] ? locales.tr[key].replace(/\n/g, '<br>').replace(/\|/g, '\\|') : '';
      const suggestion = compiledEdits[key] ? compiledEdits[key].replace(/\n/g, '<br>').replace(/\|/g, '\\|') : '';
      md += `| **${key}** | ${en} | ${tr} | **${suggestion || tr}** |\n`;
    }
  });

  md += `\n---\n\n`;
}

fs.writeFileSync('/Users/dilovan/.gemini/antigravity/brain/76534040-ad1a-429b-a630-58e7b9621bf9/implementation_plan.md', md);
console.log('Successfully updated implementation_plan.md to v4');
