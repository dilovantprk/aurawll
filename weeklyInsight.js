export async function getWeeklyInsight(weeklyData, currentLang, t) {
  if (!weeklyData || weeklyData.length < 3) {
    return {
      heatmap_data: { ventral: 33, sympathetic: 33, dorsal: 34 },
      insight_title: currentLang === 'tr' ? "Yolculuk Başlıyor" : "The Journey Begins",
      summary: currentLang === 'tr' ? "İlk döngülerinizi tamamladıkça sinir sistemi örüntüleriniz burada belirecek. Her check-in kendinize bir adımdır." : "As you complete your first loops, your nervous system patterns will appear here. Each check-in is a step toward yourself.",
      strength: currentLang === 'tr' ? "Başlangıç" : "Beginning",
      focus: currentLang === 'tr' ? "Farkındalık" : "Awareness",
      recommendation: currentLang === 'tr' ? "Güne bir check-in ile başlayın." : "Start your day with a check-in."
    };
  }

  // 1. Calculate Heatmap Data (Percentages)
  const counts = { ventral: 0, sympathetic: 0, dorsal: 0 };
  weeklyData.forEach(item => {
    if (item.state === 'okay') counts.ventral++;
    else if (item.state === 'wired') counts.sympathetic++;
    else if (item.state === 'foggy') counts.dorsal++;
  });

  const total = counts.ventral + counts.sympathetic + counts.dorsal || 1;
  const heatmap_data = {
    ventral: Math.round((counts.ventral / total) * 100),
    sympathetic: Math.round((counts.sympathetic / total) * 100),
    dorsal: Math.round((counts.dorsal / total) * 100)
  };

  // Ensure sum is 100
  const sum = heatmap_data.ventral + heatmap_data.sympathetic + heatmap_data.dorsal;
  if (sum !== 100 && sum > 0) {
    heatmap_data.ventral += (100 - sum);
  }

  // 2. Determine Dominant State & Intensity (Streak)
  const dominantState = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  
  // Intensity Logic: Check for streaks in the last 3 logs
  const last3 = weeklyData.slice(-3);
  const stateMap = { ventral: 'okay', sympathetic: 'wired', dorsal: 'foggy' };
  const targetState = stateMap[dominantState];
  
  let intensity = 'light';
  const streakCount = last3.filter(l => l.state === targetState).length;
  if (streakCount === 3) intensity = 'chronic';
  else if (streakCount === 2) intensity = 'medium';

  // 3. Circadian Logic
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  const timeKey = isNight ? 'night' : 'day';

  // 4. Matrix Lookup
  // scenario keys in translations.js follow: {prefix}_{intensity}_{time}
  // prefixes: v (ventral), s (symp), d (dorsal)
  const prefixMap = { ventral: 'insight_okay', sympathetic: 'insight_wired', dorsal: 'insight_foggy' };
  const scenarioKey = `${prefixMap[dominantState]}_${intensity}_${timeKey}`;

  // 5. Build Report Object
  const analysis_text = t(scenarioKey);
  const intensityLabel = t(`vagal_intensity_${intensity}`);
  
  // Specific recommendations based on state (Static but relevant)
  const recs = {
    ventral: currentLang === 'tr' ? "Sosyal bağ kurun veya derinleşin." : "Connect with others or deepen your practice.",
    sympathetic: isNight ? (currentLang === 'tr' ? "4-7-8 Nefesi ile sistemi kapatın." : "Use 4-7-8 Breath to shut down.") : (currentLang === 'tr' ? "Kutu Nefesi ile enerjiyi yönetin." : "Manage energy with Box Breathing."),
    dorsal: currentLang === 'tr' ? "Nazik esneme ve soğuk su uyarısı." : "Gentle stretching and cold water splash."
  };

  return {
    heatmap_data,
    insight_title: currentLang === 'tr' ? "Sinir Sistemi Özeti" : "Nervous System Digest",
    summary: analysis_text,
    strength: currentLang === 'tr' ? (intensity === 'chronic' ? "Yüksek Farkındalık" : "Doğal Regülasyon") : (intensity === 'chronic' ? "High Awareness" : "Natural Regulation"),
    focus: `${intensityLabel} ${t('vagal_' + (dominantState === 'sympathetic' ? 'symp' : dominantState))}`,
    recommendation: recs[dominantState]
  };
}
