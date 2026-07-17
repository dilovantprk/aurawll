/**
 * liquid-glass-webgl.js — v2 "Real Capture" Edition
 *
 * YAKLAŞIM:
 *   html2canvas ile arka planı gerçek anlamda snapshot'a alır,
 *   WebGL fragment shader ile refraksiyon + chromatic aberration + specular uygular.
 *   Sonuç: Apple iOS 26 / Applink kalitesinde liquid glass.
 *
 * LAYERS:
 *   1. html2canvas → background texture (gerçek piksel renkleri)
 *   2. WebGL → barrel lens + caustic noise + chromatic aberration + Fresnel specular
 *   3. CSS border/shadow → cam kenar chrome'u
 */

// ─────────────────────────────────────────────────────────────────────────────
// GLSL — Vertex Shader
// ─────────────────────────────────────────────────────────────────────────────
const VERT = `#version 300 es
precision highp float;
in  vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv        = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// ─────────────────────────────────────────────────────────────────────────────
// GLSL — Fragment Shader
// ─────────────────────────────────────────────────────────────────────────────
const FRAG = `#version 300 es
precision highp float;

uniform sampler2D u_bg;       // Real background texture
uniform vec2  u_res;          // Canvas resolution
uniform float u_time;
uniform vec2  u_mouse;        // 0..1
uniform float u_hover;        // 0..1
uniform float u_press;        // 0..1
uniform vec2  u_ripple;       // ripple origin 0..1
uniform float u_rippleT;      // ripple progress 0..1

in  vec2 v_uv;
out vec4 fragColor;

/* ── cheap hash noise ── */
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}

