import { elements } from '../core/dom.js';
import { calculateVagalPoint, calculateVagalState, getWeightsFromState } from '../core/vagal-engine.js';
import { normalizeEntry } from '../core/utils.js';

export function renderVagalHeatmap(data, isModal = false) {
  const targetBlob = isModal ? document.querySelector('#vagalModalHeatmap .vagal-blob') : elements.vagalBlob;
  const targetTraces = isModal ? document.querySelector('#vagalModalHeatmap .vagal-traces') : elements.vagalTraces;
  
  if (!data) return;

  const normalized = normalizeEntry({ ...data });
  const v = data.ventral || data.coherence || 0;
  const s = data.sympathetic || data.mobilization || 0;
  const d = data.dorsal || data.immobilization || 0;

  const point = calculateVagalPoint(v, s, d);
  if (targetBlob) {
    targetBlob.style.left = point.x;
    targetBlob.style.top = point.y;
    targetBlob.style.opacity = '1';
    
    const regState = normalized?.regulation_state || 'coherence';
    const stateId = regState === 'coherence' ? 'okay' : 
                    regState === 'mobilization' ? 'wired' : 'foggy';
    
    document.documentElement.style.setProperty('--vagal-x', point.x);
    document.documentElement.style.setProperty('--vagal-y', point.y);
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
