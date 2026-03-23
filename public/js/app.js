document.addEventListener('DOMContentLoaded', () => {
  const alerts = document.querySelectorAll('.alert.success');
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transition = 'opacity 250ms ease';
    }, 2500);
  });
});
