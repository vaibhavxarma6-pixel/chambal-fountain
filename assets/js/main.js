document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.year').forEach(el=>el.textContent=new Date().getFullYear());
  const items=document.querySelectorAll('.collection-card,.inspiration-card,.values-grid article');
  if('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target);}}),{threshold:.08});
    items.forEach(el=>{el.classList.add('reveal-item');io.observe(el);});
  }
});
