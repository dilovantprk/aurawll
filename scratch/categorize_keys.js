import { locales } from '../translations.js';

const groups = {
  navigation_and_meditation_protocols: [
    /^nav_/, /^cat_/, /^med_/, /^meditations_/, /^benefit_/, /^title_p_/
  ],
  global_buttons_and_settings: [
    /^btn_/, /^auth_/, /^settings_/, /^welcome_/
  ],
  profile_and_stats: [
    /^guest_/, /^prof_/, /^comm_/, /^stat_/
  ],
  sleep_focus_ambient: [
    /^sleep_/, /^focus_/, /^amb_/, /^ambient_/, /^meditation_loading_desc$/
  ],
  dashboard_and_badges: [
    /^dash_/, /^badge_/, /^compassion_/, /^vagal_/, /^checkin_/
  ],
  somatic_sensations: [
    /^som_/, /^picker_/, /^state_/, /^bs_/, /^step_/, /^grid_/, /^mar_/, /^somatic_/
  ],
  emotions_and_subemotions: [
    /^emotion_/, /^emo_/, /^se_/, /^sub_/
  ],
  exercises_and_science: [
    /^ex_/, /^mc_p_/, /^sci_/, /^info_/, /^recommendation_title$/
  ],
  onboarding_and_other: [
    /^onb_/, /^done_/, /^notif_/, /^scan_/
  ],
  intentions_and_legal: [
    /^intent_/, /^bite_/, /^market_/, /^tod_/, /^day_/, /^plasticity_/
  ],
  insights: [
    /^insight_/
  ],
  notebook: [
    /^notebook_/
  ],
  time_and_dates: [
    /^time_/
  ]
};

const categorize = () => {
  const result = {};
  for (const groupName in groups) {
    result[groupName] = [];
  }
  result.unclassified = [];

  const enKeys = Object.keys(locales.en);
  enKeys.forEach(key => {
    let matched = false;
    for (const groupName in groups) {
      if (groups[groupName].some(regex => regex.test(key))) {
        result[groupName].push(key);
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.unclassified.push(key);
    }
  });

  return result;
};

const categorizedKeys = categorize();
const targetGroup = process.argv[2];

if (!targetGroup || !categorizedKeys[targetGroup]) {
  console.log('Available groups:');
  Object.keys(categorizedKeys).forEach(g => {
    console.log(`- ${g} (${categorizedKeys[g].length} keys)`);
  });
} else {
  categorizedKeys[targetGroup].forEach(key => {
    console.log(JSON.stringify({
      key,
      en: locales.en[key] || '',
      tr: locales.tr[key] || ''
    }));
  });
}
