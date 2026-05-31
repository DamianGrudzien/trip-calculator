window.Charts = (function () {
  let pieChart = null;
  let barChart = null;
  let lineChart = null;

  function destroyIfExists(instance) {
    if (instance) { instance.destroy(); }
    return null;
  }

  function renderCategoryPie(canvasId) {
    pieChart = destroyIfExists(pieChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const totals = Expenses.getTotalByCategory();
    const cats = Expenses.EXPENSE_CATEGORIES.filter(c => totals[c.id] > 0);

    if (cats.length === 0) {
      canvas.style.display = 'none';
      const placeholder = canvas.parentElement.querySelector('.chart-empty');
      if (placeholder) placeholder.style.display = 'block';
      return;
    }
    canvas.style.display = '';
    const placeholder = canvas.parentElement.querySelector('.chart-empty');
    if (placeholder) placeholder.style.display = 'none';

    pieChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: cats.map(c => c.emoji + ' ' + c.label),
        datasets: [{
          data: cats.map(c => totals[c.id]),
          backgroundColor: cats.map(c => c.color),
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + formatCurrency(ctx.raw),
            },
          },
        },
      },
    });
  }

  function renderFamilyBar(canvasId) {
    barChart = destroyIfExists(barChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const state = Storage.load();
    const totals = Expenses.getTotalByFamily();
    const settlement = Expenses.calculateSettlement();

    if (state.expenses.length === 0) {
      canvas.style.display = 'none';
      const placeholder = canvas.parentElement.querySelector('.chart-empty');
      if (placeholder) placeholder.style.display = 'block';
      return;
    }
    canvas.style.display = '';
    const placeholder = canvas.parentElement.querySelector('.chart-empty');
    if (placeholder) placeholder.style.display = 'none';

    barChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: state.families.map(f => f.name),
        datasets: [
          {
            label: 'Zapłacono',
            data: state.families.map(f => totals[f.id] || 0),
            backgroundColor: ['#4F46E5', '#10B981'],
            borderRadius: 8,
          },
          {
            label: 'Należny udział',
            data: settlement.families.map(f => Math.max(0, f.fairShare)),
            backgroundColor: ['rgba(79,70,229,0.25)', 'rgba(16,185,129,0.25)'],
            borderColor: ['#4F46E5', '#10B981'],
            borderWidth: 2,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + formatCurrency(ctx.raw) },
          },
        },
        scales: {
          y: { ticks: { callback: v => formatCurrency(v) } },
        },
      },
    });
  }

  function renderTimeline(canvasId) {
    lineChart = destroyIfExists(lineChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const data = Expenses.getExpensesByDate();

    if (data.length === 0) {
      canvas.style.display = 'none';
      const placeholder = canvas.parentElement.querySelector('.chart-empty');
      if (placeholder) placeholder.style.display = 'block';
      return;
    }
    canvas.style.display = '';
    const placeholder = canvas.parentElement.querySelector('.chart-empty');
    if (placeholder) placeholder.style.display = 'none';

    lineChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: data.map(d => formatDateShort(d.date)),
        datasets: [
          {
            label: 'Suma skumulowana',
            data: data.map(d => d.cumulative),
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79,70,229,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
          },
          {
            label: 'Wydatki dzienne',
            data: data.map(d => d.daily),
            borderColor: '#F97316',
            backgroundColor: 'transparent',
            borderDash: [5, 3],
            tension: 0.2,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + formatCurrency(ctx.raw) },
          },
        },
        scales: {
          y: { ticks: { callback: v => formatCurrency(v) } },
        },
      },
    });
  }

  function renderAll() {
    renderCategoryPie('chart-category');
    renderFamilyBar('chart-family');
    renderTimeline('chart-timeline');
  }

  function formatCurrency(amount) {
    return Number(amount).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
  }

  function formatDateShort(iso) {
    const [, m, d] = iso.split('-');
    return d + '.' + m;
  }

  return { renderAll, renderCategoryPie, renderFamilyBar, renderTimeline };
})();
