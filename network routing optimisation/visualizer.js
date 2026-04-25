// visualizer.js — Cytoscape.js setup, render, highlight, Anime.js animation triggers

let cy = null;

/**
 * Initialize Cytoscape instance.
 * @param {string} containerId
 * @returns {object} Cytoscape instance
 */
function initCytoscape(containerId) {
  cy = cytoscape({
    container: document.getElementById(containerId),
    elements: [],
    style: [
      // Default node
      {
        selector: 'node',
        style: {
          'background-color': '#1e2a3a',
          'border-color': '#00e5ff',
          'border-width': 2,
          'color': '#e2e8f0',
          'font-family': 'Space Mono, monospace',
          'font-size': 12,
          'label': 'data(id)',
          'text-valign': 'center',
          'text-halign': 'center',
          'width': 44,
          'height': 44,
          'shape': 'roundrectangle'
        }
      },
      // Default edge
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#374151',
          'target-arrow-color': '#374151',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': 9,
          'color': '#94a3b8',
          'font-family': 'Space Mono, monospace',
          'text-rotation': 'autorotate',
          'text-margin-y': -10,
          'text-wrap': 'wrap'
        }
      },
      // Source node
      {
        selector: 'node.source',
        style: {
          'border-color': '#ff9800',
          'border-width': 3,
          'background-color': '#2a2010'
        }
      },
      // Sink node
      {
        selector: 'node.sink',
        style: {
          'border-color': '#ab47bc',
          'border-width': 3,
          'background-color': '#2a1a2e'
        }
      },
      // Bellman-Ford highlighted edge (blue)
      {
        selector: 'edge.bf-path',
        style: {
          'line-color': '#3b82f6',
          'target-arrow-color': '#3b82f6',
          'width': 3,
          'z-index': 10
        }
      },
      // Floyd-Warshall highlighted edge (teal/yellow)
      {
        selector: 'edge.fw-path',
        style: {
          'line-color': '#fbbf24',
          'target-arrow-color': '#fbbf24',
          'width': 3,
          'z-index': 10
        }
      },
      // Max Flow edge (green)
      {
        selector: 'edge.flow-path',
        style: {
          'line-color': '#00e676',
          'target-arrow-color': '#00e676',
          'width': 3,
          'z-index': 10
        }
      },
      // Bottleneck edge (red)
      {
        selector: 'edge.bottleneck',
        style: {
          'line-color': '#ef4444',
          'target-arrow-color': '#ef4444',
          'width': 4,
          'z-index': 15
        }
      },
      // BF path node highlight
      {
        selector: 'node.bf-node',
        style: {
          'border-color': '#3b82f6',
          'border-width': 3,
          'background-color': '#1a2a4a'
        }
      }
    ],
    layout: { name: 'cose', animate: true, animationDuration: 500 },
    minZoom: 0.3,
    maxZoom: 3,
    wheelSensitivity: 0.3
  });

  return cy;
}

/**
 * Re-render the full graph from Graph data.
 * @param {Graph} graph
 */
function renderGraph(graph) {
  if (!cy) return;
  cy.elements().remove();
  const elements = graph.toCytoscapeElements();
  cy.add(elements);
  cy.layout({
    name: 'cose',
    animate: true,
    animationDuration: 500,
    nodeRepulsion: function() { return 8000; },
    idealEdgeLength: function() { return 120; },
    padding: 40
  }).run();
}

/**
 * Clear all highlights, reset to default styles.
 */
function clearHighlights() {
  if (!cy) return;
  cy.elements().removeClass('source sink bf-path fw-path flow-path bottleneck bf-node');
}

/**
 * Highlight Bellman-Ford shortest path.
 * @param {string[]} pathNodes
 */
