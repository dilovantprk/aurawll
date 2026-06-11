import fs from 'fs';
import { locales } from '../translations.js';

const groups = {
  grup_4_sleep_focus_ambient: {
    title: 'Grup 4: Uyku, Odak ve Ambiyans',
    regex: [/^sleep_/, /^focus_/, /^amb_/, /^ambient_/, /^meditation_loading_desc$/],
    suggestions: {
      focus_title: 'Odaklanma Alanı (Küçük harf hatası ve "akış alanı" çevirisi düzeltildi)',
      focus_tasks: 'Odak niyetleri / hedefleri ("akış niyetleri" yerine)',
      amb_stream: 'Sakin Dere ("Huzurlu Dere" yerine)',
      amb_spaceship: 'Uzay Gemisi Kabini ("Uzay İstasyonu" yerine)',
      amb_midnight: 'Gece Yarısı Huzuru ("Gece Yarısı Sessizliği" yerine)'
    }
  },
  grup_5_dashboard_and_badges: {
    title: 'Grup 5: Gösterge Paneli ve Rozetler',
    regex: [/^dash_/, /^badge_/, /^compassion_/, /^vagal_/, /^checkin_/],
    suggestions: {
      dash_start: 'Durum Kontrolünü Başlat (Döngü yerine "Durum Kontrolü")',
      dash_recent: 'Son Durum Kontrolleri ("Geçmiş Anlar" yerine)',
      dash_empty: 'Henüz durum kontrolü yapılmadı. Yukarıdan yolculuğa başlayın. ("kayıt" yerine)',
      dash_no_weekly: 'Örüntünüzü görebilmek için birkaç durum kontrolü daha tamamlayın.',
      dash_no_weekly_desc: 'İçgörüler ve modeller, birkaç durum kontrolü daha yaptıktan sonra aktif hale gelecektir.',
      dash_strength: 'Örüntü Gücü / Direnci',
      vagal_router_label: 'SİNİR SİSTEMİ NAVİGASYONU ("navigasyon" kelimesi)',
      dash_resilience: 'Fizyolojik Esneklik (Resilience)'
    }
  },
  grup_6_somatic_sensations: {
    title: 'Grup 6: Somatik Duyumlar ve Durum Girişleri',
    regex: [/^som_/, /^picker_/, /^state_/, /^bs_/, /^step_/, /^grid_/, /^mar_/, /^somatic_/],
    suggestions: {
      som_chest_heavy: 'Göğsümde ağırlık hissi',
      som_muscle_tense: 'Kaslarım gergin',
      som_stomach_knot: 'Midemde düğümlenme hissi',
      som_light_relaxed: 'Hafif ve gevşemiş',
      som_heavy_tired: 'Ağırlaşmış ve yorgun',
      som_shallow_breath: 'Sığ nefes',
      som_high_energy_restless: 'Yüksek enerjili, huzursuz',
      som_calm_grounded: 'Sakin, topraklanmış',
      grid_title: 'Enerjinizi haritada işaretleyin',
      mar_notice: 'Şu an bedeninizde neyin değiştiğini fark edin.',
      mar_what_do_you_feel: 'Ne hissediyorsunuz?',
      mar_savor_title: 'Bugün fark ettiğiniz güzel bir detay oldu mu?',
      mar_savor_placeholder: '(Örn. taze kahve kokusu, ılık bir esinti, küçük bir işi tamamlamak...)',
      bs_ventral_shoulders: 'Omuzlarım rahat ve aşağıda',
      bs_symp_jaw: 'Çenemi sıkıyorum (fark etmeden)',
      bs_symp_spring: 'Kurulmuş gergin bir yay gibiyim',
      bs_dorsal_eyes: 'Gözlerimde ağırlık var (uyku hali değil)',
      bs_dorsal_vulnerable: 'Saklanmak / küçülüp görünmez olmak istemek',
      bs_dorsal_voice: 'Sesim içimde sıkışmış gibi',
      ex_hold_empty: 'Nefessiz Bekle'
    }
  },
  grup_7_emotions_and_subemotions: {
    title: 'Grup 7: Duygular ve Alt-Duygular',
    regex: [/^emotion_/, /^emo_/, /^se_/, /^sub_/],
    suggestions: {
      emotion_title: 'Bu hissi nasıl isimlendirirsiniz?',
      emotion_subtitle: 'Size en yakın olanları seçin (en fazla 3)',
      emo_sad: 'Üzgün',
      se_frustrated: 'Huzursuz / Hayal Kırıklığına Uğramış',
      se_racing_thoughts: 'Durdurulamayan Düşünceler',
      se_spaced_out: 'Uzaklaşmış / Kopmuş',
      se_other: 'Başka...'
    }
  },
  grup_8_exercises_and_science: {
    title: 'Grup 8: Egzersizler, Bilimsel Açıklamalar ve Bilgi Panelleri',
    regex: [/^ex_/, /^mc_p_/, /^sci_/, /^info_/, /^recommendation_title$/],
    suggestions: {
      mc_p_478: 'Kaygı, sempatik sistemi uyarır. Uzun nefes veriş ona adeta fren yaptırır.',
      mc_p_bellows: 'Uyuşukluk, sistemin düşük uyarılma halidir. Hızlı nefesler CO2\'yi artırarak kalbi hızlandırır ve bedeni uyandırır.',
      info_heatmap_title: 'Otonom Durum Dağılımı ("Nöral" yerine)',
      info_heatmap_body: 'Sinir sistemi durumlarınızın (Ventral, Sempatik, Dorsal) uzun vadeli dağılımını haritalandırır. Bu analiz, temel fizyolojik baseline\'ınızı ve zaman içindeki regülasyon eğilimlerinizi belirler.',
      info_sleep_body: 'Uyku modülü, sinir sistemini aktif uyarılma halinden güvenli dorsal dinlenme haline geçirmek için NSDR (Uykusuz Derin Dinlenme) ve CBT-i prensiplerini kullanır. Derin toparlanma ve melatonin üretimi için gereken fizyolojik değişimi destekler.',
      info_notebook_body: 'İçsel durumlarınızı ve duyumlarınızı not etmek güçlü bir geri bildirim döngüsü oluşturur. "İnteroseptif Etiketleme" olarak bilinen bu pratik, beden ve zihin arasındaki bağı güçlendirerek gelecekteki öz-düzenlemeyi daha kolay ve sezgisel hale getirir.'
    }
  },
  grup_9_onboarding_and_other: {
    title: 'Grup 9: Onboarding ve Bildirimler',
    regex: [/^onb_/, /^done_/, /^notif_/, /^scan_/],
    suggestions: {
      onb_1_title: 'Sinir sisteminiz sürekli sizinle konuşuyor.',
      onb_1_sub: 'Aura onu dinlemenize ve yanıt vermenize yardımcı olur.',
      onb_2_title: 'Bozuk değilsiniz. Sadece dengeniz şaştı.',
      onb_2_sub: 'Sinir sisteminiz sadece bir ruh hali değildir; biyolojik bir durumdur. Sistem fazla yüklendiğinde hayatta kalma moduna geçer: tetikte, puslu veya kapanmış. Bunu siz seçmediniz. Ama onunla birlikte çalışabilirsiniz. Belirli nefes kalıpları beyne doğrudan şu sinyali gönderir: <em>Artık burası güvenli.</em> Bu sadece bir wellness efsanesi değil, tamamen fizyoloji.',
      onb_3_sub: 'Durumunuzu fark etmek için 30 saniye. Düzenlemek için 3 dakika. Bedeninize işlemesi için 20 saniye.',
      onb_4_title: 'Durum kontrolüne hazır mısınız?',
      notif_modal_title: 'Aura\'dan günlük bir hatırlatma ister misiniz?',
      notif_modal_desc: 'Bugün durum kontrolü yaptığınız saate yakın bir zamanda size nazikçe hatırlatacağız. Bildirim kirliliği veya suçluluk hissi yok.',
      done_desc: 'Sinir sisteminiz size minnettar.'
    }
  },
  grup_10_intentions_and_legal: {
    title: 'Grup 10: Günün Niyeti ve Yasal Metinler',
    regex: [/^intent_/, /^bite_/, /^market_/, /^tod_/, /^day_/, /^plasticity_/],
    suggestions: {
      tod_morning: 'sabah',
      tod_afternoon: 'öğleden sonra',
      tod_evening: 'akşam',
      bite_0: 'Ventral Vagal durum sadece sakinlik değil, aynı zamanda güven içinde sosyal bağ kurma kapasitesidir.',
      bite_10: 'Yüzünüzü soğuk suyla yıkamak, "memeli dalış refleksi"ni tetikleyerek kalp atış hızını anında düşürür.',
      market_desc: 'Genişletilmiş wellness araçlarını keşfedin ve sisteminize ekleyin.'
    }
  },
  grup_11_insights: {
    title: 'Grup 11: Haftalık İçgörüler (Matrix)',
    regex: [/^insight_/],
    suggestions: {
      insight_template: 'Bu aralar genellikle {time} saatlerinde "{emotion}" hissediyorsunuz. Sisteminizin küçük bir şefkate ihtiyacı var.',
      insight_growth_desc: 'Sinir sistemi esnekliğiniz (plastisite) bu hafta %{percent} arttı. 🚀',
      insight_circadian_desc: 'Regülasyonun en derin olduğu anları {time} saatlerinde yakalıyorsunuz. ☀️',
      insight_advice_desc: 'Bedeniniz yüksek esneklik gösteriyor; yarın biraz daha uzun bir meditasyon deneyebilirsiniz. 🧘',
      insight_wired_title: 'Yüksek Aktivasyon',
      insight_wired_desc: 'Sisteminiz bu aralar oldukça yoğun çalışıyor.',
      insight_foggy_title: 'Düşük Enerji',
      insight_foggy_desc: 'Sisteminiz şu an tasarruf modunda.',
      insight_okay_title: 'Dengeli Akış',
      insight_okay_desc: 'Ventral güvenlik ve denge durumundasınız.',
      insight_compassion_needed: 'Sisteminizin şu an biraz ekstra şefkate ihtiyacı var.',
      insight_loading: 'Aura haftalık örüntülerinizi analiz ediyor...',
      insight_foggy_chronic_night: 'Sistem kapanmış ve hareketsiz. Sadece güvende hissetmeye ve anda kalmaya odaklanın.'
    }
  },
  grup_12_notebook: {
    title: 'Grup 12: Günlük (Notebook)',
    regex: [/^notebook_/],
    suggestions: {
      notebook_desc: 'Kişisel sağlık günlüğünüz.',
      notebook_empty: 'Henüz kayıt yok. Günlüğünüzü başlatmak için bir durum kontrolü tamamlayın.'
    }
  },
  grup_13_time_and_dates: {
    title: 'Grup 13: Zaman ve Tarihler',
    regex: [/^time_/],
    suggestions: {
      time_mins_ago: '{count} dk önce (dinamik sayı formatı için)',
      time_days_ago: '{count} gün önce'
    }
  }
};

