/**
 * Deterministic Weekly Insight Engine (Antigravity v2)
 * Purely local, rule-based wellness reports based on a 3x3x2 matrix.
 */

export async function getWeeklyInsight(weeklyData, currentLang, t) {
  if (!weeklyData || weeklyData.length < 3) return null;

  // 1. Determine Dominant State
  const counts = { wired: 0, foggy: 0, okay: 0 };
  weeklyData.forEach(item => {
    if (item.state && counts[item.state] !== undefined) {
      counts[item.state]++;
    }
  });
  
  const dominantState = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

  // 2. Determine Intensity
  let intensity = "light";
  if (weeklyData.length > 10) intensity = "chronic";
  else if (weeklyData.length > 5) intensity = "medium";

  // 3. Determine Circadian Time (Day/Night)
  const hour = new Date().getHours();
  const time = (hour >= 20 || hour < 6) ? "night" : "day";

  // 4. Matrix Lookup String
  const lookupKey = `insight_${dominantState}_${intensity}_${time}`;
  const reportText = t(lookupKey);

  // 5. Structure the report (Deterministic substrings)
  // For v2, we'll return a structured object that the dashboard expects.
  // Note: Since we don't have an AI to split the text, we'll use pre-defined split points 
  // or just put the whole text in summary.
  
  return JSON.stringify({
    summary: reportText,
    strength: t(`vagal_intensity_${intensity}`),
    focus: t(`vagal_${dominantState}`)
  });
}
