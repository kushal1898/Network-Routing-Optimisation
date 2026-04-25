// ui.js — DOM manipulation, input handling, output rendering, table building, toast system

/**
 * Toast notification system.
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colorMap = {
    success: { bg: 'bg-emerald-900/90', border: 'border-emerald-500', icon: '✓' },
    error: { bg: 'bg-red-900/90', border: 'border-red-500', icon: '✕' },
    warning: { bg: 'bg-amber-900/90', border: 'border-amber-500', icon: '⚠' },
    info: { bg: 'bg-cyan-900/90', border: 'border-cyan-500', icon: 'ℹ' }
  };

  const config = colorMap[type] || colorMap.info;

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-2 px-4 py-3 rounded-lg border backdrop-blur-sm ${config.bg} ${config.border} text-white text-sm font-mono shadow-lg transform translate-y-4 opacity-0 transition-all duration-300`;
  toast.innerHTML = `<span class="text-lg">${config.icon}</span><span>${message}</span>`;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Populate node select dropdowns.
 */
function populateNodeSelects(graph) {
  const nodes = graph.getNodes();
  const selects = ['from-node', 'to-node', 'source-node', 'sink-node'];

  for (const selectId of selects) {
    const select = document.getElementById(selectId);
    if (!select) continue;
    const current = select.value;
    select.innerHTML = '<option value="">Select node</option>';
    for (const node of nodes) {
      const opt = document.createElement('option');
      opt.value = node;
      opt.textContent = node;
      select.appendChild(opt);
    }
    // Restore previous selection if still valid
    if (nodes.includes(current)) {
      select.value = current;
    }
  }
}

/**
 * Render node chips.
 */
function renderNodeChips(graph, onDelete) {
  const container = document.getElementById('node-chips');
  if (!container) return;
  container.innerHTML = '';

  for (const node of graph.getNodes()) {
    const chip = document.createElement('div');
    chip.className = 'flex items-center gap-1 px-3 py-1.5 rounded-full bg-navy-700 border border-cyan/30 text-cyan text-sm font-mono group hover:border-cyan transition-colors';
    chip.innerHTML = `
      <span>${node}</span>
      <button class="ml-1 text-gray-500 hover:text-red-400 transition-colors text-xs" data-node="${node}" title="Delete node">✕</button>
    `;
    chip.querySelector('button').addEventListener('click', () => onDelete(node));
    container.appendChild(chip);
  }
}

/**
 * Render edge table.
 */
