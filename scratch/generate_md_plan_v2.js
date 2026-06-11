import fs from 'fs';
import { locales } from '../translations.js';

// Compile all the updates we decided on, based on user feedback + our thorough review
const compiledEdits = {
  // User feedback updates
  sleep_subtitle: 'uykuya geçiş ritüeli',
  sleep_cbti_desc: 'Uykun gelmiyorsa yatakta dönüp durarak kendini zorlama. <br><br>Yataktan çık ve başka bir odaya geç. Loş bir ışıkta otur veya zihnini yormayacak, sıkıcı bir şeyler oku. <br><br>Yalnızca gözlerin ağırlaşmaya başladığında yatağına geri dön.',
  sleep_btn_understood: 'Anladım',
  focus_title: 'Odak Modu',
  focus_desc: 'Zihnini derin odaklanmaya hazırlayan sesler.',
  focus_tasks: 'odak niyetlerin',
  focus_tasks_subtitle: 'zihnini hedeflerine odakla',
  focus_label_config: 'Oturum Ayarları',
  focus_confirm_stop: 'Mevcut odağın bölünecek ve oturum verilerin sıfırlanacak.',
  ambient_desc: 'Zihnini dinlendiren ve odaklayan ses ortamları.',
  amb_stream: 'Sakin akan dere',
  dash_special_2: 'Kafayı durduramıyorum, bir türlü uyuyamıyorum... Sen de mi buradasın?',
  checkin_ventral: 'İyi ve güvendesin, {name}.',
  checkin_sympathetic: 'Dengeni buldun.',
  checkin_dorsal: 'Kendinle yeniden bağ kurdun.',
  dash_strength: 'Denge İstikrarı',
  compassion_wired: 'Birkaç gündür yoğun tempoda devam ediyorsun. Bu cesaret ister. Bugün belki de zihnin yerine bedeninin sesini dinlemelisin. 💛',
  compassion_foggy: 'Son zamanlarda her şey çok ağır gelmiş olabilir. Olsun, bu çok normal; bedenin seni korumaya çalışıyor. Küçük, nazik bir hareket içindeki sisi dağıtmaya yardımcı olabilir. 💙',
  vagal_ventral: 'Ventral (Güvenli ve Sosyal)',
  vagal_dorsal: 'Dorsal (Kapanma ve Hareketsizlik)',
  vagal_symp: 'Sempatik (Savaş veya Kaç)',
  vagal_recommendation_default: 'Sinir sistemin gayet esnek ve sağlıklı görünüyor. Bu dengeli halini korumak için günlük çalışmalarına devam edebilirsin.',
  dash_nudge_desc: 'Kendinle bağ kurman için küçük, nazik hatırlatıcılar.',
  somatic_title: 'Şu an bedeninde ne fark ediyorsun?',
  somatic_subtitle: 'En fazla 3 tane seçebilirsin.',
  som_calm_grounded: 'Sakin ve topraklanmış hissediyorum',
  som_chest_tightness: 'Sıkışma hissi',
  som_chest_pressure: 'Baskı',
  som_stomach_turbulence: 'Karnımda hareketlilik / çalkantı',
  som_light_expansion: 'Ferahlık / Genişleme',
  som_light_softness: 'Yumuşama / Gevşeme',
  som_light_floating: 'Hafiflik / Süzülme',
  som_breath_shallow_ref: 'Sığ nefes',
  som_energy_bursting: 'Taşan enerji / Patlama',
  som_energy_electric: 'Elektriklenme',
  som_calm_rooted: 'Yere sağlam basan',
  mar_savor_title: 'Bugün fark ettiğin güzel bir detay var mı?',
  se_scattered: 'Zihnim darmadağın',
  info_heatmap_title: 'Sinir Sistemi Durum Dağılımı',
  info_insight_body: "Aura'nın nöral (yapay zeka) motoru, biyometrik (bedensel) verilerini analiz ederek sirkadiyen (günlük biyolojik saat) ritimlerini tanımlar ve sana en uygun regülasyon (sinir sistemini dengeleme) yollarını önerir.",

  // Formal -> Informal review updates & clarification in parenteses
  guest_cta_desc: 'Nöro-geçmişini ve kişiselleştirilmiş analizlerini tüm cihazlarında senkronize etmek için ücretsiz bir hesap oluştur.',
  prof_delete_account_confirm: 'Hesabın ve tüm verilerin kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misin?',
  insight_wired_desc: 'Sistemin bu aralar oldukça yoğun çalışıyor.',
  insight_foggy_desc: 'Sistemin şu an tasarruf modunda.',
  insight_compassion_needed: 'Sisteminin şu an biraz ekstra şefkate ihtiyacı var.',
  info_heatmap_body: "Sinir sistemi durumlarının (Ventral, Sempatik, Dorsal) uzun vadeli dağılımını haritalandırır. Bu analiz, temel fizyolojik baseline'ını (biyolojik taban çizgisi) ve zaman içindeki regülasyon (dengeleme) eğilimlerini belirler.",
  info_resilience_body: 'Fizyolojik esnekliğini (plastisite) ölçer; sisteminin durumlar arası geçiş yapabilme hızını ve kolaylığını gösterir. Yüksek esneklik, dayanıklı bir sinir sistemine işaret eder.',
  info_vagal_analysis_body: 'Bu analiz, son durum kontrolü (check-in) verilerine dayanarak otonom sinir sisteminin temel eğilimlerini yansıtır. Örüntülerin, strese nasıl uyum sağladığını ve zaman içinde nasıl dinlendiğini ortaya koyar.',
  info_exercise_body: 'Sistemin için en etkili fizyolojik kaldıraç noktasıdır. Bu protokol, biyolojik tepki sıklığına ve başarı oranına göre dinamik olarak seçilir.',
  info_focus_body: "Aura Odak, otonom (istemsiz çalışan) regülasyonla senkronize edilmiş Pomodoro döngülerini (25/5) kullanır. Binaural frekanslar ve biyo-akustik arka plan sesleri ekleyerek 'Akış Hali'ni (Flow State) kolaylaştırırken, planlı ventral (güvenli) molalarla sempatik (savaş/kaç) tükenmişliği önler.",
  info_meditations_body: 'Otonom (istemsiz çalışan) sinir sistemini düzenlemek için tasarlanmış rehberli seanslar. Belirli ritmik nefes kalıpları kullanarak durumunu; stres (sempatik) veya kapanma (dorsal) halinden, güvenli sosyal katılım (ventral) haline kendin taşıyabilirsin.',
  info_step2_body: "Enerji ve rahatlık düzeyini Russell'ın döngüsel modeli üzerinde işaretlemek, o anki fizyolojik konumunun çok boyutlu bir anlık görüntüsünü çıkarır.",
  insight_okay_light_day: 'Sistemin dengede ve aktif. Odaklanmak için harika bir zaman.',
  insight_okay_chronic_day: 'Sinir sistemin bugün yüksek akış modunda.',
  insight_okay_light_night: 'Bedenin derin bir toparlanmaya geçiyor.',
  insight_wired_chronic_day: 'Sistemin çok yoruldu; hareket gerekiyor.',
  insight_foggy_chronic_day: 'Sevdiğin biriyle bağlantı kur ya da ufacık bir hareketle başla.',
  insight_foggy_light_night: 'Sistemin ağırlaştı ve dinlenmeye hazır.',
  insight_growth_desc: 'Sinir sistemi esnekliğin bu hafta %{percent} arttı. 🚀',
  market_notebook_desc: 'Düşüncelerini ve somatik farkındalık notlarını kaydet.',
  info_sleep_body: 'Uyku modülü, sinir sistemini aktif uyarılma halinden güvenli dorsal dinlenme haline geçirmek için NSDR (Uykusuz Derin Dinlenme) ve CBT-i prensiplerini kullanır. Derin toparlanma ve melatonin üretimi için gereken fizyolojik değişimi destekler.',
  info_notebook_body: 'İçsel durumlarını ve duyumlarını not etmek güçlü bir geri bildirim döngüsü oluşturur. "İnteroseptif (bedensel duyum farkındalığı) Etiketleme" olarak bilinen bu pratik, beden ve zihin arasındaki bağı güçlendirerek gelecekteki öz-düzenlemeyi daha kolay ve sezgisel hale verir.',
  insight_template: 'Bu aralar genellikle {time} saatlerinde "{emotion}" hissediyorsun. Sisteminin küçük bir şefkate ihtiyacı var.',
  insight_circadian_desc: 'Regülasyonun en derin olduğu anları {time} saatlerinde yakalıyorsun. ☀️',
  insight_advice_desc: 'Bedenin yüksek esneklik gösteriyor; yarın biraz daha uzun bir meditasyon deneyebilirsin. 🧘',
  insight_foggy_chronic_night: 'Sistemin kapanmış ve hareketsiz. Sadece güvende hissetmeye ve anda kalmaya odaklan.',
  notebook_desc: 'Kişisel sağlık günlüğün.',
  notebook_empty: 'Henüz kayıt yok. Günlüğünü başlatmak için bir durum kontrolü tamamla.',
  time_mins_ago: '{count} dk önce',
  time_days_ago: '{count} gün önce',
  insight_okay_medium_night: 'Sakin kapanış. Regülasyon pürüzsüz ve uykuya hazır.',
  insight_okay_chronic_night: 'Derin güven hissi. Gece saatlerinde yüksek bir huzur yakaladın.',
  insight_okay_medium_day: 'Düzenli regülasyon. Sakin ve "burada" kalmayı başarıyorsun.',
  insight_foggy_light_day: 'Yavaş sabah başlangıcı. Soğuk suyla duyularını nazikçe uyar.',
  insight_foggy_medium_day: 'Ağır enerji. Sistem tasarruf modunda. Hafif esneme dene.',
  insight_foggy_medium_night: 'Derin korunma. Bağlantı düşük; bedensel sıcaklığa odaklan.',
  insight_wired_light_day: 'Sabah uyarılmışlığı (Kortizol) doğaldır. Bu enerjiyi harekete dök.',
  insight_wired_medium_day: 'Yüksek uyarılmışlık. Bunalmayı önlemek için 2 dakikalık reset dene.',
  insight_wired_light_night: 'Geç saat uyarılmışlığı. Kısa bir soğuma uykuyu kolaylaştırabilir.',
  insight_wired_medium_night: 'Huzursuz akşam. Melatonin baskılanıyor olabilir; ışıkları kıs.',
  insight_wired_chronic_night: 'Kronik gece uyarılması. Sistem "açık" kaldı. Acil uyku hijyeni odaklı kal.',
  mar_savor_placeholder: '(örn. taze kahve kokusu, ılık bir esinti, küçük bir işi tamamlamak...)',
  done_title: 'Harikasın.',
  done_desc: 'Sinir sistemin sana minnettar.',
  notif_modal_desc: 'Bugün durum kontrolü yaptığın saate yakın bir zamanda sana şefkatlice yazacağız. Bildirim kirliliği veya suçluluk yok.'
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

let md = `# Aura Türkçe Metinler Düzeltme ve İnceleme Planı (Güncellenmiş)

Geribildirimleriniz doğrultusunda plan güncellenmiştir. **"Sen" dili korunmuş**, belirtilen tüm eleştirileriniz ve kelime önerileriniz uygulanmış, teknik terimlerin yanına parantez içinde sade açıklamaları eklenmiştir.

Lütfen güncellenen listeyi inceleyin. Eğer her şey uygunsa **"Onaylıyorum"** demeniz durumunda tüm bu metinleri otomatik olarak sisteme uygulayacağım.

`;

const enKeys = Object.keys(locales.en);

for (const keyId in groups) {
  const g = groups[keyId];
  md += `## ${g.title}\n\n`;
  md += `| Anahtar (Key) | İngilizce (EN) | Mevcut Türkçe (TR) | Güncel Öneri (Geri Bildirimleriniz Dahil) |\n`;
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
console.log('Successfully updated implementation_plan.md');