void main(){
  vec2 uv      = v_uv;
  float asp    = u_res.x / u_res.y;
  vec2  center = uv - 0.5;

  /* ── 1. Ripple wave ── */
  vec2 rUV = vec2(u_ripple.x, 1.0-u_ripple.y);
  float rDist = length((uv - rUV)*vec2(asp,1.));
  float ripple = 0.;
  if(u_rippleT > 0. && u_rippleT < 1.){
    float wave = sin((rDist - u_rippleT*1.4)*28.) * exp(-rDist*6.) * (1.-u_rippleT);
    ripple = wave * 0.022;
  }

  /* ── 2. Barrel / pincushion lens (glass thickness) ── */
  float r2          = dot(center, center);
  float barrel      = 0.18 + u_hover*0.06 - u_press*0.08;
  vec2  lensUV      = uv + center * r2 * barrel;

  /* ── 3. Animated caustic noise (surface micro-ripple) ── */
  float t   = u_time * 0.18;
  float n1  = noise(uv*4.0 + vec2( t,  t*0.6));
  float n2  = noise(uv*6.5 - vec2(t*0.7, t));
  vec2  cau = (vec2(n1,n2)-0.5) * 0.009;

  /* ── 4. Mouse parallax tilt ── */
  vec2 par = (u_mouse - 0.5) * 0.018 * u_hover;

  /* ── 5. Final refracted UV ── */
  vec2 refUV = lensUV + cau + par + ripple;
  refUV = clamp(refUV, 0.001, 0.999);

  /* ── 6. Chromatic aberration (R/G/B split) ── */
  vec2 caDir  = normalize(center + vec2(0.0001));
  float caStr = 0.007 + u_hover*0.004 + r2*0.016;

  float R = texture(u_bg, refUV + caDir*caStr*1.0).r;
  float G = texture(u_bg, refUV               ).g;
  float B = texture(u_bg, refUV - caDir*caStr*0.65).b;

  vec3 col = vec3(R, G, B);

  /* ── 7. Brightness lift & cool tint (glass transmittance) ── */
  col *= 1.15 + u_hover*0.08;
  col  = mix(col, col + vec3(0.03,0.04,0.09), 0.5);

  /* ── 8. Specular highlights ── */
  // Central point specular from top-left light
  vec2  lDir  = normalize(vec2(-0.6,-0.7));
  float sp    = pow(max(dot(-normalize(center), lDir), 0.), 12.) * 0.5;

  // Top-edge catch-light stripe
  float topE  = smoothstep(0.0, 0.06, uv.y) * (1.-smoothstep(0.0, 0.22, uv.y)) * 0.9;

  // Side-edge glint
  float sideL = smoothstep(0.0, 0.07, uv.x)  * (1.-smoothstep(0.0, 0.18, uv.x)) * 0.3;
  float sideR = smoothstep(0.93,1.0, uv.x)   * smoothstep(0.82, 1.0, uv.x)       * 0.3;

  float spec  = sp + topE + (sideL+sideR);
  spec       *= 1. + u_hover*0.4;
  col        += mix(vec3(1.), vec3(0.75,0.85,1.), 0.4) * spec;

  /* ── 9. Press darkening ── */
  col *= 1. - u_press*0.10;

  /* ── 10. Soft vignette ── */
  float vig = 1. - dot(center*1.6, center*1.6);
  vig = pow(clamp(vig,0.,1.), 0.25);
  col = mix(col*0.80, col, vig);

  /* ── 11. Filmic tonemap ── */
  col  = col / (col + 0.65);
  col *= 1.65;
  col  = clamp(col, 0., 1.);

  /* ── 12. Frosted-glass overlay (semi-transparent white tint) ── */
  col = mix(col, col + vec3(0.07,0.08,0.11), 0.25);

  fragColor = vec4(col, 1.0);
}`;

// ─────────────────────────────────────────────────────────────────────────────
// html2canvas lazy loader
// ─────────────────────────────────────────────────────────────────────────────
let _h2c = null;
async function getH2C() {
  if (_h2c) return _h2c;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = () => { _h2c = window.html2canvas; resolve(_h2c); };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-element renderer
// ─────────────────────────────────────────────────────────────────────────────
class LiquidGlassRenderer {
  constructor(el, opts = {}) {
    this.el   = el;
    this.opts = opts;
    this.mouse  = { x: 0.5, y: 0.5 };
    this.hover  = 0;  this._tHover = 0;
    this.press  = 0;  this._tPress = 0;
    this.ripple = { x: 0.5, y: 0.5, t: -1 };
    this.rafId  = null;
    this.dead   = false;
    this.lastCapture = 0;
    this.captureInterval = 1500; // ms between background re-captures

    this._buildCanvas();
    if (!this._initGL()) { this._cssOnly(); return; }
    this._bindEvents();
    this._captureAndStart();
  }

  // ── Canvas overlay ─────────────────────────────────────────────────────────
  _buildCanvas() {
    this.cv = document.createElement('canvas');
    Object.assign(this.cv.style, {
      position : 'absolute',
      inset    : '0',
      width    : '100%',
      height   : '100%',
      borderRadius: 'inherit',
      pointerEvents: 'none',
      zIndex   : '0',
    });
    const pos = getComputedStyle(this.el).position;
    if (pos === 'static') this.el.style.position = 'relative';
    this.el.insertBefore(this.cv, this.el.firstChild);
  }

  // ── WebGL2 init ────────────────────────────────────────────────────────────
  _initGL() {
    const gl = this.cv.getContext('webgl2', {
      alpha: false, antialias: false, powerPreference: 'default'
    });
    if (!gl) return false;
    this.gl = gl;

    const prog = this._mkProg(VERT, FRAG);
    if (!prog) return false;
    this.prog = prog;
    gl.useProgram(prog);

    // Quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1
    ]), gl.STATIC_DRAW);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.vao = vao;

    this.u = {
      bg    : gl.getUniformLocation(prog, 'u_bg'),
      res   : gl.getUniformLocation(prog, 'u_res'),
      time  : gl.getUniformLocation(prog, 'u_time'),
      mouse : gl.getUniformLocation(prog, 'u_mouse'),
      hover : gl.getUniformLocation(prog, 'u_hover'),
      press : gl.getUniformLocation(prog, 'u_press'),
      ripple: gl.getUniformLocation(prog, 'u_ripple'),
      rippleT:gl.getUniformLocation(prog, 'u_rippleT'),
    };

    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return true;
  }

  _mkProg(vs, fs) {
    const gl = this.gl;
    const v  = this._compile(gl.VERTEX_SHADER,   vs);
    const f  = this._compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p  = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('[LiquidGlass] Link:', gl.getProgramInfoLog(p)); return null;
    }
    return p;
  }
  _compile(type, src) {
    const gl = this.gl, s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[LiquidGlass] Shader:', gl.getShaderInfoLog(s)); return null;
    }
    return s;
  }

  // ── Capture background via html2canvas ────────────────────────────────────
  async _captureAndStart() {
    const h2c = await getH2C();
    if (!h2c) { this._cssOnly(); return; }
    this.h2c = h2c;
    await this._capture();
    this._loop();
  }

  async _capture() {
    if (!this.h2c || this.dead) return;
    const rect = this.el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;

    // Temporarily hide the glass canvas so it doesn't appear in the screenshot
    this.cv.style.display = 'none';

    try {
      const snap = await this.h2c(document.body, {
        x            : rect.left   + window.scrollX,
        y            : rect.top    + window.scrollY,
        width        : rect.width,
        height       : rect.height,
        scale        : Math.min(devicePixelRatio, 1.5),
        useCORS      : true,
        logging      : false,
        backgroundColor: '#090a0d',
        imageTimeout : 0,
        removeContainer: true,
      });

      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snap);
      this.lastCapture = performance.now();
    } catch(e) {
      // Silently continue — use last texture
    } finally {
      if (!this.dead) this.cv.style.display = '';
    }
  }

  // ── CSS-only fallback ─────────────────────────────────────────────────────
  _cssOnly() {
    if (this.cv) this.cv.remove();
  }

  // ── Events ────────────────────────────────────────────────────────────────
  _bindEvents() {
    const el = this.el;
    this._mv = (e) => {
      const r  = el.getBoundingClientRect();
      const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - r.left;
      const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - r.top;
      this.mouse.x = cx / r.width;
      this.mouse.y = cy / r.height;
    };
    this._en = () => { this._tHover = 1; };
    this._lv = () => { this._tHover = 0; this._tPress = 0; };
    this._dn = (e) => {
      this._tPress = 1;
      const r  = el.getBoundingClientRect();
      this.ripple.x = ((e.clientX ?? e.touches?.[0]?.clientX ?? 0) - r.left) / r.width;
      this.ripple.y = ((e.clientY ?? e.touches?.[0]?.clientY ?? 0) - r.top)  / r.height;
      this.ripple.t = 0.001;
    };
    this._up = () => { this._tPress = 0; };

    el.addEventListener('mousemove',  this._mv, { passive:true });
    el.addEventListener('touchmove',  this._mv, { passive:true });
    el.addEventListener('mouseenter', this._en, { passive:true });
    el.addEventListener('mouseleave', this._lv, { passive:true });
    el.addEventListener('mousedown',  this._dn, { passive:true });
    el.addEventListener('touchstart', this._dn, { passive:true });
    el.addEventListener('mouseup',    this._up, { passive:true });
    el.addEventListener('touchend',   this._up, { passive:true });
  }

  // ── Render loop ───────────────────────────────────────────────────────────
  _loop = (ts = 0) => {
    if (this.dead) return;
    this.rafId = requestAnimationFrame(this._loop);
    if (!this.gl) return;

    const gl = this.gl;
    const dt = 0.016;

    // Lerp
    this.hover = this.hover + (this._tHover - this.hover) * 0.12;
    this.press = this.press + (this._tPress - this.press) * 0.18;

    // Ripple
    if (this.ripple.t > 0) {
      this.ripple.t += dt * 1.6;
      if (this.ripple.t >= 1) this.ripple.t = -1;
    }

    // Periodic re-capture (only when visible, not too often)
    const now = performance.now();
    if (now - this.lastCapture > this.captureInterval && this.h2c) {
      this.lastCapture = now + 9999; // lock until async resolves
      this._capture();
    }

    // Resize
    const pr   = Math.min(devicePixelRatio, 2);
    const rect = this.el.getBoundingClientRect();
    const w    = Math.round(rect.width  * pr);
    const h    = Math.round(rect.height * pr);
    if (this.cv.width !== w || this.cv.height !== h) {
      this.cv.width  = w;
      this.cv.height = h;
      gl.viewport(0, 0, w, h);
    }

    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i (this.u.bg,     0);
    gl.uniform2f (this.u.res,    w, h);
    gl.uniform1f (this.u.time,   ts * 0.001);
    gl.uniform2f (this.u.mouse,  this.mouse.x, this.mouse.y);
    gl.uniform1f (this.u.hover,  this.hover);
    gl.uniform1f (this.u.press,  this.press);
    gl.uniform2f (this.u.ripple, this.ripple.x, this.ripple.y);
    gl.uniform1f (this.u.rippleT, Math.max(0, this.ripple.t));

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.rafId);
    if (this.cv) this.cv.remove();
    const el = this.el;
    el.removeEventListener('mousemove',  this._mv);
    el.removeEventListener('touchmove',  this._mv);
    el.removeEventListener('mouseenter', this._en);
    el.removeEventListener('mouseleave', this._lv);
    el.removeEventListener('mousedown',  this._dn);
    el.removeEventListener('touchstart', this._dn);
    el.removeEventListener('mouseup',    this._up);
    el.removeEventListener('touchend',   this._up);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Service API
// ─────────────────────────────────────────────────────────────────────────────
const _renderers = new Map(); // el → renderer
let   _started   = false;
let   _observer  = null;

export function initLiquidGlass() {
  if (_started) return;
  _started = true;

  // WebGL2 guard
  const t = document.createElement('canvas');
  if (!t.getContext('webgl2')) {
    console.info('[LiquidGlass] WebGL2 unavailable — CSS fallback active.');
    return;
  }

  _applyAll();

  // Watch for dynamic components
  _observer = new MutationObserver(_applyAll);
  _observer.observe(document.getElementById('app') || document.body, {
    childList: true, subtree: true,
  });
}

function _applyAll() {
  // Header island
  _attach(document.querySelector('.header-island'), { captureInterval: 2000 });

  // Small glass buttons in header
  document.querySelectorAll('.glass-btn.small-btn').forEach(el =>
    _attach(el, { captureInterval: 3000 })
  );

  // Back button droplet
  _attach(document.querySelector('.header-back-btn'), { captureInterval: 3000 });
}

function _attach(el, opts) {
  if (!el || _renderers.has(el)) return;
  const r = new LiquidGlassRenderer(el, opts);
  _renderers.set(el, r);
}

export function destroyLiquidGlass() {
  _observer?.disconnect();
  _renderers.forEach(r => r.destroy());
  _renderers.clear();
  _started = false;
}
