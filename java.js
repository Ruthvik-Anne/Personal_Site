/* Ruthvik Anne: portfolio motion.
   No dependencies. Every module runs inside safe() so one failure can never blank the page.
   Honors prefers-reduced-motion (everything is shown immediately, nothing moves) and
   skips pointer-driven effects on touch devices. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn) {
    try { fn(); } catch (err) { if (window.console) console.warn("[site]", err); }
  }
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- adaptive performance governor ----------
     Picks a tier from device hints (cores, memory, data-saver, pointer type), remembers any
     downgrade for the session, then watches real frame times and steps DOWN (never up) if the
     device hitches. Tiers only make motion cheaper (fewer particles, no blur, lower shader
     resolution); they never switch animation off. ?perf=high|mid|low forces a tier for testing. */
  var perf = (function () {
    var order = ["high", "mid", "low"], listeners = [], tier = "high";
    var nav = navigator, conn = nav.connection || {};
    function initial() {
      if (reduce) return "off";
      var forced = /[?&]perf=(high|mid|low)/.exec(location.search);
      if (forced) return forced[1];
      var t = "high", mem = nav.deviceMemory || 8, cores = nav.hardwareConcurrency || 8;
      if (conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || "")) t = "low";
      else if (mem <= 2 || cores <= 2) t = "low";
      else if (mem <= 4 || cores <= 4) t = "mid";
      if (!fine && t === "high") t = "mid";
      try {
        var s = sessionStorage.getItem("perf");
        if (s && order.indexOf(s) > order.indexOf(t)) t = s;
      } catch (e) {}
      return t;
    }
    function apply(t) {
      tier = t; root.setAttribute("data-perf", t);
      listeners.forEach(function (fn) { try { fn(t); } catch (e) {} });
    }
    function down() {
      var i = order.indexOf(tier);
      if (i < 0 || i >= order.length - 1) return;
      var t = order[i + 1];
      try { sessionStorage.setItem("perf", t); } catch (e) {}
      apply(t);
    }
    var monitoring = false, forced = /[?&]perf=/.test(location.search);
    function monitor() {
      if (monitoring || tier === "off" || forced) return;
      monitoring = true;
      var prev = 0, buf = [], bad = 0, wStart = 0;
      (function frame(now) {
        if (!wStart) wStart = now;
        if (prev) { var d = now - prev; if (d < 600) buf.push(d); } // longer gaps = hidden tab, ignore
        prev = now;
        if (now - wStart >= 1200 && buf.length >= 5) { // time-based window so a 5fps device is caught in seconds
          wStart = now;
          buf.sort(function (a, b) { return a - b; });
          var med = buf[buf.length >> 1], p90 = buf[Math.floor(buf.length * 0.9)];
          bad = (med > 26 || p90 > 48) ? bad + 1 : Math.max(0, bad - 1);
          if (bad >= 2) { bad = 0; down(); }
          buf.length = 0;
        }
        if (tier !== "low") requestAnimationFrame(frame); else monitoring = false;
      })(performance.now());
    }
    tier = initial(); apply(tier);
    return {
      tier: function () { return tier; },
      on: function (fn) { listeners.push(fn); },
      monitor: monitor,
      // multiplier for particle counts / resolution
      q: function () { return tier === "high" ? 1 : tier === "mid" ? 0.6 : 0.3; },
      // minimum ms between draws for canvas-style loops
      minDt: function () { return tier === "high" ? 15 : tier === "mid" ? 32 : 48; }
    };
  })();
  function kLerp(f, dt) { return 1 - Math.pow(1 - f, dt / 16.667); } // frame-rate independent lerp factor

  /* ---------- name + heading splitting ---------- */
  function splitName() {
    var h1 = $("h1.name");
    if (!h1) return;
    var idx = 0;
    $$(".row", h1).forEach(function (row) {
      var text = row.textContent;
      row.textContent = "";
      row.setAttribute("aria-hidden", "true");
      text.split("").forEach(function (chr) {
        var cm = doc.createElement("span");
        cm.className = "cm";
        var ch = doc.createElement("span");
        ch.className = "ch";
        ch.style.setProperty("--i", idx++);
        ch.textContent = chr;
        cm.appendChild(ch);
        row.appendChild(cm);
      });
    });
  }

  function splitHeadings() {
    $$("[data-split]").forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      words.forEach(function (w, i) {
        var wm = doc.createElement("span");
        wm.className = "wm";
        var wi = doc.createElement("span");
        wi.className = "wi";
        wi.style.setProperty("--i", i);
        wi.textContent = w;
        wm.appendChild(wi);
        el.appendChild(wm);
        if (i < words.length - 1) el.appendChild(doc.createTextNode(" "));
      });
    });
  }

  function prepHero() {
    [".brand-lockup", ".role", ".lede", ".actions", ".stats"].forEach(function (sel, i) {
      var el = $(sel);
      if (!el) return;
      el.setAttribute("data-r", "");
      el.style.setProperty("--d", 650 + i * 130 + "ms");
    });
  }

  function setYear() {
    var el = $(".footer-year");
    if (el) el.textContent = "© " + new Date().getFullYear() + " Ruthvik Anne";
  }

  /* ---------- reveal on scroll ---------- */
  function setupReveal() {
    var els = $$("[data-r]");
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add("in");
        io.unobserve(el);
        if (el.classList.contains("card")) {
          setTimeout(function () { el.classList.add("settled"); }, 1400);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- counters ---------- */
  function setupCounters() {
    var nums = $$("[data-count]");
    if (!nums.length) return;
    if (reduce || !("IntersectionObserver" in window)) return; // final values are already in the markup
    nums.forEach(function (n) { n.textContent = "0" + (n.getAttribute("data-suffix") || ""); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target;
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        var t0 = performance.now();
        var dur = 1800;
        (function tick(now) {
          var p = clamp((now - t0) / dur, 0, 1);
          var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          el.textContent = Math.round(target * e) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- role rotator (scramble text) ---------- */
  function setupRotator() {
    var el = $("#swap");
    if (!el || reduce) return;
    var phrases = [
      "sovereign AI platforms",
      "model training and distillation pipelines",
      "security-first products for India",
      "research that survives its own experiments",
      "agent systems that run for days"
    ];
    var glyphs = "!<>-_\\/[]{}=+*^?#";
    var i = 0;
    var busy = false;
    function scramble(to) {
      if (busy) return;
      busy = true;
      var from = el.textContent;
      var len = Math.max(from.length, to.length);
      var queue = [];
      for (var k = 0; k < len; k++) {
        var start = Math.floor(Math.random() * 18);
        queue.push({ from: from[k] || "", to: to[k] || "", start: start, end: start + 10 + Math.floor(Math.random() * 18), ch: "" });
      }
      var frame = 0;
      (function step() {
        var out = "";
        var done = 0;
        for (var q = 0; q < queue.length; q++) {
          var it = queue[q];
          if (frame >= it.end) { done++; out += it.to; }
          else if (frame >= it.start) {
            if (!it.ch || Math.random() < 0.28) it.ch = glyphs[Math.floor(Math.random() * glyphs.length)];
            out += it.ch;
          } else out += it.from;
        }
        el.textContent = out;
        if (done === queue.length) { busy = false; return; }
        frame++;
        requestAnimationFrame(step);
      })();
    }
    setInterval(function () {
      if (doc.hidden) return;
      i = (i + 1) % phrases.length;
      scramble(phrases[i]);
    }, 3400);
  }

  /* ---------- nav + scroll progress ---------- */
  function setupNav() {
    var bar = $("#progress");
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var max = doc.documentElement.scrollHeight - window.innerHeight;
        if (bar && max > 0) bar.style.setProperty("--sp", (window.scrollY / max).toFixed(4));
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var links = {};
    $$("[data-nav]").forEach(function (a) { links[a.getAttribute("data-nav")] = a; });
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle("active", k === id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach(function (k) { var s = doc.getElementById(k); if (s) io.observe(s); });
  }


  /* ---------- hero field: WebGL fbm domain-warp ("billow"), iso-contours, twinkle stars ---------- */
  function setupWater() {
    var cv = $("#water");
    if (!cv) return;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) { cv.remove(); return; }
    var vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var fs = "precision mediump float;uniform vec2 uRes;uniform float uTime;uniform vec2 uPtr;uniform float uPush;" +
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}" +
      "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+17.;a*=.5;}return v;}" +
      "void main(){vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;vec2 p=(uv-.5)*vec2(asp,1.);" +
      "vec2 d=p-uPtr;float r=length(d);p+=d/(r+1e-3)*exp(-r*4.5)*uPush*.09;" +
      "vec2 q=p*3.0;vec2 w=vec2(fbm(q+uTime*.11),fbm(q+37.-uTime*.09))-.5;" +
      "float f=fbm(q+w*2.4+uTime*.05);" +
      "float c=abs(fract(f*8.)-.5);float line=1.-smoothstep(.0,.045,c);" +
      "vec3 copper=vec3(.788,.529,.416),gold=vec3(.91,.788,.478),sage=vec3(.667,.702,.588);" +
      "vec3 col=mix(gold,sage,smoothstep(.35,.7,f));float a=.16*smoothstep(.25,.75,f);" +
      "col=mix(col,copper,line);a+=line*.34*smoothstep(.2,.6,f);" +
      "vec2 g=floor(uv*vec2(asp,1.)*26.);float s=h(g);vec2 cp=(fract(uv*vec2(asp,1.)*26.)-.5);" +
      "float on=step(.972,s);float beat=pow(.5+.5*sin(uTime*(.6+s*.9)+s*40.),6.);" +
      "float sp=(exp(-abs(cp.x)*22.)*max(0.,1.-abs(cp.y)*2.)+exp(-abs(cp.y)*22.)*max(0.,1.-abs(cp.x)*2.))*on*beat;" +
      "col=mix(col,copper,clamp(sp,0.,1.));a=max(a,sp*.7);" +
      "gl_FragColor=vec4(col*a,a);}";
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) { cv.remove(); return; }
    var prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv.remove(); return; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, "uRes"), uTime = gl.getUniformLocation(prog, "uTime"),
        uPtr = gl.getUniformLocation(prog, "uPtr"), uPush = gl.getUniformLocation(prog, "uPush");
    var ptr = { x: 9, y: 9, tx: 9, ty: 9, push: 0 }, visible = true, last = 0, raf = 0, t0 = performance.now();
    function size() {
      var s = Math.min(window.devicePixelRatio || 1, 1.25) * 0.6 * (perf.tier() === "high" ? 1 : 0.7); // reduced resolution, CSS scales it up
      var w = Math.max(2, Math.round(cv.clientWidth * s)), h = Math.max(2, Math.round(cv.clientHeight * s));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }
    var lastDraw = 0;
    function draw(now) {
      size();
      var dt = lastDraw ? Math.min(now - lastDraw, 64) : 16.7; lastDraw = now;
      var k1 = kLerp(0.08, dt), k2 = kLerp(0.05, dt);
      ptr.x += (ptr.tx - ptr.x) * k1; ptr.y += (ptr.ty - ptr.y) * k1;
      ptr.push += ((Math.abs(ptr.tx - ptr.x) + Math.abs(ptr.ty - ptr.y) > 0.002 ? 1 : 0) - ptr.push) * k2;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uTime, reduced ? 8 : (now - t0) / 1000);
      gl.uniform2f(uPtr, ptr.x, ptr.y);
      gl.uniform1f(uPush, ptr.push);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      raf = 0;
      if (!visible || doc.hidden) return;
      if (now - last >= perf.minDt()) { last = now; draw(now); } // cap follows the tier: ~60 / 30 fps
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && !reduced) raf = requestAnimationFrame(loop); }
    draw(performance.now());
    cv.classList.add("on");
    if (reduced) return; // one still frame
    var hero = cv.parentElement;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(hero);
    }
    doc.addEventListener("visibilitychange", start);
    perf.on(function (t) { if (t === "low") { visible = false; cv.remove(); } });
    if (perf.tier() === "low") { cv.remove(); return; }
    cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); cv.remove(); }, false);
    if (window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
      hero.addEventListener("pointermove", function (e) {
        var r = cv.getBoundingClientRect(), asp = r.width / r.height;
        ptr.tx = ((e.clientX - r.left) / r.width - 0.5) * asp;
        ptr.ty = -((e.clientY - r.top) / r.height - 0.5);
      }, { passive: true });
    }
    start();
  }

  /* ---------- Lenis-style smooth scroll (lerp 0.16, as trajectory.ai configures it) + view-transition anchors ---------- */
  function setupSmooth() {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
    var cur = window.scrollY, target = cur, active = false;
    function maxY() { return doc.documentElement.scrollHeight - window.innerHeight; }
    function jump(y) { window.scrollTo({ top: y, behavior: "instant" }); }
    var lastT = 0;
    function tick(now) {
      var dt = Math.min(now - lastT, 64); lastT = now;
      cur += (target - cur) * kLerp(0.16, dt); // same 0.16 as trajectory.ai, but independent of refresh rate
      if (Math.abs(target - cur) < 0.4) { cur = target; active = false; jump(cur); return; }
      jump(cur);
      requestAnimationFrame(tick);
    }
    function glideTo(y) {
      target = Math.max(0, Math.min(maxY(), y));
      if (!active) { cur = window.scrollY; active = true; lastT = performance.now(); requestAnimationFrame(tick); }
    }
    if (fine && !reduced) {
      window.addEventListener("wheel", function (e) {
        if (e.ctrlKey || e.defaultPrevented || perf.tier() === "low") return;
        if (e.target.closest && e.target.closest(".dock, .term, textarea, select")) return;
        e.preventDefault();
        var dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
        if (!active) { cur = window.scrollY; target = cur; }
        glideTo(target + dy);
      }, { passive: false });
      window.addEventListener("scroll", function () { if (!active) { cur = target = window.scrollY; } }, { passive: true });
    }
    var vt = typeof doc.startViewTransition === "function" && !reduced;
    var busy = false;
    doc.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      var el = id ? doc.getElementById(id) : doc.body;
      if (!el) return;
      e.preventDefault();
      if (busy) return;
      var y = id ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - 0) : 0;
      function go() { cur = target = y; active = false; jump(y); if (id) { el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); } }
      try { history.replaceState(null, "", id ? "#" + id : location.pathname + location.search); } catch (err) {}
      if (vt && Math.abs(y - window.scrollY) > window.innerHeight * 0.6) {
        busy = true;
        var tr = doc.startViewTransition(go);
        var done = function () { busy = false; };
        tr.finished.then(done, done);
      } else if (fine && !reduced) { glideTo(y); }
      else { go(); }
    });
  }

  /* ---------- header morph ---------- */
  function setupHeader() {
    var dock = $(".dock");
    if (!dock) return;
    var cue = $("#cue");
    function upd() { dock.classList.toggle("at-top", window.scrollY < 40); if (cue) cue.classList.toggle("gone", window.scrollY > 80); }
    window.addEventListener("scroll", upd, { passive: true });
    upd();
  }

  /* ---------- constellation canvas ---------- */
  function setupCanvas() {
    var host = $("#bg-fixed");
    if (!host) return;
    var cv = doc.createElement("canvas");
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    host.appendChild(cv);

    var W = 0, H = 0, dpr = 1, linkD = 150;
    var nodes = [], pulses = [], edges = [];
    var mouse = { x: -1e4, y: -1e4 };
    var spawn = 0, last = 0, scrollY = 0;

    function mk() {
      return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28, r: 1 + Math.random() * 1.8 };
    }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      linkD = W < 700 ? 110 : 150;
      var n = Math.round(clamp((W * H) / 17000, 32, 96) * perf.q()); n = Math.max(n, 14);
      while (nodes.length < n) nodes.push(mk());
      nodes.length = n;
      if (reduce) draw(0, true);
    }

    function draw(dt, still) {
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b, dx, dy, d, al, k = dt / 16.667;
      edges.length = 0;
      if (!still) {
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          a.x += a.vx * k; a.y += a.vy * k;
          if (a.x < -20) a.x = W + 20; else if (a.x > W + 20) a.x = -20;
          if (a.y < -20) a.y = H + 20; else if (a.y > H + 20) a.y = -20;
          dx = mouse.x - a.x; dy = mouse.y - a.y; d = dx * dx + dy * dy;
          if (d < 26000) { var f = (1 - d / 26000) * 0.022 * k; a.x += dx * f; a.y += dy * f; }
        }
      }
      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x; dy = a.y - b.y; d = dx * dx + dy * dy;
          if (d < linkD * linkD) {
            al = (1 - Math.sqrt(d) / linkD) * 0.2;
            ctx.strokeStyle = "rgba(11,11,12," + al.toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            edges.push(i, j);
          }
        }
      }
      if (!still) {
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          dx = mouse.x - a.x; dy = mouse.y - a.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < 200) {
            al = (1 - d / 200) * 0.6;
            ctx.strokeStyle = "rgba(154,79,43," + al.toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(11,11,12,0.5)";
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.2832); ctx.fill();
      }
      if (still) return;
      spawn -= dt;
      if (spawn <= 0 && pulses.length < Math.round(12 * perf.q() * (perf.tier() === "low" ? 0 : 1)) && edges.length) {
        var k = Math.floor(Math.random() * (edges.length / 2)) * 2;
        pulses.push({ a: edges[k], b: edges[k + 1], t: 0, s: 0.011 + Math.random() * 0.014 });
        spawn = 320 + Math.random() * 480;
      }
      for (var p = pulses.length - 1; p >= 0; p--) {
        var pu = pulses[p];
        pu.t += pu.s * k;
        if (pu.t >= 1) { pulses.splice(p, 1); continue; }
        var A = nodes[pu.a], B = nodes[pu.b];
        if (!A || !B) { pulses.splice(p, 1); continue; }
        var x = A.x + (B.x - A.x) * pu.t, y = A.y + (B.y - A.y) * pu.t;
        var g = ctx.createRadialGradient(x, y, 0, x, y, 15);
        g.addColorStop(0, "rgba(201,135,106,0.95)");
        g.addColorStop(1, "rgba(201,135,106,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 15, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "#9A4F2B";
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.2832); ctx.fill();
      }
    }

    function loop(now) {
      var el = now - last;
      if (el >= perf.minDt()) {
        last = now;
        draw(Math.min(el, 64), false);
      }
      requestAnimationFrame(loop);
    }

    size();
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 150); }, { passive: true });
    if (reduce) return;
    perf.on(function () { size(); });
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      mouse.x = e.clientX; mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener("pointerleave", function () { mouse.x = mouse.y = -1e4; });
    window.addEventListener("scroll", function () {
      scrollY = window.scrollY;
      host.style.opacity = clamp(1 - scrollY / (H * 1.7), 0.45, 1).toFixed(3);
    }, { passive: true });
    requestAnimationFrame(function (t) { last = t; requestAnimationFrame(loop); });
  }

  /* ---------- cursor glow, card spotlight + tilt, magnetic buttons ---------- */
  function setupPointerFx() {
    if (!fine) return;

    if (!reduce) {
      var glow = $("#glow");
      if (glow) {
        var tx = 0, ty = 0, cx = 0, cy = 0, run = false;
        window.addEventListener("pointermove", function (e) {
          if (perf.tier() === "low") return;
          tx = e.clientX; ty = e.clientY;
          glow.classList.add("on");
          if (!run) { run = true; requestAnimationFrame(follow); }
        }, { passive: true });
        doc.addEventListener("pointerleave", function () { glow.classList.remove("on"); });
        var lt = 0;
        var follow = function (now) {
          var dt = lt ? Math.min(now - lt, 64) : 16.7; lt = now;
          var kk = kLerp(0.12, dt);
          cx += (tx - cx) * kk; cy += (ty - cy) * kk;
          glow.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
          if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) requestAnimationFrame(follow); else { run = false; lt = 0; }
        };
      }
    }

    if (reduce) return;
    /* magnetic buttons, kept subtle: only the ONE button under (or within 28px of) the cursor moves,
       at most 4px, eased by a CSS transition, so neighbours can never collide */
    var mags = $$("[data-magnet]"), cur = null, mt = null, mraf = 0;
    function release(m) { if (m) m.style.translate = ""; }
    window.addEventListener("pointermove", function (e) {
      mt = e;
      if (mraf) return;
      mraf = requestAnimationFrame(function () {
        mraf = 0;
        if (perf.tier() === "low") { release(cur); cur = null; return; }
        var hit = null, best = 1e9;
        for (var i = 0; i < mags.length; i++) {
          var r = mags[i].getBoundingClientRect(), pad = 28;
          if (mt.clientX < r.left - pad || mt.clientX > r.right + pad || mt.clientY < r.top - pad || mt.clientY > r.bottom + pad) continue;
          var d = Math.hypot(mt.clientX - (r.left + r.width / 2), mt.clientY - (r.top + r.height / 2));
          if (d < best) { best = d; hit = mags[i]; }
        }
        if (cur && cur !== hit) release(cur);
        cur = hit;
        if (hit) {
          var q = hit.getBoundingClientRect();
          var dx = clamp((mt.clientX - (q.left + q.width / 2)) * 0.1, -4, 4), dy = clamp((mt.clientY - (q.top + q.height / 2)) * 0.12, -3, 3);
          hit.style.translate = dx.toFixed(1) + "px " + dy.toFixed(1) + "px";
        }
      });
    }, { passive: true });
    doc.addEventListener("pointerleave", function () { release(cur); cur = null; });
  }

  /* ---------- project filters ---------- */
  function setupFilters() {
    var btns = $$(".filters button");
    var cards = $$("#grid .card");
    if (!btns.length) return;
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-filter");
        btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        var order = 0;
        cards.forEach(function (c) {
          c.classList.add("settled");
          var match = key === "all" || c.getAttribute("data-cat").split(" ").indexOf(key) > -1;
          if (!match) {
            c.classList.add("is-out");
            setTimeout(function () { if (c.classList.contains("is-out")) c.hidden = true; }, reduce ? 0 : 340);
          } else {
            var wasHidden = c.hidden;
            c.hidden = false;
            if (wasHidden) { void c.offsetWidth; }
            var delay = reduce ? 0 : 40 + order++ * 45;
            setTimeout(function () { c.classList.remove("is-out"); }, delay);
          }
        });
      });
    });
  }

  /* ---------- timeline ---------- */
  function setupTimeline() {
    var tl = $("#timeline");
    if (!tl) return;
    var items = $$(".tl-item", tl);
    var ticking = false;
    function update() {
      ticking = false;
      var r = tl.getBoundingClientRect();
      var mid = window.innerHeight * 0.62;
      var p = clamp((mid - r.top) / r.height, 0, 1);
      tl.style.setProperty("--tl", p.toFixed(4));
      items.forEach(function (it) {
        var ir = it.getBoundingClientRect();
        it.classList.toggle("on", ir.top + 32 < mid);
      });
    }
    function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req, { passive: true });
    update();
  }

  /* ---------- terminal ---------- */
  function setupTerminal() {
    var term = $("#term");
    if (!term) return;
    var lines = $$(".t-line", term);
    if (reduce || !("IntersectionObserver" in window)) {
      lines.forEach(function (l) { l.classList.add("shown"); });
      return;
    }
    lines.forEach(function (l) {
      var typed = $(".typed", l);
      if (typed) typed.setAttribute("data-full", typed.textContent), typed.textContent = "";
    });
    var started = false;
    var io = new IntersectionObserver(function (entries) {
      if (started || !entries[0].isIntersecting) return;
      started = true;
      io.disconnect();
      run();
    }, { threshold: 0.25 });
    io.observe(term);

    async function run() {
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        l.classList.add("shown");
        var typed = $(".typed", l);
        if (typed) {
          var full = typed.getAttribute("data-full");
          for (var k = 1; k <= full.length; k++) { typed.textContent = full.slice(0, k); await sleep(48); }
          await sleep(220);
        } else if (!l.classList.contains("cmd")) {
          await sleep(85);
        } else {
          await sleep(120);
        }
      }
    }
  }

  /* ---------- intro curtain ---------- */
  function intro() {
    var loader = $("#loader");
    var first = true;
    try { first = !sessionStorage.getItem("ra-intro"); sessionStorage.setItem("ra-intro", "1"); } catch (e) { /* storage blocked */ }

    function finish() {
      doc.body.classList.remove("is-loading");
      root.classList.add("hero-in");
      setupReveal();
      setupCounters();
    }
    if (reduce || !loader) { if (loader) loader.classList.add("gone"); finish(); return; }

    var n = $("#loader-n");
    var dur = first ? 1500 : 450;
    var t0 = performance.now();
    (function step(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      loader.style.setProperty("--p", e.toFixed(3));
      loader.style.setProperty("--pp", (e * 100).toFixed(1) + "%");
      if (n) n.textContent = ("00" + Math.round(e * 100)).slice(-3);
      if (p < 1) requestAnimationFrame(step);
      else {
        loader.classList.add("done");
        setTimeout(finish, 380);
        setTimeout(function () { loader.classList.add("gone"); }, 1300);
      }
    })(t0);
  }

  function boot() {
    root.classList.add("js-ready");
    safe(splitName);
    safe(splitHeadings);
    safe(prepHero);
    safe(setYear);
    safe(setupNav);
    safe(setupCanvas);
    safe(setupWater);
    safe(setupSmooth);
    safe(setupHeader);
    safe(setupPointerFx);
    safe(setupFilters);
    safe(setupTimeline);
    safe(setupTerminal);
    safe(setupRotator);
    setTimeout(perf.monitor, 3600); // watch real frame times only once the intro is done
    // intro is not wrapped: if it throws, fall back to showing everything
    try { intro(); } catch (err) {
      doc.body.classList.remove("is-loading");
      root.classList.add("hero-in");
      $$("[data-r]").forEach(function (el) { el.classList.add("in"); });
      var l = $("#loader"); if (l) l.classList.add("gone");
    }
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
