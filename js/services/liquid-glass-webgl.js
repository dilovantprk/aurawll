/**
 * liquid-glass-webgl.js — v4 "Premium Liquid Glass" Edition
 *
 * YAKLAŞIM (Apple Applink / iOS 26 Tarzı Premium Cam):
 * - CSS `backdrop-filter: blur` ile arkaplan gerçek zamanlı (60fps) bulanıklaştırılır.
 * - WebGL canvas (şeffaf arkaplanlı) elementin içine, metnin arkasına yerleştirilir.
 * - WebGL Shader şunları çizer:
 *   1. Dinamik renkli sıvı dalgaları (Polyvagal duruma göre renk alır).
 *   2. Gerçekçi 3D cam eğimi (Normal Map) SDF türevleriyle otomatik hesaplanır.
 *   3. Mouse/Dokunma ile hareket eden Specular Highlight (parlama).
 *   4. Cam kenarlarında kromatik kırılma (Chromatic Aberration).
 * - html2canvas YOK! Lag, kasma ve yazıların bozulması tamamen çözüldü.
 */

const VERT = `#version 300 es
precision highp float;
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  u_res;          // Canvas çözünürlüğü
uniform float u_time;         // Zaman
uniform vec2  u_mouse;        // Normalize mouse pos (0..1)
uniform float u_hover;        // 0.0 → 1.0 hover lerp
uniform float u_press;        // 0.0 → 1.0 press lerp
uniform vec2  u_ripple;       // Ripple merkezi
uniform float u_rippleT;      // Ripple zamanı (0..1)
uniform float u_radius;       // Cam kenar ovalliği (px)
uniform vec3  u_themeColor;   // Vagal duruma göre ana sıvı rengi (RGB)

in vec2 v_uv;
out vec4 fragColor;

// --- Simplex / Hash Noise ---
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float f = 0.0, amp = 0.5;
  for(int i = 0; i < 4; i++) {
    f += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return f;
}

// --- Signed Distance Field (SDF) for Rounded Box ---
float roundedBoxSDF(vec2 p, vec2 size, float radius) {
  vec2 d = abs(p) - size + vec2(radius);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - radius;
}

void main() {
  vec2 uv = v_uv;
  vec2 pixelPos = uv * u_res;
  vec2 center = u_res * 0.5;

  // 1. 3D Cam Eğimi (Normal Map Hesaplama)
  // Elementin sınırlarına olan uzaklığı SDF ile buluyoruz
  float dist = roundedBoxSDF(pixelPos - center, center, u_radius);
  
  // Sınırdan içeriye doğru 15 piksellik bir "eğim" (bevel) alanı
  float rollOff = clamp(-dist / 15.0, 0.0, 1.0);
  
  // Cam bombesi (Sine eğrisi şeklinde yükselir)
  float height = sin(rollOff * 1.57079); 
  
  // Türev (dFdx/dFdy) kullanarak eğimden Normal vektörü çıkarıyoruz (Magic!)
  float bumpScale = 30.0;
  vec3 normal = normalize(vec3(-dFdx(height) * bumpScale, dFdy(height) * bumpScale, 1.0));

  // 2. Dalga (Ripple) Etkisi
  vec2 rUV = vec2(u_ripple.x, 1.0 - u_ripple.y);
  float rDist = length((uv - rUV) * vec2(u_res.x / u_res.y, 1.0));
  if (u_rippleT > 0.0 && u_rippleT < 1.0) {
    float wave = sin((rDist - u_rippleT * 1.2) * 40.0) * exp(-rDist * 5.0) * (1.0 - u_rippleT);
    normal.xy += wave * 0.2;
    normal = normalize(normal);
  }

  // 3. Işık (Specular Highlight) - Mouse'a doğru eğilen parlama
  vec2 mouseUV = vec2(u_mouse.x, 1.0 - u_mouse.y);
  // Mouse yoksa yukarıdan, mouse varsa mouse pozisyonundan gelen ışık
  vec3 lightPos = mix(vec3(0.5, 1.5, 1.0), vec3(mouseUV.x * 2.0 - 0.5, mouseUV.y * 2.0 - 0.5, 0.8), u_hover);
  
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 lightDir = normalize(lightPos - vec3(uv, 0.0));
  vec3 halfVector = normalize(lightDir + viewDir);
  
  // Parlaklık gücü
  float specular = pow(max(dot(normal, halfVector), 0.0), 60.0);
  
  // Üst kenar parlaması (Kenardan gelen sabit ışık)
  float topEdgeLight = max(0.0, normal.y) * (1.0 - height) * 0.8;
  float sideEdgeLight = abs(normal.x) * (1.0 - height) * 0.3;
  float totalSpecular = (specular * (0.4 + u_hover * 0.4) + topEdgeLight + sideEdgeLight) * (1.0 - u_press * 0.5);

  // 4. Renkli Sıvı Animasyonu (Fluid Waves)
  float t = u_time * 0.2;
  // Kromatik Aberasyon için Normal Map tabanlı R/G/B ofsetleri
  float caStr = 0.02 * (1.0 - height); // Kenarlarda kırılma daha fazla
  
  // Renk dalgalanmasını Vagal temaya göre karıştırıyoruz
  vec3 fluidBaseColor = u_themeColor;
  
  float nR = fbm(uv * 3.0 + vec2(t, t) + normal.xy * caStr);
  float nG = fbm(uv * 3.0 + vec2(t * 1.2, -t) + normal.xy * (caStr * 0.5));
  float nB = fbm(uv * 3.0 + vec2(-t, t * 0.8) - normal.xy * caStr);
  
  vec3 fluidWaves = vec3(nR, nG, nB) * 0.4 + 0.6; // Kontrast ayarı
  vec3 finalFluidColor = fluidBaseColor * fluidWaves * 1.5;

  // 5. Şeffaflık (Alpha) ve Renk Birleşimi
  // Arkaplan native CSS backdrop-filter tarafından bulanıklaştırıldığı için,
  // biz sadece yansıma, parlama ve çok hafif bir sıvı rengi ekleyip alfa ile şeffaf bırakıyoruz.
  
  float fluidAlpha = 0.15 + u_hover * 0.05; // Sıvının opaklığı çok hafif olmalı ki cam gibi dursun
  
  vec4 finalColor = vec4(finalFluidColor, fluidAlpha);
  
  // Specular ışık beyazdır ve opaktır
  vec3 highlightColor = vec3(1.0, 1.0, 1.0);
  
  // Çıktı rengi (RGB önceden alfa ile çarpılmış şekilde harmanlanır - additive/alpha blending)
  // Ancak WebGL blend ayarlarımıza göre standart alfa yapacağız.
  finalColor.rgb += highlightColor * totalSpecular * 0.8;
  finalColor.a = clamp(finalColor.a + totalSpecular * 0.6, 0.0, 1.0); // Işık vuran yerler daha opak
  
  // Sınırın dışındaysa (SDF > 0) hiçbir şey çizme
  if (dist > 0.0) {
    discard;
  }

  fragColor = finalColor;
}`;

