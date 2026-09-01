// 移动端菜单
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => navLinks.classList.remove('open'))
  );
}

// 滚动入场动画
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// 产品筛选（产品中心页）
const filterBar = document.querySelector('.filter-bar');
if (filterBar) {
  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.filter;
    document.querySelectorAll('[data-type]').forEach(card => {
      card.style.display = (type === 'all' || card.dataset.type === type) ? '' : 'none';
    });
  });
}

// 联系表单（演示：提交后显示提示）
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const tip = document.getElementById('formTip');
    tip.style.display = 'block';
    contactForm.reset();
    tip.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
