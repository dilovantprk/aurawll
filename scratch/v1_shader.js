/**
 * liquid-glass-webgl.js
 * WebGL Liquid Glass Shader Engine — Apple Applink / iOS 26 style
 * 
 * Nasıl çalışır:
 * - Her .liquid-glass elemanı için bir <canvas> oluşturur
 * - WebGL ile fragment shader çalıştırır: arkayı screenshot olarak sampler'a bağlar
 * - Refraksiyon + chromatic aberration + specular highlight + ripple distortion
 * - GPU üzerinde 60fps çalışır, CPU maliyeti minimumdur
 */

// ─── Vertex Shader ─────────────────────────────────────────────────────────
const VERT_SRC = `#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// ─── Fragment Shader ────────────────────────────────────────────────────────
const FRAG_SRC = `#version 300 es
precision highp float;

uniform sampler2D u_scene;       // Arka plan snapshot
uniform vec2      u_resolution;  // Canvas boyutu
uniform float     u_time;        // Zaman (saniye)
uniform vec2      u_mouse;       // Normalize mouse (0..1)
uniform float     u_hover;       // 0.0 → 1.0 hover lerp
uniform float     u_press;       // 0.0 → 1.0 press lerp
uniform vec2      u_ripple;      // Ripple origin (normalize)
uniform float     u_rippleT;     // Ripple zaman
uniform float     u_isBtn;       // 1.0 = button mode, 0.0 = header mode

in vec2 v_uv;
out vec4 fragColor;

// ─── Helpers ────────────────────────────────────────────────────────────────