// ─────────────────────────────────────────────────────────────────────────────
// Renderer Sınıfı
// ─────────────────────────────────────────────────────────────────────────────
class LiquidGlassRenderer {
  constructor(el, opts = {}) {
    this.el = el;
    this.opts = {
      isBtn: false,
      radius: 32, // CSS border-radius ile aynı olmalı
      ...opts
    };
    
    // Durum Değişkenleri
    this.mouse = { x: 0.5, y: 0.5 };
    this.hover = 0; this._tHover = 0;
    this.press = 0; this._tPress = 0;
    this.ripple = { x: 0.5, y: 0.5, t: -1 };
    
    this.dead = false;
    this.rafId = null;
    this.themeColor = [125/255, 145/255, 123/255]; // Varsayılan Ventral Yeşil

    this.isVisible = true;
    this.io = new IntersectionObserver(entries => {
      this.isVisible = entries[0].isIntersecting;
    });
    this.io.observe(this.el);

    this._prepareDOM();
    if (!this._initGL()) return;
    this._bindEvents();
    this._loop();
  }

  _prepareDOM() {
    // Ana elementin CSS ayarları
    const style = getComputedStyle(this.el);
    if (style.position === 'static') this.el.style.position = 'relative';
    
    // CSS Blur (Arkaplanı bulanıklaştıran native motor)
    if (!this.el.classList.contains('lg-applied')) {
      this.el.style.backdropFilter = 'blur(20px) saturate(180%)';
      this.el.style.webkitBackdropFilter = 'blur(20px) saturate(180%)';
      this.el.style.backgroundColor = 'transparent';
      this.el.style.border = '1px solid rgba(255, 255, 255, 0.15)';
      this.el.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.2)';
      this.el.style.overflow = 'hidden';
      this.el.classList.add('lg-applied');
      
      // Yazıların ve içeriklerin canvasın üstünde (z-index) görünmesi için
      Array.from(this.el.children).forEach(child => {
        if (child.tagName !== 'CANVAS') {
          child.style.position = 'relative';
          child.style.zIndex = '2';
        }
      });
    }

