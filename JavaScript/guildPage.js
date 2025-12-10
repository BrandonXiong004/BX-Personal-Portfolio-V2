/* -----------------------------
   PAGE TURN ENGINE
------------------------------ */

const pages = Array.from(document.querySelectorAll(".page"));
let currentPage = 0;

/* Apply flipped class to pages <= current page */
function updatePages() {
  pages.forEach((pg, index) => {

    if (index < currentPage) {
      // Pages behind current page stay flipped
      pg.classList.add("flipped");
    } 
    else if (index === currentPage) {
      // Current page is facing forward
      pg.classList.remove("flipped");
    }
    else {
      // Pages ahead are unflipped but hidden behind the stack
      pg.classList.add("flipped");
    }

  });
}

updatePages();

/* -----------------------------
   CORNER CLICK LOGIC
------------------------------ */

function nextPage() {
  if (currentPage < pages.length - 1) {
    currentPage++;
    updatePages();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    updatePages();
  }
}

/* Attach corner clicks */
pages.forEach(pg => {
  const nextClick = pg.querySelector(".area-next .corner-click");
  const prevClick = pg.querySelector(".area-prev .corner-click");

  if (nextClick) nextClick.addEventListener("click", nextPage);
  if (prevClick) prevClick.addEventListener("click", prevPage);
});

/* -----------------------------
   HOVER CURL DETECTION
------------------------------ */

pages.forEach(pg => {
  pg.addEventListener("mousemove", e => {
    const bounds = pg.getBoundingClientRect();
    const mx = e.clientX - bounds.left;
    const my = e.clientY - bounds.top;
    const zone = 120;

    // Right curl
    if (
      mx > bounds.width - zone &&
      my > bounds.height - zone
    ) {
      pg.classList.add("hover-corner");
    } else {
      pg.classList.remove("hover-corner");
    }

    // Left curl (no first page)
    if (
      currentPage !== 0 &&
      mx < zone &&
      my > bounds.height - zone
    ) {
      pg.classList.add("hover-corner-left");
    } else {
      pg.classList.remove("hover-corner-left");
    }
  });

  pg.addEventListener("mouseleave", () => {
    pg.classList.remove("hover-corner");
    pg.classList.remove("hover-corner-left");
  });
});

// =========================
// HARD RESET MAP OVERLAY ON PAGE LOAD
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const mapOverlay = document.getElementById("map-overlay");

  if (mapOverlay) {
    mapOverlay.classList.add("hidden");
    mapOverlay.style.opacity = "0";
    mapOverlay.style.pointerEvents = "none";
  }
});


// =========================
// GLOBAL MAP NAVIGATION — FULLY LOCKED SAFE
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("open-map-btn");
  const closeBtn = document.getElementById("close-map-btn");
  const mapOverlay = document.getElementById("map-overlay");

  if (!openBtn || !closeBtn || !mapOverlay) return;

  // ✅ ALWAYS open cleanly
  openBtn.addEventListener("click", () => {
    mapOverlay.classList.remove("hidden");
    mapOverlay.style.opacity = "1";
    mapOverlay.style.pointerEvents = "auto";
  });

  // ✅ ALWAYS close cleanly
  closeBtn.addEventListener("click", () => {
    mapOverlay.classList.add("hidden");
    mapOverlay.style.opacity = "0";
    mapOverlay.style.pointerEvents = "none";
  });
});

// =========================
// LISTEN FOR MAP CLOSE SIGNAL
// =========================

window.addEventListener("message", (event) => {
  if (event.data === "close-map-overlay") {
    const mapOverlay = document.getElementById("map-overlay");
    if (!mapOverlay) return;

    mapOverlay.classList.add("hidden");
    mapOverlay.style.opacity = "0";
    mapOverlay.style.pointerEvents = "none";
  }
});



updatePages();