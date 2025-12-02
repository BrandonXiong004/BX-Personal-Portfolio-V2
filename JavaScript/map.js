/* map.js
 - Unified map script: markers, ambient particles, hover glows, region outlines
 - Handles devicePixelRatio for crisp rendering
 - Responsive scaling and mobile-friendly touch
*/

(() => {

  // DOM elements
  const mapWrapper = document.getElementById('map-wrapper');
  const mapImage = document.getElementById('mapImage');
  const markers = Array.from(document.querySelectorAll('.marker'));
  const panel = document.getElementById('panel');
  const panelContent = document.getElementById('panel-content');
  const panelClose = document.getElementById('panel-close');
  const canvas = document.getElementById('fxCanvas');
  const ctx = canvas.getContext('2d');

  // Constants
  const PARTICLE_COUNT = 40;
  const HIT_EXPAND = 18; // px for touch hit area
  const BASE_WIDTH = 1536;
  const BASE_HEIGHT = 1024;

  // State
  const particles = [];
  let hoveredMarker = null;
  let hoveredRegion = null;
  let cw, ch, dpr, scaleX, scaleY;

  // Map regions (polygon coordinates in native pixels)
  const regions = [
    { id: "guild", label: "The Adventurer's Guild", target: "about.html", tooltip: "Clicking on this location will redirect you to learn more about me!", path: [[341,343],[467,357],[536,338],[537,255],[552,251],[507,178],[377,172], [335,243]] },
    { id: "archives", label: "The Labyrinth Archives", target: "projects.html", tooltip: "To see what projects I have previously done and what I am currently doing, click this location.", path: [[1019,218],[1144,297],[1286,237],[1281,163],[1145,98],[1022,146]] },
    { id: "forge", label: "The Forge", target: "skills.html", tooltip: "This location will redirect you to learn more about what skills I have learned and how I implement them.", path: [[348,745],[343,766],[394,785],[430,771],[460,772],[460,751],[439,743],[432,726],[443,709],[481,695],[503,683],[492,669],[446,666],[352,660],[340,675],[319,676],[327,692],[353,705],[365,709],[372,732],[362,742]] },
    { id: "tavern", label: "The Tavern", target: "contact.html", tooltip: "This location will have various ways to contact me. Please feel free to connect and network with me!", path: [[1061,766],[1147,773],[1273,760],[1266,688],[1286,692],[1242,621],[1223,621],[1225,585],[1205,589],[1208,620],[1096,614],[1053,689],[1071,697],[1067,730]] }
  ];

  // --- Helper Functions ---

  function getContainerSize() {
    const rect = mapWrapper.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function markerPosition(btn) {
    const rect = mapWrapper.getBoundingClientRect();
    const r = btn.getBoundingClientRect();
    return { x: r.left + r.width/2 - rect.left, y: r.top + r.height/2 - rect.top };
  }

  function pointInPoly(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0] * scaleX, yi = poly[i][1] * scaleY;
      const xj = poly[j][0] * scaleX, yj = poly[j][1] * scaleY;
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi)*(y - yi)/(yj - yi) + xi);
      if (intersect) c = !c;
    }
    return c;
  }

  function expandedHit(poly, x, y) {
    return pointInPoly(poly, x, y) ||
           pointInPoly(poly, x + HIT_EXPAND, y) ||
           pointInPoly(poly, x - HIT_EXPAND, y) ||
           pointInPoly(poly, x, y + HIT_EXPAND) ||
           pointInPoly(poly, x, y - HIT_EXPAND);
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) e = e.touches[0];
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // --- Initialization Functions ---

  function initMarkers() {
    markers.forEach(btn => {
      const x = parseFloat(btn.dataset.x) || 0.5;
      const y = parseFloat(btn.dataset.y) || 0.5;
      btn.style.left = (x * 100) + '%';
      btn.style.top = (y * 100) + '%';

      btn.addEventListener('mouseenter', () => hoveredMarker = btn);
      btn.addEventListener('mouseleave', () => { if (hoveredMarker === btn) hoveredMarker = null; });

      btn.addEventListener('click', ev => {
        ev.preventDefault();
        showPanel(btn);
      });

      // keyboard accessibility
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    });
  }

  function showPanel(btn) {
    const name = btn.getAttribute('aria-label') || 'Location';
    const target = btn.dataset.target || '#';
    panelContent.innerHTML = `
      <h2 style="margin-bottom:8px">${name}</h2>
      <p style="margin-bottom:12px; color:#e9dbc0">Open: <strong>${target}</strong></p>
      <p style="line-height:1.45; color:#efe7d5; opacity:0.95">
        This is a preview. Click the button below to open the page.
      </p>
      <div style="margin-top:14px; display:flex;gap:10px; flex-wrap:wrap">
        <a href="${target}" style="background:#f7e9c4;color:#231a10;padding:8px 12px;border-radius:8px;text-decoration:none">Open</a>
        <button id="panel-close-action" style="background:transparent;border:1px solid rgba(255,235,170,0.08);padding:8px 12px;border-radius:8px;color:var(--accent)">Close</button>
      </div>
    `;
    panel.classList.remove('hidden');

    const closeAction = document.getElementById('panel-close-action');
    closeAction?.addEventListener('click', () => panel.classList.add('hidden'));
  }

  panelClose.addEventListener('click', () => panel.classList.add('hidden'));

  function initParticles() {
    particles.length = 0;
    const { width, height } = getContainerSize();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random()-0.5) * 0.15,
        vy: -0.02 - Math.random()*0.06,
        size: 1 + Math.random()*3,
        alpha: 0.06 + Math.random()*0.2
      });
    }
  }

  // --- Canvas Setup ---

  function resizeCanvas() {
    const { width, height } = getContainerSize();
    dpr = Math.max(1, window.devicePixelRatio || 1);
    cw = width * dpr;
    ch = height * dpr;
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // scaling for regions
    scaleX = width / BASE_WIDTH;
    scaleY = height / BASE_HEIGHT;

    initParticles();
  }

  // --- Rendering Functions ---
  function render() {
    const { width, height } = getContainerSize();
    ctx.clearRect(0, 0, width, height);

    //
    // 1) PARTICLES
    //
    for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.0006;

        if (p.alpha <= 0 || p.y < -20 || p.x < -40 || p.x > width + 40) {
            p.x = Math.random() * width;
            p.y = height + (10 + Math.random() * 40);
            p.vx = (Math.random() - 0.5) * 0.15;
            p.vy = -0.02 - Math.random() * 0.06;
            p.size = 1 + Math.random() * 3;
            p.alpha = 0.06 + Math.random() * 0.2;
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,200,80,${p.alpha})`; // warmer glow
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    //
    // 2) REGION OUTLINE GLOW
    //
    if (hoveredRegion) {
    const region = hoveredRegion;

    const pulse = 1.5 + Math.sin(performance.now() * 0.004) * 1.2;

    ctx.save();
    ctx.lineJoin = "round";

    // Outer glow stroke
    ctx.lineWidth = 10 + pulse;
    ctx.strokeStyle = "rgba(255,130,20,0.55)";
    ctx.shadowColor = "rgba(255,120,10,0.95)";
    ctx.shadowBlur = 28 + pulse * 3;

    ctx.beginPath();
    region.path.forEach((pt, i) => {
        const x = pt[0] * scaleX;
        const y = pt[1] * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Inner crisp stroke
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,180,80,0.95)";
    ctx.shadowBlur = 0;

    ctx.stroke();
    ctx.restore();
}

    //
    // 3) MARKER HOVER GLOW (with subtle pulse)
    //
    if (hoveredMarker) {
        const pos = markerPosition(hoveredMarker);
        const t = performance.now() / 1000;

        const baseR = parseFloat(
            getComputedStyle(document.documentElement)
            .getPropertyValue('--marker-size')
        ) || 52;

        const pulse = 6 + Math.sin(t * 2.8) * 4;

        const radius = (baseR / 2) + pulse;

        const g = ctx.createRadialGradient(
            pos.x, pos.y, 0,
            pos.x, pos.y, radius * 2
        );
        g.addColorStop(0, 'rgba(255,150,50,0.32)');
        g.addColorStop(0.5, 'rgba(255,90,20,0.14)');
        g.addColorStop(1, 'rgba(255,90,20,0)');

        ctx.beginPath();
        ctx.fillStyle = g;
        ctx.arc(pos.x, pos.y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,160,80,0.45)';
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    requestAnimationFrame(render);
}


  // --- Interaction Handlers ---

 function getRegionCenter(region) {
  let sumX = 0, sumY = 0;
  region.path.forEach(pt => {
    sumX += pt[0] * scaleX;
    sumY += pt[1] * scaleY;
  });
  return { x: sumX / region.path.length, y: sumY / region.path.length };
}

function handleMove(e) {
  const pos = getPos(e);
  hoveredRegion = null;

  for (const r of regions) {
    if (expandedHit(r.path, pos.x, pos.y)) {
      hoveredRegion = r;
      break;
    }
  }

  if (hoveredRegion) {
    tooltip.innerHTML = `<strong>${hoveredRegion.label}</strong><br><em>${hoveredRegion.tooltip || "Click to open"}</em>`;
    tooltip.classList.add("visible");

    const parentRect = mapWrapper.getBoundingClientRect();

    // Get tooltip size after setting content
    const rect = tooltip.getBoundingClientRect();

    let offset = 12; // distance from cursor
    let x = pos.x + offset;
    let y = pos.y - offset;

    // Smart horizontal positioning
    if (x + rect.width > parentRect.width) {
      x = pos.x - rect.width - offset; // flip to left of cursor
      if (x < 0) x = 6; // still inside left edge
    }

    // Smart vertical positioning
    if (y - rect.height < 0) {
      y = pos.y + offset; // place below cursor
      if (y + rect.height > parentRect.height) y = parentRect.height - rect.height - 6;
    }

    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  } else {
    tooltip.classList.remove("visible");
  }
}

  function handleClick(e) {
    if (hoveredRegion) window.location.href = hoveredRegion.target;
  }

  canvas.addEventListener("mousemove", handleMove);
  // --- Mobile Device Support for Tooltip ---
  canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  handleMove(e);
  setTimeout(() => tooltip.classList.add("hidden"), 1500);
}, { passive: false });
  canvas.addEventListener("click", handleClick);

  window.addEventListener('resize', resizeCanvas);

  // --- Start App ---
  function start() {
    initMarkers();
    resizeCanvas();
    requestAnimationFrame(render);
  }

  if (mapImage.complete) start();
  else mapImage.addEventListener('load', start);

  // --- Tooltip box Handler --
  const tooltip = document.getElementById("tooltip");
  
  // Animated pulsing glow for tooltip (brightness + size)
  let glowPhase = 0;

  function animateTooltipGlow() {
    if (tooltip.classList.contains("visible")) {
      glowPhase += 0.1; // speed of pulse

      // Glow pulse values
      const alpha = 0.28 + Math.sin(glowPhase) * 0.18;     // brightness variation
      const size = 14 + Math.sin(glowPhase) * 6;           // grows/shrinks by ±6px

      tooltip.style.boxShadow =
        `0 0 ${size}px rgba(242,224,182,${alpha}), ` +   // main glowing halo
        `0 4px ${size * 0.7}px rgba(0,0,0,0.55)`;      // soft dark lift-shadow
    } else {
      // reset when hidden
      tooltip.style.boxShadow =
        `0 0 14px rgba(242,224,182,0.25), 0 4px 10px rgba(0,0,0,0.5)`;
    }

    requestAnimationFrame(animateTooltipGlow);
  }
  animateTooltipGlow();


})();