function renderEdgeTable(graph, onDelete) {
  const tbody = document.getElementById('edge-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const edges = graph.getEdges();
  if (edges.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500 text-sm">No edges added yet</td></tr>`;
    return;
  }

  for (const edge of edges) {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-800/50 hover:bg-navy-700/50 transition-colors result-row';
    row.innerHTML = `
      <td class="py-2 px-3 text-cyan font-mono text-sm">${edge.from}</td>
      <td class="py-2 px-3 text-cyan font-mono text-sm">${edge.to}</td>
      <td class="py-2 px-3 text-gray-300 font-mono text-sm">${edge.distance}</td>
      <td class="py-2 px-3 text-gray-300 font-mono text-sm">${edge.capacity}</td>
      <td class="py-2 px-3">
        <button class="text-gray-500 hover:text-red-400 transition-colors text-xs" data-from="${edge.from}" data-to="${edge.to}" title="Delete edge">✕</button>
      </td>
    `;
    row.querySelector('button').addEventListener('click', () => onDelete(edge.from, edge.to));
    tbody.appendChild(row);
  }
}

/**
 * Render Bellman-Ford results.
 */
function renderBellmanFordResults(result, source) {
  const container = document.getElementById('bf-results');
  if (!container) return;

  if (result.hasNegativeCycle) {
    container.innerHTML = `
      <div class="bg-amber-900/30 border border-amber-500/50 rounded-lg p-3 flex items-center gap-2 text-amber-300 text-sm mb-4">
        <span class="text-lg">⚠️</span>
        <span>Negative cycle detected! Shortest paths may not be reliable.</span>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }

  const sourceLabel = document.createElement('div');
  sourceLabel.className = 'text-sm text-gray-400 mb-3 font-mono';
  sourceLabel.innerHTML = `Source Node: <span class="text-orange-400 font-bold">${source}</span>`;
  container.appendChild(sourceLabel);

  // Build table
  const table = document.createElement('table');
  table.className = 'w-full text-sm';
  table.innerHTML = `
    <thead>
      <tr class="border-b border-gray-700">
        <th class="text-left py-2 px-3 text-gray-400 font-medium font-ui">Node</th>
        <th class="text-left py-2 px-3 text-gray-400 font-medium font-ui">Distance</th>
        <th class="text-left py-2 px-3 text-gray-400 font-medium font-ui">Path</th>
      </tr>
    </thead>
    <tbody id="bf-table-body"></tbody>
  `;
  container.appendChild(table);

  const tbody = table.querySelector('tbody');
  const nodes = Object.keys(result.distances).filter(n => n !== source).sort();

  for (const node of nodes) {
    const dist = result.distances[node];
    const path = result.getPath(node);
    const pathStr = path.length > 0 ? path.join(' → ') : '—';
    const distStr = dist === Infinity ? '∞' : dist;
    const distClass = dist === Infinity ? 'text-gray-600' : 'text-emerald-400';

    const row = document.createElement('tr');
    row.className = 'border-b border-gray-800/50 hover:bg-navy-700/50 transition-colors result-row';
    row.innerHTML = `
      <td class="py-2 px-3 text-cyan font-mono">${node}</td>
      <td class="py-2 px-3 ${distClass} font-mono font-bold">${distStr}</td>
      <td class="py-2 px-3 text-gray-300 font-mono text-xs">${pathStr}</td>
    `;

    // Click to highlight path on graph
    if (path.length > 1) {
      row.classList.add('cursor-pointer');
      row.addEventListener('click', () => {
        highlightBellmanFordPath(path);
      });
    }

    tbody.appendChild(row);
  }

  // Animate results in
  animateResultRows(container);

  // Auto-highlight path to furthest reachable node
  let furthestNode = null;
  let maxDist = -Infinity;
  for (const node of nodes) {
    if (result.distances[node] !== Infinity && result.distances[node] > maxDist) {
      maxDist = result.distances[node];
      furthestNode = node;
    }
  }
  if (furthestNode) {
    const path = result.getPath(furthestNode);
    if (path.length > 1) {
      highlightBellmanFordPath(path);
    }
  }
}

/**
 * Render Floyd-Warshall results as an all-pairs distance matrix.
 */
function renderFloydWarshallResults(result) {
  const container = document.getElementById('fw-results');
  if (!container) return;
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'text-sm text-gray-400 mb-1 font-ui';
  header.textContent = 'All-Pairs Shortest Path Routing Table';
  container.appendChild(header);

  const hint = document.createElement('div');
  hint.className = 'text-xs text-gray-500 mb-3 font-ui';
  hint.textContent = '(Click a cell to highlight path on graph)';
  container.appendChild(hint);

  const nodes = result.nodes;
  const V = nodes.length;

  // Build matrix table
  const tableWrap = document.createElement('div');
  tableWrap.className = 'overflow-x-auto';
  const table = document.createElement('table');
  table.className = 'text-xs font-mono w-full';

  // Header row
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.innerHTML = '<th class="py-1 px-2 text-gray-500"></th>';
  for (const node of nodes) {
    headRow.innerHTML += `<th class="py-1 px-2 text-cyan text-center min-w-[40px]">${node}</th>`;
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body rows
  const tbody = document.createElement('tbody');
  for (let i = 0; i < V; i++) {
    const row = document.createElement('tr');
    row.className = 'border-b border-gray-800/30';
    row.innerHTML = `<td class="py-1.5 px-2 text-cyan font-bold">${nodes[i]}</td>`;

    for (let j = 0; j < V; j++) {
      const dist = result.dist[i][j];
      const isDiag = i === j;
      const isInf = dist === Infinity;
      const val = isInf ? '∞' : dist;

      let cellClass = 'fw-cell py-1.5 px-2 text-center rounded-sm transition-colors ';
      if (isDiag) {
        cellClass += 'bg-gray-800/40 text-gray-600';
      } else if (isInf) {
        cellClass += 'text-gray-600';
      } else {
        cellClass += 'text-emerald-400 hover:bg-cyan-900/30 cursor-pointer';
      }

      const cell = document.createElement('td');
      cell.className = cellClass;
      cell.textContent = val;

      if (!isDiag && !isInf) {
        cell.addEventListener('click', () => {
          const path = result.getPath(nodes[i], nodes[j]);
          if (path.length > 1) {
            highlightFloydPath(nodes[i], nodes[j], path);
            // Highlight the cell temporarily
            cell.classList.add('highlighted');
            setTimeout(() => cell.classList.remove('highlighted'), 2000);
          }
        });
      }

      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  container.appendChild(tableWrap);

  animateResultRows(container);
}

/**
 * Render Max Flow results.
 */
function renderMaxFlowResults(result, source, sink, graph) {
  const container = document.getElementById('mf-results');
  if (!container) return;
  container.innerHTML = '';

  // Max flow banner
  const banner = document.createElement('div');
  banner.className = 'bg-navy-700 border border-cyan/30 rounded-lg p-4 mb-4 text-center';
  banner.innerHTML = `
    <div class="text-xs text-gray-400 font-ui mb-1">Source: <span class="text-orange-400">${source}</span> → Sink: <span class="text-purple-400">${sink}</span></div>
    <div class="text-3xl font-bold text-cyan font-mono">${result.maxFlow} <span class="text-lg text-gray-400">Mbps</span></div>
    <div class="text-xs text-gray-500 mt-1 font-ui">Maximum Network Flow</div>
  `;
  container.appendChild(banner);

  if (result.maxFlow === 0) {
    const noPath = document.createElement('div');
    noPath.className = 'bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 text-blue-300 text-sm text-center';
    noPath.textContent = 'No path found from source to sink. Max Flow = 0.';
    container.appendChild(noPath);
    return;
  }

  // Edge flow table
  const edges = graph.getEdges();
  const tableLabel = document.createElement('div');
  tableLabel.className = 'text-sm text-gray-400 mb-2 font-ui font-medium';
  tableLabel.textContent = 'Edge Flow Details';
  container.appendChild(tableLabel);

  const table = document.createElement('table');
  table.className = 'w-full text-xs font-mono';
  table.innerHTML = `
    <thead>
      <tr class="border-b border-gray-700">
        <th class="text-left py-1.5 px-2 text-gray-400 font-ui font-medium">From</th>
        <th class="text-left py-1.5 px-2 text-gray-400 font-ui font-medium">To</th>
        <th class="text-right py-1.5 px-2 text-gray-400 font-ui font-medium">Flow</th>
        <th class="text-right py-1.5 px-2 text-gray-400 font-ui font-medium">Capacity</th>
        <th class="text-right py-1.5 px-2 text-gray-400 font-ui font-medium">Utilization</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  container.appendChild(table);
  const tbody = table.querySelector('tbody');

  for (const edge of edges) {
    const flow = result.flowOnEdge.get(edge.from)?.get(edge.to) || 0;
    const utilization = edge.capacity > 0 ? ((flow / edge.capacity) * 100).toFixed(1) : '0.0';
    const isSaturated = flow >= edge.capacity && flow > 0;

    let utilClass = 'text-emerald-400';
    if (parseFloat(utilization) >= 100) utilClass = 'text-red-400 font-bold';
    else if (parseFloat(utilization) >= 75) utilClass = 'text-amber-400';

    const row = document.createElement('tr');
    row.className = 'border-b border-gray-800/30 result-row hover:bg-navy-700/50 transition-colors';
    row.innerHTML = `
      <td class="py-1.5 px-2 text-cyan">${edge.from}</td>
      <td class="py-1.5 px-2 text-cyan">${edge.to}</td>
      <td class="py-1.5 px-2 text-right text-gray-300">${flow}</td>
      <td class="py-1.5 px-2 text-right text-gray-300">${edge.capacity}</td>
      <td class="py-1.5 px-2 text-right ${utilClass}">${utilization}%</td>
    `;
    tbody.appendChild(row);
  }

  // Bottleneck edges
  if (result.bottleneckEdges.length > 0) {
    const bnLabel = document.createElement('div');
    bnLabel.className = 'text-sm text-gray-400 mt-4 mb-2 font-ui font-medium';
    bnLabel.textContent = 'Bottleneck Edges';
    container.appendChild(bnLabel);

    for (const bn of result.bottleneckEdges) {
      const badge = document.createElement('div');
      badge.className = 'bottleneck-badge flex items-center gap-2 bg-red-900/30 border border-red-500/50 rounded-lg px-3 py-2 text-red-300 text-sm mb-2';
      badge.innerHTML = `<span>⚠️</span> <span class="font-mono">${bn.from} → ${bn.to}</span> <span class="text-gray-400">(${bn.flow} / ${bn.capacity} Mbps)</span> <span class="text-red-400 font-bold text-xs ml-auto">SATURATED</span>`;
      container.appendChild(badge);
    }
  }

  animateResultRows(container);
}

/**
 * Animate result rows using Anime.js.
 */
function animateResultRows(container) {
  const rows = container.querySelectorAll('.result-row');
  if (typeof anime !== 'undefined' && rows.length > 0) {
    anime({
      targets: rows,
      opacity: [0, 1],
      translateY: [12, 0],
      delay: anime.stagger(40),
      duration: 300,
      easing: 'easeOutQuad'
    });
  }
}

/**
 * Switch result tabs.
 */
function switchTab(tabName) {
  const tabs = ['bellman-ford', 'floyd-warshall', 'max-flow'];
  const panelMap = {
    'bellman-ford': 'bf-results',
    'floyd-warshall': 'fw-results',
    'max-flow': 'mf-results'
  };

  for (const tab of tabs) {
    const btn = document.getElementById(`tab-${tab}`);
    const panel = document.getElementById(panelMap[tab]);
    if (tab === tabName) {
      btn?.classList.add('active');
      panel?.classList.remove('hidden');
    } else {
      btn?.classList.remove('active');
      panel?.classList.add('hidden');
    }
  }
}