// Smooth rounded box SDF — returns 0..1 alpha within the shape
float roundedBoxSDF(vec2 uv, vec2 size, float radius) {
  vec2 q = abs(uv - 0.5) * size - size * 0.5 + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

// Fresnel approximation — stronger on edges
float fresnel(vec2 uv, float power) {
  vec2 n = normalize(uv - 0.5);
  float d = length(uv - 0.5) * 2.0;
  return pow(clamp(d, 0.0, 1.0), power);
}

// Simplex-style 2D noise (cheap, no texture needed)
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  // ─── 1. Ripple distortion ─────────────────────────────────────────────────
  float ripple = 0.0;
  if (u_rippleT > 0.0 && u_rippleT < 1.0) {
    vec2 rippleUV = vec2(u_ripple.x, 1.0 - u_ripple.y);
    float dist = length((uv - rippleUV) * vec2(aspect, 1.0));
    float waveRadius = u_rippleT * 1.5;
    float wave = sin((dist - waveRadius) * 30.0) * exp(-dist * 5.0) * (1.0 - u_rippleT);
    ripple = wave * 0.018;
  }

  // ─── 2. Barrel lens distortion (glass thickness) ─────────────────────────
  vec2 centered = uv - 0.5;
  float lensDist = dot(centered, centered);
  float barrelStrength = 0.12 + u_hover * 0.04 + u_press * (-0.06);
  vec2 barrelUV = uv + centered * lensDist * barrelStrength;

  // ─── 3. Caustic noise flow ────────────────────────────────────────────────
  float t = u_time * 0.25;
  float n1 = noise(uv * 3.5 + vec2(t, t * 0.7));
  float n2 = noise(uv * 5.2 - vec2(t * 0.8, t));
  vec2 causticOffset = (vec2(n1, n2) - 0.5) * 0.008;

  // ─── 4. Mouse parallax shift ─────────────────────────────────────────────
  vec2 mouseShift = (u_mouse - 0.5) * 0.015 * u_hover;

  // ─── 5. Final refracted UV ───────────────────────────────────────────────
  vec2 refractUV = barrelUV + causticOffset + mouseShift + ripple;
  refractUV = clamp(refractUV, 0.001, 0.999);

  // ─── 6. Chromatic Aberration ─────────────────────────────────────────────
  float caStrength = 0.004 + u_hover * 0.003 + lensDist * 0.012;
  vec2 caDir = normalize(centered + vec2(0.001));

  float r = texture(u_scene, refractUV + caDir * caStrength * 1.0).r;
  float g = texture(u_scene, refractUV).g;
  float b = texture(u_scene, refractUV - caDir * caStrength * 0.7).b;
  float a = texture(u_scene, refractUV).a;

  vec4 refracted = vec4(r, g, b, a);

  // ─── 7. Glass tint + brightness boost ────────────────────────────────────
  refracted.rgb *= 1.08 + u_hover * 0.06;
  refracted.rgb = mix(refracted.rgb, refracted.rgb + vec3(0.04, 0.05, 0.08), 0.4);

  // ─── 8. Specular highlight (top-left catch light) ────────────────────────
  // Direction from top-left light source
  vec2 lightDir = normalize(vec2(-0.7, -0.7));
  float specular = max(0.0, dot(-centered / max(length(centered), 0.001), lightDir));
  specular = pow(specular, 8.0) * 0.35;

  // Top edge specular stripe (glass edge catch)
  float edgeSpec = smoothstep(0.0, 0.12, 1.0 - uv.y) * smoothstep(0.0, 0.05, uv.y);
  edgeSpec *= (1.0 - smoothstep(0.05, 0.25, uv.y)) * 0.7;

  // Side edge reflections
  float sideSpecL = smoothstep(0.0, 0.08, uv.x) * (1.0 - smoothstep(0.0, 0.2, uv.x));
  float sideSpecR = smoothstep(0.92, 1.0, uv.x) * smoothstep(0.8, 1.0, uv.x);
  float sideSpec = (sideSpecL + sideSpecR) * 0.3;

  float totalSpec = specular + edgeSpec + sideSpec;
  totalSpec *= (1.0 + u_hover * 0.3);

  vec3 specColor = mix(vec3(1.0), vec3(0.8, 0.85, 1.0), 0.5);
  refracted.rgb += specColor * totalSpec;

  // ─── 9. Press darkening ──────────────────────────────────────────────────
  refracted.rgb *= (1.0 - u_press * 0.08);

  // ─── 10. Vignette (softens edges) ────────────────────────────────────────
  float vign = 1.0 - dot(centered * 1.8, centered * 1.8);
  vign = clamp(vign, 0.0, 1.0);
  vign = pow(vign, 0.3);
  refracted.rgb = mix(refracted.rgb * 0.85, refracted.rgb, vign);

  // ─── 11. HDR tonemap (prevent blown highlights) ───────────────────────────
  refracted.rgb = refracted.rgb / (refracted.rgb + 0.8);
  refracted.rgb *= 1.8;
  refracted.rgb = clamp(refracted.rgb, 0.0, 1.0);

  fragColor = refracted;
}
`;

// ─── LiquidGlassRenderer ────────────────────────────────────────────────────

class LiquidGlassRenderer {
  constructor(targetEl, options = {}) {
    this.el = targetEl;
    this.opts = {
      isBtn: options.isBtn ?? false,
      borderRadius: options.borderRadius ?? 32,
      ...options,
    };

    this.mouse = { x: 0.5, y: 0.5 };
    this.hover = 0;
    this.press = 0;
    this.ripple = { x: 0.5, y: 0.5, t: -1 };
    this.rafId = null;
    this.destroyed = false;

    this._buildCanvas();
    this._initWebGL();
    this._bindEvents();
    this._loop();
  }

  // ── Canvas setup ──────────────────────────────────────────────────────────
  _buildCanvas() {
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      borderRadius: 'inherit',
      pointerEvents: 'none',
      zIndex: '0',
    });

    // Ensure target has relative positioning
    const pos = getComputedStyle(this.el).position;
    if (pos === 'static') this.el.style.position = 'relative';

    // Insert canvas as first child so content sits on top
    this.el.insertBefore(this.canvas, this.el.firstChild);
  }

  // ── WebGL init ────────────────────────────────────────────────────────────
  _initWebGL() {
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      powerPreference: 'default',
    });

    if (!gl) {
      console.warn('[LiquidGlass] WebGL2 not supported, falling back.');
      this.canvas.remove();
      return;
    }

    this.gl = gl;
    this.program = this._buildProgram(VERT_SRC, FRAG_SRC);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1,  1, 1, -1,  1, 1,
    ]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(this.program, 'a_position');
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(loc);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.vao = vao;

    // Uniforms
    gl.useProgram(this.program);
    this.u = {
      scene:      gl.getUniformLocation(this.program, 'u_scene'),
      resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      time:       gl.getUniformLocation(this.program, 'u_time'),
      mouse:      gl.getUniformLocation(this.program, 'u_mouse'),
      hover:      gl.getUniformLocation(this.program, 'u_hover'),
      press:      gl.getUniformLocation(this.program, 'u_press'),
      ripple:     gl.getUniformLocation(this.program, 'u_ripple'),
      rippleT:    gl.getUniformLocation(this.program, 'u_rippleT'),
      isBtn:      gl.getUniformLocation(this.program, 'u_isBtn'),
    };

    // Texture for background snapshot
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  _buildProgram(vertSrc, fragSrc) {
    const gl = this.gl;
    const vert = this._compileShader(gl.VERTEX_SHADER, vertSrc);
    const frag = this._compileShader(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[LiquidGlass] Program link error:', gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  _compileShader(type, src) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[LiquidGlass] Shader compile error:', gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  // ── Events ────────────────────────────────────────────────────────────────
  _bindEvents() {
    const el = this.el;

    this._onMove = (e) => {
      const r = el.getBoundingClientRect();
      const cx = (e.clientX ?? e.touches?.[0]?.clientX) - r.left;
      const cy = (e.clientY ?? e.touches?.[0]?.clientY) - r.top;
      this.mouse.x = cx / r.width;
      this.mouse.y = cy / r.height;
    };

    this._onEnter = () => { this._targetHover = 1; };
    this._onLeave = () => { this._targetHover = 0; this._targetPress = 0; };
    this._onDown = (e) => {
      this._targetPress = 1;
      const r = el.getBoundingClientRect();
      const cx = ((e.clientX ?? e.touches?.[0]?.clientX) - r.left) / r.width;
      const cy = ((e.clientY ?? e.touches?.[0]?.clientY) - r.top) / r.height;
      this.ripple = { x: cx, y: cy, t: 0.001 };
    };
    this._onUp = () => { this._targetPress = 0; };

    el.addEventListener('mousemove',  this._onMove,  { passive: true });
    el.addEventListener('touchmove',  this._onMove,  { passive: true });
    el.addEventListener('mouseenter', this._onEnter, { passive: true });
    el.addEventListener('mouseleave', this._onLeave, { passive: true });
    el.addEventListener('mousedown',  this._onDown,  { passive: true });
    el.addEventListener('touchstart', this._onDown,  { passive: true });
    el.addEventListener('mouseup',    this._onUp,    { passive: true });
    el.addEventListener('touchend',   this._onUp,    { passive: true });

    this._targetHover = 0;
    this._targetPress = 0;
  }

  // ── Background capture ────────────────────────────────────────────────────
  _captureBackground() {
    if (!this.gl) return;
    const gl = this.gl;
    const rect = this.el.getBoundingClientRect();

    // Use the gradient background element directly
    const bgEl = document.getElementById('aura-background');
    if (!bgEl) return;

    // Read pixels from aura-background canvas if it has a canvas child,
    // otherwise use a CSS snapshot via drawImage on an offscreen canvas
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width  = Math.round(rect.width);
    bgCanvas.height = Math.round(rect.height);
    const ctx = bgCanvas.getContext('2d');

    // Draw body background color
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#090a0d';
    ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Overlay gradient blobs
    const style = getComputedStyle(bgEl);
    const bgImage = style.backgroundImage;

    // Since we can't easily re-render CSS gradients to canvas,
    // we synthesize the background procedurally:
    const w = bgCanvas.width;
    const h = bgCanvas.height;

    // Primary dark base
    const grad1 = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.9);
    grad1.addColorStop(0, 'rgba(100,80,130,0.18)');
    grad1.addColorStop(1, 'rgba(9,10,13,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);

    const grad2 = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, w * 0.5);
    grad2.addColorStop(0, 'rgba(125,145,123,0.10)');
    grad2.addColorStop(1, 'rgba(9,10,13,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);

    const grad3 = ctx.createRadialGradient(w * 0.15, h * 0.85, 0, w * 0.15, h * 0.85, w * 0.5);
    grad3.addColorStop(0, 'rgba(109,127,148,0.10)');
    grad3.addColorStop(1, 'rgba(9,10,13,0)');
    ctx.fillStyle = grad3;
    ctx.fillRect(0, 0, w, h);

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  _resize() {
    if (!this.gl) return;
    const pr = Math.min(devicePixelRatio, 2);
    const rect = this.el.getBoundingClientRect();
    const w = Math.round(rect.width  * pr);
    const h = Math.round(rect.height * pr);

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width  = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  // ── Render loop ───────────────────────────────────────────────────────────
  _loop = (ts = 0) => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this._loop);

    if (!this.gl) return;

    const gl = this.gl;
    const dt = 0.016;
    const time = ts * 0.001;

    // Lerp hover / press
    const lerpSpeed = 6 * dt;
    this.hover = this.hover + (this._targetHover - this.hover) * Math.min(lerpSpeed * 8, 1);
    this.press = this.press + (this._targetPress - this.press) * Math.min(lerpSpeed * 12, 1);

    // Ripple advance
    if (this.ripple.t > 0) {
      this.ripple.t += dt * 1.5;
      if (this.ripple.t >= 1) this.ripple.t = -1;
    }

    this._resize();
    this._captureBackground();

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.u.scene, 0);

    gl.uniform2f(this.u.resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.time, time);
    gl.uniform2f(this.u.mouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.u.hover, this.hover);
    gl.uniform1f(this.u.press, this.press);
    gl.uniform2f(this.u.ripple, this.ripple.x, this.ripple.y);
    gl.uniform1f(this.u.rippleT, Math.max(0, this.ripple.t));
    gl.uniform1f(this.u.isBtn, this.opts.isBtn ? 1.0 : 0.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  // ── Cleanup ───────────────────────────────────────────────────────────────
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    this.canvas.remove();
    const el = this.el;
    el.removeEventListener('mousemove',  this._onMove);
    el.removeEventListener('touchmove',  this._onMove);
    el.removeEventListener('mouseenter', this._onEnter);
    el.removeEventListener('mouseleave', this._onLeave);
    el.removeEventListener('mousedown',  this._onDown);
    el.removeEventListener('touchstart', this._onDown);
    el.removeEventListener('mouseup',    this._onUp);
    el.removeEventListener('touchend',   this._onUp);
  }
}

// ─── LiquidGlassService ─────────────────────────────────────────────────────

let _renderers = [];
let _initialized = false;

/**
 * Tüm .liquid-glass ve header-island + glass-btn elemanlarına WebGL shader uygular.
 * app.js init sonrası çağrılabilir.
 */
export function initLiquidGlass() {
  if (_initialized) return;
  _initialized = true;

  // WebGL2 desteği yoksa hiçbir şey yapma
  const testCanvas = document.createElement('canvas');
  if (!testCanvas.getContext('webgl2')) {
    console.info('[LiquidGlass] WebGL2 not available, CSS fallback active.');
    return;
  }

  _applyToElements();

  // DOM değişikliklerini izle (lazy-rendered componentlar için)
  const observer = new MutationObserver(_applyToElements);
  observer.observe(document.getElementById('app') || document.body, {
    childList: true,
    subtree: true,
  });
}

function _applyToElements() {
  // Header island
  const header = document.querySelector('.header-island');
  if (header && !header.__lgr) {
    header.__lgr = new LiquidGlassRenderer(header, { isBtn: false });
    _renderers.push(header.__lgr);
  }

  // glass-btn'ler (mute, info)
  document.querySelectorAll('.glass-btn.small-btn').forEach(btn => {
    if (!btn.__lgr) {
      btn.__lgr = new LiquidGlassRenderer(btn, { isBtn: true, borderRadius: 20 });
      _renderers.push(btn.__lgr);
    }
  });

  // header-back-btn
  const backBtn = document.querySelector('.header-back-btn');
  if (backBtn && !backBtn.__lgr) {
    backBtn.__lgr = new LiquidGlassRenderer(backBtn, { isBtn: true, borderRadius: 50 });
    _renderers.push(backBtn.__lgr);
  }

  // primary-btn'ler (check-in flow vb.)
  document.querySelectorAll('.primary-btn').forEach(btn => {
    if (!btn.__lgr) {
      btn.__lgr = new LiquidGlassRenderer(btn, { isBtn: true, borderRadius: 40 });
      _renderers.push(btn.__lgr);
    }
  });
}

export function destroyLiquidGlass() {
  _renderers.forEach(r => r.destroy());
  _renderers = [];
  _initialized = false;
}
