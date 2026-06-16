document.querySelectorAll('.data-table').forEach(table => new DataTable(table, { responsive: true }));

document.addEventListener('submit', event => {
  const form = event.target.closest('.confirm-form');
  if (!form) return;
  event.preventDefault();
  Swal.fire({ title: 'আপনি কি নিশ্চিত?', icon: 'warning', showCancelButton: true, confirmButtonText: 'হ্যাঁ', cancelButtonText: 'না' })
    .then(result => { if (result.isConfirmed) form.submit(); });
});

if (window.dashboardCharts) {
  const make = (id, label, values) => new Chart(document.getElementById(id), {
    type: 'bar',
    data: { labels: values.map((_, i) => i + 1), datasets: [{ label, data: values, backgroundColor: '#0d6efd' }] },
    options: { plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
  });
  make('depositChart', 'Deposit Chart', window.dashboardCharts.deposits);
  make('investmentChart', 'Investment Chart', window.dashboardCharts.investments);
  make('profitChart', 'Profit Chart', window.dashboardCharts.profits);
}
