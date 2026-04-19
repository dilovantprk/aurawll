// js/services/insight-engine.js
import { t } from '../core/i18n.js';

export function getWeeklyInsight(historyData) {
  if (!historyData || historyData.length < 3) return null;
  
  const counts = { wired: 0, foggy: 0, okay: 0 };
  historyData.forEach(h => {
    if (h.state) counts[h.state]++;
  });

  const dominant = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  
  const insights = {
    wired: {
      title: t('insight_wired_title'),
      desc: t('insight_wired_desc')
    },
    foggy: {
      title: t('insight_foggy_title'),
      desc: t('insight_foggy_desc')
    },
    okay: {
      title: t('insight_okay_title'),
      desc: t('insight_okay_desc')
    }
  };

  return insights[dominant];
}