function highlightBellmanFordPath(pathNodes) {
  if (!cy || pathNodes.length < 2) return;
  clearHighlights();

  // Mark source
  const sourceNode = cy.getElementById(pathNodes[0]);
  if (sourceNode.length) sourceNode.addClass('source');

  // Highlight nodes along the path
  for (const nodeId of pathNodes) {
    const node = cy.getElementById(nodeId);
    if (node.length && nodeId !== pathNodes[0]) {
      node.addClass('bf-node');
    }
  }

  // Highlight edges along the path with staggered animation
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const edgeId = `${pathNodes[i]}-${pathNodes[i + 1]}`;
    const edge = cy.getElementById(edgeId);
    if (edge.length) {
      setTimeout(() => {
        edge.addClass('bf-path');
        // Anime.js edge pulse
        animateEdgePulse(edge, '#3b82f6');
      }, i * 250);
    }
  }
}

/**
 * Highlight Floyd-Warshall path temporarily.
 */
function highlightFloydPath(src, dst, pathNodes) {
  if (!cy || pathNodes.length < 2) return;
  clearHighlights();

  // Mark source and destination
  const srcNode = cy.getElementById(src);
  if (srcNode.length) srcNode.addClass('source');
  const dstNode = cy.getElementById(dst);
  if (dstNode.length) dstNode.addClass('sink');

  // Highlight path edges
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const edgeId = `${pathNodes[i]}-${pathNodes[i + 1]}`;
    const edge = cy.getElementById(edgeId);
    if (edge.length) {
      edge.addClass('fw-path');
    }
  }

  // Fade back after 2 seconds
  setTimeout(() => {
    clearHighlights();
  }, 2000);
}

/**
 * Highlight Max Flow edges and bottlenecks.
 */
function highlightMaxFlow(flowOnEdge, bottleneckEdges, source, sink) {
  if (!cy) return;
  clearHighlights();

  // Source and sink
  const srcNode = cy.getElementById(source);
  if (srcNode.length) srcNode.addClass('source');
  const sinkNode = cy.getElementById(sink);
  if (sinkNode.length) sinkNode.addClass('sink');

  // Color flow edges green (opacity proportional to utilization)
  for (const [from, targets] of flowOnEdge) {
    for (const [to, flow] of targets) {
      if (flow > 0) {
        const edgeId = `${from}-${to}`;
        const edge = cy.getElementById(edgeId);
        if (edge.length) {
          edge.addClass('flow-path');
          const capacity = edge.data('capacity');
          const utilization = capacity > 0 ? flow / capacity : 0;
          edge.style('opacity', Math.max(0.4, utilization));
        }
      }
    }
  }

  // Bottleneck edges — red with pulse
  for (const bn of bottleneckEdges) {
    const edgeId = `${bn.from}-${bn.to}`;
    const edge = cy.getElementById(edgeId);
    if (edge.length) {
      edge.removeClass('flow-path');
      edge.addClass('bottleneck');
      animateBottleneckPulse(edgeId);
    }
  }
}

/**
 * Animate a pulse on an edge (using CSS animation workaround since Anime.js can't directly target Cytoscape elements).
 */
function animateEdgePulse(edge, color) {
  // We simulate a pulse by toggling opacity on edge
  let opacity = 1;
  const pulseInterval = setInterval(() => {
    opacity = opacity === 1 ? 0.4 : 1;
    edge.style('opacity', opacity);
  }, 300);

  // Stop after 1.5s
  setTimeout(() => {
    clearInterval(pulseInterval);
    edge.style('opacity', 1);
  }, 1500);
}

/**
 * Animate bottleneck edge pulse continuously.
 */
let bottleneckIntervals = [];
function animateBottleneckPulse(edgeId) {
  const edge = cy.getElementById(edgeId);
  if (!edge.length) return;

  let opacity = 1;
  const interval = setInterval(() => {
    if (!edge.hasClass('bottleneck')) {
      clearInterval(interval);
      return;
    }
    opacity = opacity === 1 ? 0.3 : 1;
    edge.style('opacity', opacity);
  }, 400);

  bottleneckIntervals.push(interval);
}

function clearBottleneckAnimations() {
  bottleneckIntervals.forEach(i => clearInterval(i));
  bottleneckIntervals = [];
}

/**
 * Zoom controls.
 */
function zoomIn() {
  if (cy) cy.zoom(cy.zoom() * 1.2);
}

function zoomOut() {
  if (cy) cy.zoom(cy.zoom() / 1.2);
}

function fitToScreen() {
  if (cy) cy.fit(undefined, 40);
}
