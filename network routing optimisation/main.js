// main.js — App init, event wiring, global state

const AppState = {
  graph: new Graph(),
  cytoscapeInstance: null,
  lastBellmanFordResult: null,
  lastFloydWarshallResult: null,
  lastMaxFlowResult: null,
  utilizationChart: null,
  activeTab: 'bellman-ford'
};

/**
 * Load preset example network.
 */
function loadExampleNetwork() {
  AppState.graph.reset();
  clearHighlights();
  clearBottleneckAnimations();
  hideUtilizationChart();

  const nodes = ['A', 'B', 'C', 'D', 'E'];
  const edges = [
    { from: 'A', to: 'B', distance: 10, capacity: 100 },
    { from: 'A', to: 'C', distance: 15, capacity: 80 },
    { from: 'B', to: 'D', distance: 20, capacity: 120 },
    { from: 'C', to: 'D', distance: 25, capacity: 70 },
    { from: 'D', to: 'E', distance: 10, capacity: 150 },
    { from: 'B', to: 'E', distance: 40, capacity: 60 },
    { from: 'C', to: 'E', distance: 30, capacity: 90 }
  ];

  for (const node of nodes) {
    AppState.graph.addNode(node);
  }
  for (const edge of edges) {
    AppState.graph.addEdge(edge.from, edge.to, edge.distance, edge.capacity);
  }

  refreshUI();
  renderGraph(AppState.graph);

  // Auto-set source and sink
  document.getElementById('source-node').value = 'A';
  document.getElementById('sink-node').value = 'E';

  showToast('Example network loaded!', 'success');
}

/**
 * Refresh all UI components.
 */
function refreshUI() {
  populateNodeSelects(AppState.graph);
  renderNodeChips(AppState.graph, handleDeleteNode);
  renderEdgeTable(AppState.graph, handleDeleteEdge);
}

/**
 * Clear all results.
 */
function clearResults() {
  AppState.lastBellmanFordResult = null;
  AppState.lastFloydWarshallResult = null;
  AppState.lastMaxFlowResult = null;

  const bfResults = document.getElementById('bf-results');
  const fwResults = document.getElementById('fw-results');
  const mfResults = document.getElementById('mf-results');
  if (bfResults) bfResults.innerHTML = '<p class="text-gray-500 text-sm text-center py-6">Run Bellman-Ford to see results</p>';
  if (fwResults) fwResults.innerHTML = '<p class="text-gray-500 text-sm text-center py-6">Run Floyd-Warshall to see results</p>';
  if (mfResults) mfResults.innerHTML = '<p class="text-gray-500 text-sm text-center py-6">Run Max Flow to see results</p>';
}

// ── Event Handlers ──

