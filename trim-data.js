/* ==========================================================================
   GIULIA — SHARED TRIM / IMAGE DATA
   Single source of truth for every trim's photography, used by the landing
   page, the configurator, the gallery and the assistant's vehicle panel.
   Drop your own photos into /images/... using the filenames below — nothing
   else needs to change.
   ========================================================================== */

const ALFA_TRIMS = {
  giulia: {
    id: "giulia",
    name: "Giulia",
    tagline: "La berlina che ha reinventato lo sport italiano.",
    colorName: "Verde Montreal",
    swatch: "#1E5B3A",
    swatchDark: "#123823",
    hp: "280",
    zeroHundred: "5.7",
    topSpeed: "240",
    drivetrain: "RWD · 2.0L Turbo",
    images: {
      front: "images/green/green_front.jpg",
      rear: "images/green/green_rear.jpg",
      side: "images/green/green_rear2.jpg",
    },
  },
  quadrifoglio: {
    id: "quadrifoglio",
    name: "Giulia Quadrifoglio",
    tagline: "480 cavalli. Un cuore Ferrari. Un solo scopo: il Nürburgring.",
    colorName: "Rosso GTA",
    swatch: "#B00F14",
    swatchDark: "#7a0710",
    hp: "505",
    zeroHundred: "3.9",
    topSpeed: "307",
    drivetrain: "RWD · 2.9L Bi-Turbo V6",
    images: {
      front: "images/qv/qvfront.jpg",
      rear: "images/qv/qvrear.jpg",
      side: "images/qv/qvside.jpg",
    },
  },
  gtam: {
    id: "gtam",
    name: "Giulia GTAm",
    tagline: "Edizione limitata. Senza compromessi, senza sedili posteriori.",
    colorName: "Trofeo White / Verde",
    swatch: "#1E5B3A",
    swatchDark: "#123823",
    hp: "540",
    zeroHundred: "3.6",
    topSpeed: "300",
    drivetrain: "RWD · 2.9L Bi-Turbo V6 · Track-only aero",
    images: {
      front: "images/gtam/gtamfront.jpg",
      rear: "images/gtam/gtamrear.jpg",
      side: "images/gtam/gtamside.jpg",
    },
  },
};

const ALFA_DETAIL_GALLERY = [
  { src: "images/exterior/Front_grill.jpg", label: "Trilobo Grille", group: "exterior" },
  { src: "images/exterior/Fronside.jpg", label: "Three-Quarter Front", group: "exterior" },
  { src: "images/exterior/tail_lights.jpg", label: "Signature Taillights", group: "exterior" },
  { src: "images/exterior/fron_lights.jpg", label: "Full-LED Headlights", group: "exterior" },
  { src: "images/exterior/wheels.jpg", label: "Forged Alloy Wheels", group: "exterior" },
  { src: "images/exterior/1.jpg", label: "On the Road", group: "exterior" },
  { src: "images/exterior/drone_shoot.jpg", label: "Aerial Study", group: "exterior" },
  { src: "images/interior/interior.jpg", label: "Cabin Overview", group: "interior" },
  { src: "images/interior/geear_Knob.jpg", label: "DNA Gear Selector", group: "interior" },
  { src: "images/interior/infotenment_screen.jpg", label: "Infotainment Display", group: "interior" },
  { src: "images/interior/digital_cluster.gif", label: "Digital Instrument Cluster", group: "interior" },
  { src: "images/gtam/backfire.jpg", label: "GTAm Overrun Backfire", group: "performance" },
  { src: "images/brand/alfa_dimension.png", label: "Body Dimensions", group: "spec" },
];

const DEFAULT_TRIM_KEY = "alfaGiuliaTrim";

function alfaGetActiveTrim() {
  const saved = window.localStorage ? window.localStorage.getItem(DEFAULT_TRIM_KEY) : null;
  return ALFA_TRIMS[saved] ? saved : "quadrifoglio";
}

function alfaSetActiveTrim(id) {
  if (!ALFA_TRIMS[id]) return;
  if (window.localStorage) window.localStorage.setItem(DEFAULT_TRIM_KEY, id);
  document.dispatchEvent(new CustomEvent("alfa:trim-change", { detail: ALFA_TRIMS[id] }));
}

/* Applies a broken-image fallback so the layout never collapses before the
   user's own photos are dropped into /images. */
function alfaAttachImageFallback(img) {
  img.addEventListener("error", () => {
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = "true";
    const label = img.dataset.fallbackLabel || img.alt || "Image";
    img.src =
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
          <defs>
            <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0' stop-color='#171b26'/>
              <stop offset='1' stop-color='#0a0c11'/>
            </linearGradient>
          </defs>
          <rect width='100%' height='100%' fill='url(#g)'/>
          <text x='50%' y='48%' fill='#94A3B8' font-family='Arial' font-size='22'
                text-anchor='middle' dominant-baseline='middle'>${label}</text>
          <text x='50%' y='56%' fill='#475569' font-family='Arial' font-size='13'
                text-anchor='middle' dominant-baseline='middle'>Drop your photo into /images to replace this placeholder</text>
        </svg>`);
  });
}
