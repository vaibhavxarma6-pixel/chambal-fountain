document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.year').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // Mobile navigation toggle across all pages
  const toggleBtn = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav nav');

  if (toggleBtn && navMenu && !toggleBtn.dataset.bound) {
    toggleBtn.dataset.bound = 'true';

    const closeMenu = () => {
      navMenu.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-label', 'Open navigation');
      toggleBtn.textContent = '☰';
    };

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.toggle('is-open');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      toggleBtn.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      toggleBtn.textContent = isOpen ? '✕' : '☰';
    });

    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('is-open') && !navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // Card reveal animation
  const items = document.querySelectorAll('.collection-card,.inspiration-card,.values-grid article');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 }
    );
    items.forEach((el) => {
      el.classList.add('reveal-item');
      io.observe(el);
    });
  }
});
