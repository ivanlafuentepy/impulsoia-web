/* ═══════════════════════════════════════════
   ivanlafuente.com — Script (Premium)
   GSAP + ScrollTrigger + Vanilla JS
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  gsap.registerPlugin(ScrollTrigger);

  /* ── Nav sticky con IntersectionObserver ── */
  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero');
  if (nav && hero) {
    const navObserver = new IntersectionObserver(([entry]) => {
      nav.classList.toggle('visible', !entry.isIntersecting);
    }, { threshold: 0.1 });
    navObserver.observe(hero);
  }

  /* ── Smooth scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        const navLinks = document.querySelector('.nav-links');
        const hamburger = document.querySelector('.nav-hamburger');
        if (navLinks) navLinks.classList.remove('open');
        if (hamburger) hamburger.classList.remove('open');
      }
    });
  });

  /* ── Hamburger menu ── */
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
  }

  /* ── Dropdown "Cursos" (click + teclado) ── */
  const dropdown = document.querySelector('.nav-dropdown');
  if (dropdown) {
    const dropToggle = dropdown.querySelector('.nav-drop-toggle');
    dropToggle.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const open = dropdown.classList.toggle('open');
      dropToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    dropToggle.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropToggle.click(); }
    });
    // Cerrar al hacer click afuera
    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
        dropToggle.setAttribute('aria-expanded', 'false');
      }
    });
    // "Ver todos los cursos" cierra el menú mobile al navegar a #cursos
    const allLink = dropdown.querySelector('.nav-submenu-all');
    if (allLink) {
      allLink.addEventListener('click', () => {
        dropdown.classList.remove('open');
        if (navLinks) navLinks.classList.remove('open');
        if (hamburger) hamburger.classList.remove('open');
      });
    }
  }

  /* ══════════════════════════════════════════
     GSAP REVEALS
     ══════════════════════════════════════════ */

  // Set initial hidden state via JS (not CSS — avoids invisible content if GSAP fails)
  gsap.set('.reveal', { opacity: 0, y: 24 });
  gsap.set('.hero-content', { opacity: 0, y: 40 });

  // Hero entrance (immediate)
  gsap.to('.hero-content', {
    opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.2,
  });

  // Staggered reveals per grid section
  ['.negocios-grid', '.agentes-grid', '.cursos-grid'].forEach(grid => {
    const cards = document.querySelectorAll(grid + ' .card');
    if (cards.length === 0) return;
    ScrollTrigger.batch(cards, {
      start: 'top 85%',
      once: true,
      onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.15, duration: 0.6, ease: 'power2.out' }),
    });
  });

  // General reveals (non-card .reveal elements)
  ScrollTrigger.batch('.reveal', {
    start: 'top 85%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: 'power2.out' }),
  });

  // Timeline items
  const timelineItems = document.querySelectorAll('.timeline-item');
  if (timelineItems.length > 0) {
    gsap.set(timelineItems, { opacity: 0, y: 20 });
    ScrollTrigger.create({
      trigger: '.timeline',
      start: 'top 80%',
      once: true,
      onEnter: () => gsap.to(timelineItems, { opacity: 1, y: 0, stagger: 0.2, duration: 0.5, ease: 'power2.out' }),
    });
  }

  // Pricing box
  const pricingBox = document.querySelector('.pricing-box');
  if (pricingBox) {
    gsap.set(pricingBox, { opacity: 0, y: 24, scale: 0.95 });
    ScrollTrigger.create({
      trigger: pricingBox,
      start: 'top 80%',
      once: true,
      onEnter: () => gsap.to(pricingBox, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power2.out' }),
    });
  }

  /* ══════════════════════════════════════════
     COUNTER ANIMATION (via ScrollTrigger)
     ══════════════════════════════════════════ */
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => animateCounter(el),
    });
  });

  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = prefix + Math.floor(obj.val).toLocaleString('es-PY') + suffix;
      }
    });
  }

  /* ══════════════════════════════════════════
     STATS STAGGER
     ══════════════════════════════════════════ */
  const statItems = document.querySelectorAll('.stat-item');
  if (statItems.length > 0) {
    gsap.set(statItems, { opacity: 0, y: 20 });
    ScrollTrigger.create({
      trigger: '.stats-grid',
      start: 'top 80%',
      once: true,
      onEnter: () => gsap.to(statItems, { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out' }),
    });
  }

  /* ══════════════════════════════════════════
     HERO SHADER (WebGL plasma background)
     ══════════════════════════════════════════ */
  const shaderCanvas = document.getElementById('hero-shader');
  if (shaderCanvas) {
    const gl = shaderCanvas.getContext('webgl');
    if (gl) {
      const vsSource = `
        attribute vec4 aVertexPosition;
        void main() { gl_Position = aVertexPosition; }
      `;

      const fsSource = `
        precision highp float;
        uniform vec2 iResolution;
        uniform float iTime;

        const float overallSpeed = 0.2;
        const float gridSmoothWidth = 0.015;
        const float axisWidth = 0.05;
        const float majorLineWidth = 0.025;
        const float minorLineWidth = 0.0125;
        const float majorLineFrequency = 5.0;
        const float minorLineFrequency = 1.0;
        const float scale = 5.0;
        const vec4 lineColor = vec4(0.96, 0.65, 0.14, 1.0);
        const float minLineWidth = 0.01;
        const float maxLineWidth = 0.2;
        const float lineSpeed = 1.0 * overallSpeed;
        const float lineAmplitude = 1.0;
        const float lineFrequency = 0.2;
        const float warpSpeed = 0.2 * overallSpeed;
        const float warpFrequency = 0.5;
        const float warpAmplitude = 1.0;
        const float offsetFrequency = 0.5;
        const float offsetSpeed = 1.33 * overallSpeed;
        const float minOffsetSpread = 0.6;
        const float maxOffsetSpread = 2.0;
        const int linesPerGroup = 16;

        #define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
        #define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))
        #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))

        float random(float t) {
          return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
        }

        float getPlasmaY(float x, float horizontalFade, float offset) {
          return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
        }

        void main() {
          vec2 uv = gl_FragCoord.xy / iResolution.xy;
          vec2 space = (gl_FragCoord.xy - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;

          float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
          float verticalFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

          space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
          space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

          vec4 lines = vec4(0.0);
          vec4 bgColor1 = vec4(0.055, 0.085, 0.15, 1.0);
          vec4 bgColor2 = vec4(0.09, 0.11, 0.20, 1.0);

          for(int l = 0; l < linesPerGroup; l++) {
            float normalizedLineIndex = float(l) / float(linesPerGroup);
            float offsetTime = iTime * offsetSpeed;
            float offsetPosition = float(l) + space.x * offsetFrequency;
            float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
            float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
            float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
            float linePosition = getPlasmaY(space.x, horizontalFade, offset);
            float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);

            float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
            vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
            float circle = drawCircle(circlePosition, 0.01, space) * 4.0;

            line = line + circle;
            lines += line * lineColor * rand;
          }

          vec4 fragColor = mix(bgColor1, bgColor2, uv.x);
          fragColor *= verticalFade;
          fragColor.a = 1.0;
          fragColor += lines;
          gl_FragColor = fragColor;
        }
      `;

      // Compile shaders
      function loadShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error('Shader error:', gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      }

      const vs = loadShader(gl.VERTEX_SHADER, vsSource);
      const fs = loadShader(gl.FRAGMENT_SHADER, fsSource);
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
        const resLoc = gl.getUniformLocation(program, 'iResolution');
        const timeLoc = gl.getUniformLocation(program, 'iTime');

        function resizeShader() {
          const rect = shaderCanvas.parentElement.getBoundingClientRect();
          shaderCanvas.width = rect.width * Math.min(window.devicePixelRatio, 2);
          shaderCanvas.height = rect.height * Math.min(window.devicePixelRatio, 2);
          gl.viewport(0, 0, shaderCanvas.width, shaderCanvas.height);
        }

        window.addEventListener('resize', resizeShader);
        resizeShader();

        const startTime = Date.now();
        let shaderActive = true;

        function renderShader() {
          if (!shaderActive) return;
          const t = (Date.now() - startTime) / 1000;
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(program);
          gl.uniform2f(resLoc, shaderCanvas.width, shaderCanvas.height);
          gl.uniform1f(timeLoc, t);
          gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
          gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
          gl.enableVertexAttribArray(posLoc);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          requestAnimationFrame(renderShader);
        }

        // Only render when hero is visible (performance)
        const shaderObserver = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !shaderActive) {
            shaderActive = true;
            requestAnimationFrame(renderShader);
          } else if (!entry.isIntersecting) {
            shaderActive = false;
          }
        }, { threshold: 0 });
        shaderObserver.observe(shaderCanvas);

        requestAnimationFrame(renderShader);
      }
    }
  }

  /* ══════════════════════════════════════════
     ACCORDION (GSAP smooth height)
     ══════════════════════════════════════════ */
  document.querySelectorAll('.agente-card').forEach(card => {
    card.addEventListener('click', () => {
      const details = card.querySelector('.agente-details');
      if (!details) return;
      const wasOpen = card.classList.contains('open');

      // Close all
      document.querySelectorAll('.agente-card.open').forEach(c => {
        if (c !== card) {
          c.classList.remove('open');
          const d = c.querySelector('.agente-details');
          if (d) gsap.to(d, { height: 0, paddingTop: 0, marginTop: 0, duration: 0.35, ease: 'power2.inOut' });
        }
      });

      // Toggle current
      if (wasOpen) {
        card.classList.remove('open');
        gsap.to(details, { height: 0, paddingTop: 0, marginTop: 0, duration: 0.35, ease: 'power2.inOut' });
      } else {
        card.classList.add('open');
        gsap.set(details, { height: 'auto', paddingTop: 16, marginTop: 16 });
        const h = details.offsetHeight;
        gsap.from(details, { height: 0, paddingTop: 0, marginTop: 0, duration: 0.4, ease: 'power2.out' });
      }
    });
  });

  /* ══════════════════════════════════════════
     SCROLL PROGRESS BAR
     ══════════════════════════════════════════ */
  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      progressBar.style.width = pct + '%';
    }, { passive: true });
  }

  /* ══════════════════════════════════════════
     ACTIVE NAV LINK
     ══════════════════════════════════════════ */
  const sections = document.querySelectorAll('section[id]');
  const navLinksAll = document.querySelectorAll('.nav-links a[href^="#"]');

  sections.forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 40%',
      end: 'bottom 40%',
      onToggle: self => {
        if (self.isActive) {
          navLinksAll.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + section.id);
          });
        }
      }
    });
  });

  /* ══════════════════════════════════════════
     MAGNETIC BUTTONS (desktop only)
     ══════════════════════════════════════════ */
  if (!('ontouchstart' in window)) {
    document.querySelectorAll('.btn-primary, .btn-whatsapp, .btn-outline').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.15, y: y * 0.15, duration: 0.3, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }

  /* ══════════════════════════════════════════
     CURSOR GLOW (desktop only)
     ══════════════════════════════════════════ */
  const cursorGlow = document.querySelector('.cursor-glow');
  if (cursorGlow && !('ontouchstart' in window)) {
    let mx = 0, my = 0;
    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
      if (!cursorGlow.classList.contains('active')) cursorGlow.classList.add('active');
    });

    function updateGlow() {
      cursorGlow.style.left = mx + 'px';
      cursorGlow.style.top = my + 'px';
      requestAnimationFrame(updateGlow);
    }
    requestAnimationFrame(updateGlow);
  }

  /* ══════════════════════════════════════════
     LIGHTBOX
     ══════════════════════════════════════════ */
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = lightbox ? lightbox.querySelector('img') : null;

  window.openLightbox = function(src) {
    if (lightbox && lightboxImg) {
      lightboxImg.src = src;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  window.closeLightbox = function() {
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  if (lightbox) {
    lightbox.addEventListener('click', closeLightbox);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });

});