    this.cv = document.createElement('canvas');
    Object.assign(this.cv.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      borderRadius: 'inherit',
      pointerEvents: 'none', // Tıklamalar elemente geçsin
      zIndex: '0',           // Yazıların arkasında
      opacity: '1'
    });
    
    this.el.insertBefore(this.cv, this.el.firstChild);
  }

  _initGL() {
    const gl = this.cv.getContext('webgl2', {
      alpha: true,           // Şeffaf arkaplan şart! (CSS blur gözüksün diye)
      premultipliedAlpha: false,
      antialias: false
    });
    if (!gl) return false;
    this.gl = gl;

    const prog = this._compileProg(VERT, FRAG);
    if (!prog) return false;
    this.prog = prog;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1,-1,  1,-1,  -1,1,
      -1,1,   1,-1,   1,1
    ]), gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.vao = vao;

    this.u = {
      res: gl.getUniformLocation(prog, 'u_res'),
      time: gl.getUniformLocation(prog, 'u_time'),
      mouse: gl.getUniformLocation(prog, 'u_mouse'),
      hover: gl.getUniformLocation(prog, 'u_hover'),
      press: gl.getUniformLocation(prog, 'u_press'),
      ripple: gl.getUniformLocation(prog, 'u_ripple'),
      rippleT: gl.getUniformLocation(prog, 'u_rippleT'),
      radius: gl.getUniformLocation(prog, 'u_radius'),
      themeColor: gl.getUniformLocation(prog, 'u_themeColor')
    };

    return true;
  }

  _compileProg(vs, fs) {
    const gl = this.gl;
    const v = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(v, vs); gl.compileShader(v);
    
    const f = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(f, fs); gl.compileShader(f);
    
    const p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.linkProgram(p);
    return p;
  }

  _bindEvents() {
    const el = this.el;
    const updateMouse = (e) => {
      const r = el.getBoundingClientRect();
      const cx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - r.left;
      const cy = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - r.top;
      this.mouse.x = cx / r.width;
      this.mouse.y = cy / r.height;
    };

    el.addEventListener('mousemove', updateMouse, { passive: true });
    el.addEventListener('touchmove', updateMouse, { passive: true });
    el.addEventListener('mouseenter', () => this._tHover = 1, { passive: true });
    el.addEventListener('mouseleave', () => { this._tHover = 0; this._tPress = 0; }, { passive: true });
    
    const onDown = (e) => {
      this._tPress = 1;
      const r = el.getBoundingClientRect();
      this.ripple.x = ((e.clientX ?? e.touches?.[0]?.clientX ?? 0) - r.left) / r.width;
      this.ripple.y = ((e.clientY ?? e.touches?.[0]?.clientY ?? 0) - r.top) / r.height;
      this.ripple.t = 0.001;
    };
    el.addEventListener('mousedown', onDown, { passive: true });
    el.addEventListener('touchstart', onDown, { passive: true });
    
    const onUp = () => this._tPress = 0;
    el.addEventListener('mouseup', onUp, { passive: true });
    el.addEventListener('touchend', onUp, { passive: true });
  }

  _updateThemeColor() {
    // CSS'ten aktif Vagal Rengi dinamik çek (RGBA string gelir örn: "125, 145, 123")
    const rgbStr = getComputedStyle(document.documentElement).getPropertyValue('--vagal-color-rgb').trim();
    if (rgbStr) {
      const parts = rgbStr.split(',').map(s => parseInt(s.trim()));
      if (parts.length === 3 && !isNaN(parts[0])) {
        this.themeColor = [parts[0] / 255.0, parts[1] / 255.0, parts[2] / 255.0];
      }
    }
  }

  _loop = (ts = 0) => {
    if (this.dead) return;
    this.rafId = requestAnimationFrame(this._loop);
    
    // Performans Optimizasyonu: Element ekranda görünmüyorsa GPU'yu yorma
    if (!this.isVisible) return;

    const gl = this.gl;
    const dt = 0.016;

    // Smooth lerps
    this.hover += (this._tHover - this.hover) * 0.15;
    this.press += (this._tPress - this.press) * 0.25;

    // Ripple anim
    if (this.ripple.t > 0) {
      this.ripple.t += dt * 1.5;
      if (this.ripple.t >= 1) this.ripple.t = -1;
    }

    // Resize canvas to match element
    const pr = Math.min(devicePixelRatio, 2);
    const rect = this.el.getBoundingClientRect();
    const w = Math.round(rect.width * pr);
    const h = Math.round(rect.height * pr);
    
    if (this.cv.width !== w || this.cv.height !== h) {
      this.cv.width = w;
      this.cv.height = h;
      gl.viewport(0, 0, w, h);
      
      // Compute border radius from CSS
      const br = parseFloat(getComputedStyle(this.el).borderRadius) || this.opts.radius;
      this.opts.radius = br * pr; // Scale radius by device pixel ratio
    }

    // Periyodik olarak tema rengini güncelle (saniyede bir kere yeterli)
    if (Math.random() < 0.05) this._updateThemeColor();

    gl.clearColor(0.0, 0.0, 0.0, 0.0); // Şeffaf temizle (CSS Blur görünsün)
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Alpha blending aktifleştir (Sıvı dalgaları CSS blur üzerine yarı şeffaf binsin)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    
    gl.uniform2f(this.u.res, w, h);
    gl.uniform1f(this.u.time, ts * 0.001);
    gl.uniform2f(this.u.mouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.u.hover, this.hover);
    gl.uniform1f(this.u.press, this.press);
    gl.uniform2f(this.u.ripple, this.ripple.x, this.ripple.y);
    gl.uniform1f(this.u.rippleT, Math.max(0, this.ripple.t));
    gl.uniform1f(this.u.radius, this.opts.radius);
    gl.uniform3f(this.u.themeColor, this.themeColor[0], this.themeColor[1], this.themeColor[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.rafId);
    if (this.cv) this.cv.remove();
    if (this.io) this.io.disconnect();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Service API
// ─────────────────────────────────────────────────────────────────────────────
const _renderers = new Map();
let _observer = null;

export function initLiquidGlass() {
  const testCanvas = document.createElement('canvas');
  if (!testCanvas.getContext('webgl2')) return; // WebGL2 yoksa fallback CSS zaten çalışır
  
  _applyAll();

  // Dinamik olarak oluşturulan elemanlar için MutationObserver (Performans için Debounce eklendi)
  let timeout = null;
  _observer = new MutationObserver(() => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(_applyAll, 200);
  });
  _observer.observe(document.body, { childList: true, subtree: true });
}

function _applyAll() {
  // Sadece Header ve Ana Butonlara uygula (Performans için)
  // 1. Header (Ana Cam Panel)
  const header = document.querySelector('.header-island');
  if (header && !_renderers.has(header)) {
    _renderers.set(header, new LiquidGlassRenderer(header, { radius: 24 }));
  }

  // 2. Yuvarlak Küçük Cam Butonlar
  document.querySelectorAll('.glass-btn.small-btn, .header-back-btn').forEach(el => {
    if (!_renderers.has(el)) {
      _renderers.set(el, new LiquidGlassRenderer(el, { radius: 50 }));
    }
  });
}

export function destroyLiquidGlass() {
  if (_observer) _observer.disconnect();
  _renderers.forEach(r => r.destroy());
  _renderers.clear();
}
