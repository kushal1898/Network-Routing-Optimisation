// charts.js — Chart.js bandwidth utilization bar chart

let utilizationChartInstance = null;

/**
 * Render or re-render the bandwidth utilization chart.
 * @param {Map} flowOnEdge - Map<string, Map<string, number>>
 * @param {Graph} graph
 */
function renderUtilizationChart(flowOnEdge, graph) {
  const canvas = document.getElementById('utilization-chart');
  if (!canvas) return;

  // Destroy existing chart
  if (utilizationChartInstance) {
    utilizationChartInstance.destroy();
    utilizationChartInstance = null;
  }

  const edges = graph.getEdges();
  const labels = [];
  const data = [];
  const colors = [];

  for (const edge of edges) {
    const flow = flowOnEdge.get(edge.from)?.get(edge.to) || 0;
    const utilization = edge.capacity > 0 ? (flow / edge.capacity) * 100 : 0;

    if (flow > 0 || utilization > 0) {
      labels.push(`${edge.from} → ${edge.to}`);
      data.push(Math.round(utilization * 10) / 10);

      // Color logic
      if (utilization >= 100) {
        colors.push('#ef4444'); // red — saturated
      } else if (utilization >= 75) {
        colors.push('#f59e0b'); // amber
      } else {
        colors.push('#22c55e'); // green
      }
    }
  }

  // Show chart container
  const chartContainer = document.getElementById('chart-container');
  if (chartContainer) chartContainer.classList.remove('hidden');

  utilizationChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Utilization %',
        data: data,
        backgroundColor: colors,
        borderColor: colors.map(c => c),
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 22
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800
      },
      scales: {
        x: {
          min: 0,
          max: 110,
          ticks: {
            color: '#94a3b8',
            callback: function(value) {
              return value + '%';
            },
            font: { family: 'Space Mono', size: 10 }
          },
          grid: {
            color: '#2a3040'
          }
        },
        y: {
          ticks: {
            color: '#e2e8f0',
            font: { family: 'Space Mono', size: 11 }
          },
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1e2a3a',
          titleColor: '#00e5ff',
          bodyColor: '#e2e8f0',
          borderColor: '#374151',
          borderWidth: 1,
          titleFont: { family: 'Space Mono' },
          bodyFont: { family: 'Space Mono' },
          callbacks: {
            label: function(context) {
              const val = context.parsed.x;
              let label = `${val}%`;
              if (val >= 100) label += ' ⚠ BOTTLENECK';
              return label;
            }
          }
        }
      }
    }
  });

  return utilizationChartInstance;
}

/**
 * Hide the utilization chart.
 */
function hideUtilizationChart() {
  const chartContainer = document.getElementById('chart-container');
  if (chartContainer) chartContainer.classList.add('hidden');
  if (utilizationChartInstance) {
    utilizationChartInstance.destroy();
    utilizationChartInstance = null;
  }
}
