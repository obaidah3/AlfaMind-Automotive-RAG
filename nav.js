/* Shared top-nav behaviour: mobile toggle + active link highlight. */
(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("navToggle");
    const links = document.getElementById("navLinks");
    if (toggle && links) {
      toggle.addEventListener("click", () => links.classList.toggle("open"));
      links.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", () => links.classList.remove("open"))
      );
    }

    const here = document.body.dataset.page;
    document.querySelectorAll("#navLinks a[data-page]").forEach((a) => {
      a.classList.toggle("active", a.dataset.page === here);
    });
  });
})();
