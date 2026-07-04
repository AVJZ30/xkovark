const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    if(window.scrollY > 40){ header.classList.add('scrolled'); } else { header.classList.remove('scrolled'); }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add('in'); observer.unobserve(entry.target); } });
  }, {threshold:0.15});
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // chip nav active state
  const chips = document.querySelectorAll('.chip');
  const targets = Array.from(chips).map(c => document.getElementById(c.dataset.target)).filter(Boolean);
  const chipObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const chip = document.querySelector('.chip[data-target="'+entry.target.id+'"]');
      if(chip){ chip.classList.toggle('active', entry.isIntersecting); }
    });
  }, {rootMargin:'-45% 0px -45% 0px'});
  targets.forEach(t => chipObserver.observe(t));
