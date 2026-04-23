// js/services/insight-engine.js
import { t } from '../core/i18n.js';

export function getWeeklyInsight(historyData, currentLang = 'tr') {
  if (!historyData || historyData.length < 3) {
    return {
      title: currentLang === 'tr' ? "Yolculuk Başlıyor" : "The Journey Begins",
      desc: currentLang === 'tr' ? "İlk döngülerinizi tamamladıkça sinir sistemi örüntüleriniz burada belirecek." : "As you complete your first loops, your patterns will appear here.",
      focus: currentLang === 'tr' ? "Farkındalık" : "Awareness",
      recommendation: currentLang === 'tr' ? "Güne check-in ile başla." : "Start with check-in."
    };
  }

  const counts = { wired: 0, foggy: 0, okay: 0 };
  historyData.forEach(h => {
    if (h && h.state && counts.hasOwnProperty(h.state)) {
      counts[h.state]++;
    }
  });

  // Ensure we have a valid dominant state, default to 'okay'
  const dominant = Object.keys(counts).reduce((a, b) => counts[a] >= counts[b] ? a : b) || 'okay';
  
  // Intensity Logic
  const last3 = historyData.slice(0, 3);
  let intensity = 'light';
  const streakCount = last3.filter(l => l && l.state === dominant).length;
  if (streakCount === 3) intensity = 'chronic';
  else if (streakCount === 2) intensity = 'medium';

  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  const timeKey = isNight ? 'night' : 'day';

  // Matrix Lookup
  const prefixMap = { okay: 'insight_okay', wired: 'insight_wired', foggy: 'insight_foggy' };
  const prefix = prefixMap[dominant] || 'insight_okay';
  const scenarioKey = `${prefix}_${intensity}_${timeKey}`;

  const recs = {
    okay: currentLang === 'tr' ? "Sosyal bağ kurun." : "Connect with others.",
    wired: isNight ? (currentLang === 'tr' ? "4-7-8 Nefesi" : "4-7-8 Breath") : (currentLang === 'tr' ? "Kutu Nefesi" : "Box Breathing"),
    foggy: currentLang === 'tr' ? "Nazik hareket." : "Gentle movement."
  };

  return {
    title: t(`insight_${dominant}_title`),
    desc: t(scenarioKey) || t(`insight_${dominant}_desc`),
    focus: t(`vagal_${dominant === 'wired' ? 'symp' : (dominant === 'okay' ? 'ventral' : 'dorsal')}`),
    recommendation: recs[dominant]
  };
}