let md = `# Aura Türkçe Metinler İnceleme ve Geribildirim Planı

Uygulamanın kalan tüm Türkçe metinleri mantıksal gruplar halinde aşağıda listelenmiştir. Lütfen tabloları inceleyip değiştirmek istediğiniz kısımları bildirin.

`;

const enKeys = Object.keys(locales.en);

for (const keyId in groups) {
  const g = groups[keyId];
  md += `## ${g.title}\n\n`;
  md += `| Anahtar (Key) | İngilizce (EN) | Mevcut Türkçe (TR) | Önerilen Editöryal Düzeltme |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;

  enKeys.forEach(key => {
    if (g.regex.some(regex => regex.test(key))) {
      const en = locales.en[key] ? locales.en[key].replace(/\n/g, '<br>').replace(/\|/g, '\\|') : '';
      const tr = locales.tr[key] ? locales.tr[key].replace(/\n/g, '<br>').replace(/\|/g, '\\|') : '';
      const suggestion = g.suggestions[key] ? g.suggestions[key] : '';
      md += `| **${key}** | ${en} | ${tr} | ${suggestion} |\n`;
    }
  });

  md += `\n---\n\n`;
}

fs.writeFileSync('/Users/dilovan/.gemini/antigravity/brain/76534040-ad1a-429b-a630-58e7b9621bf9/implementation_plan.md', md);
console.log('Successfully generated implementation_plan.md');
