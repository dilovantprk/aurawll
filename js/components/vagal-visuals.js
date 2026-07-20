import { elements } from '../core/dom.js';
import { calculateVagalPoint, calculateVagalState, getWeightsFromState, calculateRegulationCapacity } from '../core/vagal-engine.js';
import { normalizeEntry, getRegulationStateLabel, getRegulationColor } from '../core/utils.js';
import { AppState } from '../core/state.js';

export function renderVagalHeatmap(data, isModal = false) {
  const targetBlob = isModal ? document.querySelector('#vagalModalHeatmap .vagal-blob') : elements.vagalBlob;
  const targetTraces = isModal ? document.querySelector('#vagalModalHeatmap .vagal-traces') : elements.vagalTraces;
  
  if (!data) return;

  const normalized = normalizeEntry({ ...data });
  const a = normalized?.pre_arousal !== undefined ? normalized.pre_arousal : 0.5;
  const v = normalized?.pre_valence !== undefined ? normalized.pre_valence : 0.5;
  const R = calculateRegulationCapacity(a, v);

  const point = calculateVagalPoint(R);
  if (targetBlob) {
    targetBlob.style.left = point.x;
    targetBlob.style.top = point.y;
    targetBlob.style.opacity = '1';
    
    const regState = normalized?.regulation_state || 'coherence';
    
    document.documentElement.style.setProperty('--vagal-x', point.x);
    document.documentElement.style.setProperty('--vagal-y', point.y);

    // Update dynamic label content and position next to the blob
    const statusLabel = isModal 
      ? document.querySelector('#vagalModalHeatmap .v-sympathetic') 
      : document.querySelector('#vagalHeatmapCard .v-sympathetic');
      
    if (statusLabel) {
      statusLabel.removeAttribute('data-i18n');
      const rScore = Math.round(R);
      const stateLabel = getRegulationStateLabel(R, a, AppState.lang);
      const scoreText = AppState.lang === 'tr' ? `R skoru: ${rScore}` : `R score: ${rScore}`;
      const stateColor = getRegulationColor(R);

      statusLabel.innerHTML = `
        <div class="status-name" style="color: ${stateColor}; font-weight: 600; font-size: 0.8rem; line-height: 1.2;">${stateLabel}</div>
        <div class="status-score" style="font-size: 0.65rem; color: rgba(255,255,255,0.4); margin-top: 3px;">${scoreText}</div>
      `;
      statusLabel.style.top = point.y;
    }
  }

  if (targetTraces) {
    targetTraces.innerHTML = '';
    let history = JSON.parse(localStorage.getItem('vagal_history') || '[]');
    const traceSlice = history.slice(-7);
    traceSlice.forEach(pt => {
      const trace = document.createElement('div');
      trace.className = 'vagal-trace-point';
      trace.style.left = pt.x;
      trace.style.top = pt.y;
      targetTraces.appendChild(trace);
    });
  }
}
