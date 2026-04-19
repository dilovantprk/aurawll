import { elements } from '../core/dom.js';
import { calculateVagalPoint, calculateVagalState, getWeightsFromState } from '../vagal-logic.js';

export function renderVagalHeatmap(data, isModal = false) {
  const targetBlob = isModal ? document.querySelector('#vagalModalHeatmap .vagal-blob') : elements.vagalBlob;
  const targetTraces = isModal ? document.querySelector('#vagalModalHeatmap .vagal-traces') : elements.vagalTraces;
  
  if (!data) return;

  const point = calculateVagalPoint(data.ventral, data.sympathetic, data.dorsal);
  if (targetBlob) {
    targetBlob.style.left = point.x;
    targetBlob.style.top = point.y;
    targetBlob.style.opacity = '1';
    
    const stateId = (data.ventral > data.sympathetic && data.ventral > data.dorsal) ? 'okay' : 
                    (data.sympathetic > data.dorsal) ? 'wired' : 'foggy';
    
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
