import { elements } from '../core/dom.js';
import { calculateVagalPoint, calculateVagalState, getWeightsFromState, calculateRegulationCapacity } from '../core/vagal-engine.js';
import { normalizeEntry, getRegulationStateLabel } from '../core/utils.js';
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
    const stateId = regState === 'coherence' ? 'okay' : 
                    regState === 'mobilization' ? 'wired' : 'foggy';
    
    document.documentElement.style.setProperty('--vagal-x', point.x);
    document.documentElement.style.setProperty('--vagal-y', point.y);

    // Update dynamic label content and position next to the blob
    const statusLabel = isModal 
      ? document.querySelector('#vagalModalHeatmap .v-sympathetic') 
      : document.querySelector('#vagalHeatmapCard .v-sympathetic');
      
    if (statusLabel) {
      statusLabel.textContent = getRegulationStateLabel(R, a, AppState.lang);
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
