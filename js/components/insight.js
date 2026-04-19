import { elements } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { AppState } from '../core/state.js';
import { calculatePlasticity, getWeightsFromState, calculateVagalPoint } from '../core/vagal-engine.js';
import { normalizeCheckinData } from '../core/utils.js';

export function updateInsightView(history) {
    const normalizedHistory = history.map(h => normalizeCheckinData(h));
    const safeHistory = (normalizedHistory.length > 0) ? normalizedHistory : [{ state: 'okay', timestamp: Date.now() }];
    
    const plasticity = calculatePlasticity(safeHistory);
    const dominantState = getDominantState(safeHistory);
    
    const insightSection = document.getElementById('view-insight');
    if (insightSection) {
        insightSection.classList.remove('theme-ventral', 'theme-sympathetic', 'theme-dorsal');
        insightSection.classList.add(`theme-${dominantState === 'okay' ? 'ventral' : (dominantState === 'wired' ? 'sympathetic' : 'dorsal')}`);
    }

    if (elements.insightHeroTitle) {
        elements.insightHeroTitle.innerText = generatePoeticInsight(dominantState, plasticity.score);
    }
    
    if (elements.resilienceScoreLarge) {
        elements.resilienceScoreLarge.innerText = plasticity.score;
    }

    const latest = history.length > 0 ? history[history.length - 1] : { state: 'okay' };
    const weights = getWeightsFromState(latest.state);
    const point = calculateVagalPoint(weights.wV, weights.wS, weights.wD);
    
    if (elements.macroBlob) {
        elements.macroBlob.style.left = point.x || '50%';
        elements.macroBlob.style.top = point.y || '50%';
    }
    
    renderEnergyPath(history);
    renderNarrativeCards(history);
}

function getDominantState(history) {
    const counts = { okay: 0, wired: 0, foggy: 0 };
    history.forEach(h => { if(h.state) counts[h.state]++; });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'okay');
}

function generatePoeticInsight(state, score) {
    if (score >= 80) return t('insight_bloom');
    if (state === 'okay') return t('insight_serene');
    if (state === 'wired') return t('insight_storm');
    return t('insight_light');
}

function renderEnergyPath(history) {
    const svg = elements.energyPathSvg;
    if (!svg) return;
    svg.innerHTML = '';
    const last7 = history.slice(-7);
    if (last7.length < 2) return;
}

function renderNarrativeCards(history) {
    if (!elements.insightNarratives) return;
}
