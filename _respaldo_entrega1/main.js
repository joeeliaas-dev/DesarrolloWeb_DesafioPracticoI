/* =========================================================
   ADDIKT SKATESHOP — mejoras progresivas
   El sitio funciona sin JavaScript; esto solo agrega detalles.
   ========================================================= */

// Año actual en el footer
document.querySelectorAll("[data-anio]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Header con sombra al hacer scroll
const header = document.querySelector(".header");
if (header) {
  const marcar = () => header.classList.toggle("header--scroll", window.scrollY > 8);
  marcar();
  window.addEventListener("scroll", marcar, { passive: true });
}

// "Abierto ahora / Cerrado" según la hora de El Salvador (UTC-6, sin horario de verano)
const estado = document.querySelector("[data-estado]");
if (estado) {
  const ahora = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const dia = ahora.getUTCDay(); // 0 = domingo
  const minutos = ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
  const [abre, cierra] = dia === 0 ? [11 * 60, 17 * 60] : [10 * 60, 19 * 60];
  const abierto = minutos >= abre && minutos < cierra;

  estado.textContent = abierto
    ? `Abierto ahora · cierra a las ${cierra / 60}:00`
    : "Cerrado ahora";
  estado.classList.add(abierto ? "estado--abierto" : "estado--cerrado");
  estado.hidden = false;
}

// Aparición suave de secciones al hacer scroll
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if ("IntersectionObserver" in window && !sinMovimiento) {
  const elementos = document.querySelectorAll(
    ".seccion__cabecera, .categoria, .nosotros__grid > *, .feed__grid a, .faq__grid > *, .info, .cta, .paso"
  );

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("revelar--visible");
          observador.unobserve(entrada.target);
        }
      });
    },
    { rootMargin: "0px 0px -60px 0px" }
  );

  elementos.forEach((el, i) => {
    el.classList.add("revelar");
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    observador.observe(el);
  });
}