function handleAddNode() {
  const input = document.getElementById('node-id');
  const id = input.value.trim();
  if (!id) {
    showToast('Enter a node ID.', 'error');
    return;
  }
  try {
    AppState.graph.addNode(id);
    showToast(`Node "${id}" added.`, 'success');
    input.value = '';
    refreshUI();
    renderGraph(AppState.graph);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function handleDeleteNode(id) {
  AppState.graph.removeNode(id);
  showToast(`Node "${id}" removed.`, 'info');
  refreshUI();
  renderGraph(AppState.graph);
  clearHighlights();
  clearResults();
}

function handleAddEdge() {
  const from = document.getElementById('from-node').value;
  const to = document.getElementById('to-node').value;
  const distance = parseInt(document.getElementById('edge-distance').value);
  const capacity = parseInt(document.getElementById('edge-capacity').value);

  if (!from || !to) {
    showToast('Select both From and To nodes.', 'error');
    return;
  }
  if (isNaN(distance) || distance < 1) {
    showToast('Distance must be at least 1.', 'error');
    return;
  }
  if (isNaN(capacity) || capacity < 1) {
    showToast('Bandwidth must be at least 1.', 'error');
    return;
  }

  try {
    AppState.graph.addEdge(from, to, distance, capacity);
    showToast(`Edge ${from} → ${to} added.`, 'success');
    refreshUI();
    renderGraph(AppState.graph);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function handleDeleteEdge(from, to) {
  AppState.graph.removeEdge(from, to);
  showToast(`Edge ${from} → ${to} removed.`, 'info');
  refreshUI();
  renderGraph(AppState.graph);
  clearResults();
}

function handleRunBellmanFord() {
  if (AppState.graph.nodeCount() < 2) {
    showToast('Add at least 2 nodes and edges first.', 'error');
    return;
  }
  const source = document.getElementById('source-node').value;
  if (!source) {
    showToast('Select a source node.', 'error');
    return;
  }

  clearHighlights();
  clearBottleneckAnimations();
  const result = bellmanFord(AppState.graph, source);
  AppState.lastBellmanFordResult = result;
  renderBellmanFordResults(result, source);
  switchTab('bellman-ford');
  showToast('Bellman-Ford complete!', 'success');
}

function handleRunFloydWarshall() {
  if (AppState.graph.nodeCount() < 2) {
    showToast('Add at least 2 nodes and edges first.', 'error');
    return;
  }

  clearHighlights();
  clearBottleneckAnimations();
  const result = floydWarshall(AppState.graph);
  AppState.lastFloydWarshallResult = result;
  renderFloydWarshallResults(result);
  switchTab('floyd-warshall');
  showToast('Floyd-Warshall complete!', 'success');
}

function handleRunMaxFlow() {
  if (AppState.graph.nodeCount() < 2) {
    showToast('Add at least 2 nodes and edges first.', 'error');
    return;
  }
  const source = document.getElementById('source-node').value;
  const sink = document.getElementById('sink-node').value;
  if (!source) {
    showToast('Select a source node.', 'error');
    return;
  }
  if (!sink) {
    showToast('Select a sink node.', 'error');
    return;
  }
  if (source === sink) {
    showToast('Source and sink must be different.', 'error');
    return;
  }

  clearHighlights();
  clearBottleneckAnimations();
  const result = edmondsKarp(AppState.graph, source, sink);
  AppState.lastMaxFlowResult = result;
  renderMaxFlowResults(result, source, sink, AppState.graph);
  highlightMaxFlow(result.flowOnEdge, result.bottleneckEdges, source, sink);
  renderUtilizationChart(result.flowOnEdge, AppState.graph);
  switchTab('max-flow');
  showToast(`Max Flow: ${result.maxFlow} Mbps`, 'success');
}

function handleRunAll() {
  if (AppState.graph.nodeCount() < 2) {
    showToast('Add at least 2 nodes and edges first.', 'error');
    return;
  }
  const source = document.getElementById('source-node').value;
  const sink = document.getElementById('sink-node').value;
  if (!source) {
    showToast('Select a source node.', 'error');
    return;
  }

  // Run Bellman-Ford
  const bfResult = bellmanFord(AppState.graph, source);
  AppState.lastBellmanFordResult = bfResult;
  renderBellmanFordResults(bfResult, source);

  // Run Floyd-Warshall
  const fwResult = floydWarshall(AppState.graph);
  AppState.lastFloydWarshallResult = fwResult;
  renderFloydWarshallResults(fwResult);

  // Run Max Flow if sink is set
  if (sink && source !== sink) {
    clearHighlights();
    clearBottleneckAnimations();
    const mfResult = edmondsKarp(AppState.graph, source, sink);
    AppState.lastMaxFlowResult = mfResult;
    renderMaxFlowResults(mfResult, source, sink, AppState.graph);
    highlightMaxFlow(mfResult.flowOnEdge, mfResult.bottleneckEdges, source, sink);
    renderUtilizationChart(mfResult.flowOnEdge, AppState.graph);
  }

  switchTab('bellman-ford');
  showToast('All algorithms complete!', 'success');
}

function handleResetAll() {
  AppState.graph.reset();
  clearHighlights();
  clearBottleneckAnimations();
  hideUtilizationChart();
  clearResults();
  StepViewer.hide();
  refreshUI();
  renderGraph(AppState.graph);
  showToast('All data cleared.', 'info');
}

// ── Step-by-Step Handlers ──

/**
 * Callback: highlight graph elements based on the current step.
 */
function onAlgorithmStepChange(step, index) {
  if (!cy) return;
  clearHighlights();

  // Bellman-Ford step: highlight the edge being checked
  if (step.highlightEdge) {
    const edgeId = `${step.highlightEdge.from}-${step.highlightEdge.to}`;
    const edge = cy.getElementById(edgeId);
    if (edge.length) {
      if (step.relaxed) {
        edge.addClass('bf-path');
        animateEdgePulse(edge, '#3b82f6');
      } else {
        // Temporarily flash the edge gray
        edge.style('line-color', '#6b7280');
        edge.style('target-arrow-color', '#6b7280');
        edge.style('width', 3);
        setTimeout(() => {
          edge.style('line-color', '#374151');
          edge.style('target-arrow-color', '#374151');
          edge.style('width', 2);
        }, 600);
      }
    }
  }

  // Highlight specific node
  if (step.highlightNode) {
    const node = cy.getElementById(step.highlightNode);
    if (node.length) {
      node.addClass('bf-node');
    }
  }

  // Floyd-Warshall: highlight k, i, j nodes
  if (step.kNode) {
    const kNode = cy.getElementById(step.kNode);
    if (kNode.length) kNode.addClass('source');
  }
  if (step.iNode) {
    const iNode = cy.getElementById(step.iNode);
    if (iNode.length) iNode.addClass('bf-node');

    // Highlight i→k and k→j edges
    if (step.kNode) {
      const ikEdge = cy.getElementById(`${step.iNode}-${step.kNode}`);
      const kjEdge = cy.getElementById(`${step.kNode}-${step.jNode}`);
      if (ikEdge.length) ikEdge.addClass('fw-path');
      if (kjEdge.length) kjEdge.addClass('fw-path');

      // If updated, also highlight i→j
      if (step.updated) {
        const ijEdge = cy.getElementById(`${step.iNode}-${step.jNode}`);
        if (ijEdge.length) {
          ijEdge.addClass('bf-path');
          animateEdgePulse(ijEdge, '#00e676');
        }
      }
    }
  }
  if (step.jNode) {
    const jNode = cy.getElementById(step.jNode);
    if (jNode.length) jNode.addClass('sink');
  }

  // Edmonds-Karp: highlight augmenting path
  if (step.path && step.path.length > 1) {
    const srcNode = cy.getElementById(step.path[0]);
    if (srcNode.length) srcNode.addClass('source');
    const sinkNode = cy.getElementById(step.path[step.path.length - 1]);
    if (sinkNode.length) sinkNode.addClass('sink');

    for (let i = 0; i < step.path.length - 1; i++) {
      const edgeId = `${step.path[i]}-${step.path[i + 1]}`;
      const edge = cy.getElementById(edgeId);
      if (edge.length) {
        edge.addClass('flow-path');
      }
    }
  }

  // BFS visited nodes (dim highlight)
  if (step.bfsVisited && step.bfsVisited.length > 0) {
    for (const nodeId of step.bfsVisited) {
      const node = cy.getElementById(nodeId);
      if (node.length && !node.hasClass('source') && !node.hasClass('sink')) {
        node.addClass('bf-node');
      }
    }
  }
}

function handleStepsBellmanFord() {
  if (AppState.graph.nodeCount() < 2) {
    showToast('Add at least 2 nodes first.', 'error');
    return;
  }
  const source = document.getElementById('source-node').value;
  if (!source) {
    showToast('Select a source node.', 'error');
    return;
  }

  const result = bellmanFord(AppState.graph, source);
  AppState.lastBellmanFordResult = result;
  renderBellmanFordResults(result, source);
  switchTab('bellman-ford');

  StepViewer.load(result.steps, 'Bellman-Ford', onAlgorithmStepChange);
  showToast(`Bellman-Ford: ${result.steps.length} steps loaded. Use controls to step through.`, 'info');
}

function handleStepsFloydWarshall() {
  if (AppState.graph.nodeCount() < 2) {
    showToast('Add at least 2 nodes first.', 'error');
    return;
  }

  const result = floydWarshall(AppState.graph);
  AppState.lastFloydWarshallResult = result;
  renderFloydWarshallResults(result);
  switchTab('floyd-warshall');

  StepViewer.load(result.steps, 'Floyd-Warshall', onAlgorithmStepChange);
  showToast(`Floyd-Warshall: ${result.steps.length} steps loaded. Use controls to step through.`, 'info');
}

function handleStepsMaxFlow() {
  if (AppState.graph.nodeCount() < 2) {
    showToast('Add at least 2 nodes first.', 'error');
    return;
  }
  const source = document.getElementById('source-node').value;
  const sink = document.getElementById('sink-node').value;
  if (!source) {
    showToast('Select a source node.', 'error');
    return;
  }
  if (!sink) {
    showToast('Select a sink node.', 'error');
    return;
  }
  if (source === sink) {
    showToast('Source and sink must differ.', 'error');
    return;
  }

  const result = edmondsKarp(AppState.graph, source, sink);
  AppState.lastMaxFlowResult = result;
  renderMaxFlowResults(result, source, sink, AppState.graph);
  switchTab('max-flow');

  StepViewer.load(result.steps, 'Edmonds-Karp (Max Flow)', onAlgorithmStepChange);
  showToast(`Edmonds-Karp: ${result.steps.length} steps loaded. Use controls to step through.`, 'info');
}

// ── Initialization ──

document.addEventListener('DOMContentLoaded', () => {
  // Init Cytoscape
  AppState.cytoscapeInstance = initCytoscape('cy');

  // Wire up buttons
  document.getElementById('btn-add-node').addEventListener('click', handleAddNode);
  document.getElementById('btn-add-edge').addEventListener('click', handleAddEdge);
  document.getElementById('btn-bellman-ford').addEventListener('click', handleRunBellmanFord);
  document.getElementById('btn-floyd-warshall').addEventListener('click', handleRunFloydWarshall);
  document.getElementById('btn-max-flow').addEventListener('click', handleRunMaxFlow);
  document.getElementById('btn-run-all').addEventListener('click', handleRunAll);
  document.getElementById('btn-load-example').addEventListener('click', loadExampleNetwork);
  document.getElementById('btn-reset').addEventListener('click', handleResetAll);
  document.getElementById('btn-navbar-reset').addEventListener('click', handleResetAll);

  // Zoom controls
  document.getElementById('btn-zoom-in').addEventListener('click', zoomIn);
  document.getElementById('btn-zoom-out').addEventListener('click', zoomOut);
  document.getElementById('btn-fit').addEventListener('click', fitToScreen);

  // Tab switching
  document.getElementById('tab-bellman-ford').addEventListener('click', () => switchTab('bellman-ford'));
  document.getElementById('tab-floyd-warshall').addEventListener('click', () => switchTab('floyd-warshall'));
  document.getElementById('tab-max-flow').addEventListener('click', () => switchTab('max-flow'));

  // Allow Enter key to add node
  document.getElementById('node-id').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddNode();
  });

  // Step-by-step buttons
  document.getElementById('btn-steps-bf').addEventListener('click', handleStepsBellmanFord);
  document.getElementById('btn-steps-fw').addEventListener('click', handleStepsFloydWarshall);
  document.getElementById('btn-steps-mf').addEventListener('click', handleStepsMaxFlow);

  // Step viewer controls
  document.getElementById('step-play-btn').addEventListener('click', () => StepViewer.togglePlay());
  document.getElementById('step-prev-btn').addEventListener('click', () => StepViewer.prev());
  document.getElementById('step-next-btn').addEventListener('click', () => StepViewer.next());
  document.getElementById('step-first-btn').addEventListener('click', () => StepViewer.first());
  document.getElementById('step-last-btn').addEventListener('click', () => StepViewer.last());
  document.getElementById('step-close-btn').addEventListener('click', () => {
    StepViewer.hide();
    clearHighlights();
  });

  // Speed buttons
  document.querySelectorAll('.step-speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.step-speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const speed = parseInt(btn.dataset.speed);
      if (!isNaN(speed)) StepViewer.setSpeed(speed);
    });
  });

  // Load example on startup
  loadExampleNetwork();
});
