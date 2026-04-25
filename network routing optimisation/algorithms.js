// algorithms.js — Bellman-Ford, Floyd-Warshall, Edmonds-Karp implementations
// Each algorithm now records step-by-step execution traces for visualization.

/**
 * Bellman-Ford single-source shortest path algorithm.
 * Records every edge relaxation attempt as a step.
 * @param {Graph} graph
 * @param {string} source
 * @returns {{ distances, predecessors, hasNegativeCycle, getPath, steps }}
 */
function bellmanFord(graph, source) {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();
  const distances = {};
  const predecessors = {};
  const steps = [];

  // Step 0: Initialization
  for (const node of nodes) {
    distances[node] = Infinity;
    predecessors[node] = null;
  }
  distances[source] = 0;

  steps.push({
    type: 'init',
    iteration: 0,
    description: `Initialize: set dist(${source}) = 0, all others = ∞`,
    distances: { ...distances },
    predecessors: { ...predecessors },
    highlightNode: source,
    highlightEdge: null,
    relaxed: false
  });

  // Relax V-1 times
  const V = nodes.length;
  for (let i = 0; i < V - 1; i++) {
    let anyRelaxed = false;
    for (const edge of edges) {
      const oldDist = distances[edge.to];
      const newDist = distances[edge.from] + edge.distance;
      const relaxed = (distances[edge.from] !== Infinity && newDist < distances[edge.to]);

      if (relaxed) {
        distances[edge.to] = newDist;
        predecessors[edge.to] = edge.from;
        anyRelaxed = true;
      }

      steps.push({
        type: 'relax',
        iteration: i + 1,
        edge: { from: edge.from, to: edge.to, distance: edge.distance },
        description: relaxed
          ? `Iteration ${i + 1}: Relax ${edge.from}→${edge.to} (d=${edge.distance}). dist(${edge.to}): ${oldDist === Infinity ? '∞' : oldDist} → ${newDist}`
          : `Iteration ${i + 1}: Check ${edge.from}→${edge.to} (d=${edge.distance}). dist(${edge.from})${distances[edge.from] === Infinity ? '=∞' : '=' + distances[edge.from]} + ${edge.distance} ${distances[edge.from] === Infinity ? '' : '= ' + newDist} ≥ dist(${edge.to})=${oldDist === Infinity ? '∞' : oldDist}. No change.`,
        distances: { ...distances },
        predecessors: { ...predecessors },
        highlightEdge: { from: edge.from, to: edge.to },
        highlightNode: edge.to,
        relaxed
      });
    }

    if (!anyRelaxed) {
      steps.push({
        type: 'early-stop',
        iteration: i + 1,
        description: `Iteration ${i + 1}: No relaxations occurred — algorithm converged early.`,
        distances: { ...distances },
        predecessors: { ...predecessors },
        highlightEdge: null,
        highlightNode: null,
        relaxed: false
      });
      break;
    }
  }

  // Detect negative cycle
  let hasNegativeCycle = false;
  for (const edge of edges) {
    if (distances[edge.from] !== Infinity && distances[edge.from] + edge.distance < distances[edge.to]) {
      hasNegativeCycle = true;
      break;
    }
  }

  if (hasNegativeCycle) {
    steps.push({
      type: 'negative-cycle',
      iteration: V,
      description: `⚠ Negative cycle detected on pass ${V}!`,
      distances: { ...distances },
      predecessors: { ...predecessors },
      highlightEdge: null,
      highlightNode: null,
      relaxed: false
    });
  }

  steps.push({
    type: 'done',
    iteration: -1,
    description: `✓ Bellman-Ford complete. Final shortest distances from ${source}.`,
    distances: { ...distances },
    predecessors: { ...predecessors },
    highlightEdge: null,
    highlightNode: null,
    relaxed: false
  });

  // Path reconstruction
  function getPath(destination) {
    if (distances[destination] === Infinity) return [];
    const path = [];
    let current = destination;
    const visited = new Set();
    while (current !== null) {
      if (visited.has(current)) return [];
      visited.add(current);
      path.unshift(current);
      current = predecessors[current];
    }
    return path;
  }

  return { distances, predecessors, hasNegativeCycle, getPath, steps };
}

/**
 * Floyd-Warshall all-pairs shortest path algorithm.
 * Records every (k, i, j) check as a step.
 * @param {Graph} graph
 * @returns {{ dist, next, nodes, getPath, steps }}
 */
function floydWarshall(graph) {
  const nodes = graph.getNodes();
  const V = nodes.length;
  const nodeIndex = {};
  nodes.forEach((n, i) => nodeIndex[n] = i);

  // Init dist and next matrices
  const dist = Array.from({ length: V }, () => Array(V).fill(Infinity));
  const next = Array.from({ length: V }, () => Array(V).fill(null));

  for (let i = 0; i < V; i++) {
    dist[i][i] = 0;
  }

  const edges = graph.getEdges();
  for (const edge of edges) {
    const i = nodeIndex[edge.from];
    const j = nodeIndex[edge.to];
    dist[i][j] = edge.distance;
    next[i][j] = nodes[j];
  }

  const steps = [];

  // Capture initialization snapshot
  steps.push({
    type: 'init',
    description: `Initialize distance matrix from edges. ${V} nodes, ${edges.length} edges.`,
    k: null, i: null, j: null,
    kNode: null, iNode: null, jNode: null,
    dist: dist.map(r => [...r]),
    updated: false
  });

  // Triple loop
  for (let k = 0; k < V; k++) {
    let anyUpdated = false;
    for (let i = 0; i < V; i++) {
      for (let j = 0; j < V; j++) {
        if (i === k || j === k || i === j) continue;
        const throughK = dist[i][k] + dist[k][j];
        const updated = (dist[i][k] !== Infinity && dist[k][j] !== Infinity && throughK < dist[i][j]);
        const oldDist = dist[i][j];

        if (updated) {
          dist[i][j] = throughK;
          next[i][j] = next[i][k];
          anyUpdated = true;
        }

        // Only record steps where something interesting happens (updated) or
        // record a summary per k to avoid explosion. For small graphs record all.
        if (V <= 8 || updated) {
          steps.push({
            type: 'check',
            description: updated
              ? `k=${nodes[k]}: dist(${nodes[i]},${nodes[j]}): ${oldDist === Infinity ? '∞' : oldDist} → ${throughK} via ${nodes[k]}`
              : `k=${nodes[k]}: dist(${nodes[i]},${nodes[j]}) = ${oldDist === Infinity ? '∞' : oldDist}. Through ${nodes[k]}: ${dist[i][k] === Infinity ? '∞' : dist[i][k]}+${dist[k][j] === Infinity ? '∞' : dist[k][j]}=${dist[i][k] === Infinity || dist[k][j] === Infinity ? '∞' : throughK}. No improvement.`,
            k, i, j,
            kNode: nodes[k], iNode: nodes[i], jNode: nodes[j],
            dist: dist.map(r => [...r]),
            updated
          });
        }
      }
    }

    // Summary step after each k
    steps.push({
      type: 'k-complete',
      description: `Intermediate node k=${nodes[k]} complete. ${anyUpdated ? 'Updates were made.' : 'No updates.'}`,
      k, i: null, j: null,
      kNode: nodes[k], iNode: null, jNode: null,
      dist: dist.map(r => [...r]),
      updated: anyUpdated
    });
  }

  steps.push({
    type: 'done',
    description: `✓ Floyd-Warshall complete. All-pairs shortest paths computed.`,
    k: null, i: null, j: null,
    kNode: null, iNode: null, jNode: null,
    dist: dist.map(r => [...r]),
    updated: false
  });

  // Path reconstruction
  function getPath(src, dst) {
    const si = nodeIndex[src];
    const di = nodeIndex[dst];
    if (next[si][di] === null) return [];
    const path = [src];
    let current = src;
    const visited = new Set();
    while (current !== dst) {
      if (visited.has(current)) return [];
      visited.add(current);
      current = next[nodeIndex[current]][di];
      if (current === null) return [];
      path.push(current);
    }
    return path;
  }

  return { dist, next, nodes, getPath, steps };
}

/**
 * Edmonds-Karp (BFS-based Ford-Fulkerson) max flow algorithm.
 * Records each BFS search and augmenting path as steps.
 * @param {Graph} graph
 * @param {string} source
 * @param {string} sink
 * @returns {{ maxFlow, flowOnEdge, bottleneckEdges, augmentingPaths, steps }}
 */
function edmondsKarp(graph, source, sink) {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();
  const steps = [];

  // Build residual graph
  const residual = new Map();
  for (const node of nodes) {
    residual.set(node, new Map());
  }
  for (const edge of edges) {
    residual.get(edge.from).set(edge.to,
      (residual.get(edge.from).get(edge.to) || 0) + edge.capacity
    );
    if (!residual.get(edge.to).has(edge.from)) {
      residual.get(edge.to).set(edge.from, 0);
    }
  }

  steps.push({
    type: 'init',
    description: `Initialize residual graph. Source: ${source}, Sink: ${sink}. ${edges.length} edges.`,
    path: null,
    bottleneck: null,
    totalFlow: 0,
    residualSnapshot: snapshotResidual(residual),
    bfsVisited: []
  });

  let maxFlow = 0;
  const augmentingPaths = [];
  let iteration = 0;

  // BFS to find augmenting path
  function bfs() {
    const parent = new Map();
    parent.set(source, null);
    const queue = [source];
    const visited = [source];

    while (queue.length > 0) {
      const u = queue.shift();
      if (u === sink) {
        const path = [];
        let current = sink;
        while (current !== null) {
          path.unshift(current);
          current = parent.get(current);
        }
        return { path, visited };
      }
      const neighbors = residual.get(u);
      if (neighbors) {
        for (const [v, cap] of neighbors) {
          if (!parent.has(v) && cap > 0) {
            parent.set(v, u);
            queue.push(v);
            visited.push(v);
          }
        }
      }
    }
    return { path: null, visited };
  }

  // Main loop
  let bfsResult;
  while ((bfsResult = bfs()) && bfsResult.path !== null) {
    iteration++;
    const path = bfsResult.path;

    // Record BFS step
    steps.push({
      type: 'bfs',
      description: `Iteration ${iteration}: BFS found augmenting path: ${path.join(' → ')}`,
      path: [...path],
      bottleneck: null,
      totalFlow: maxFlow,
      residualSnapshot: snapshotResidual(residual),
      bfsVisited: bfsResult.visited
    });

    // Find bottleneck
    let bottleneck = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      const cap = residual.get(path[i]).get(path[i + 1]);
      bottleneck = Math.min(bottleneck, cap);
    }

    steps.push({
      type: 'bottleneck',
      description: `Iteration ${iteration}: Bottleneck capacity = ${bottleneck} Mbps along path ${path.join(' → ')}`,
      path: [...path],
      bottleneck,
      totalFlow: maxFlow,
      residualSnapshot: snapshotResidual(residual),
      bfsVisited: []
    });

    // Update residual
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i], v = path[i + 1];
      residual.get(u).set(v, residual.get(u).get(v) - bottleneck);
      residual.get(v).set(u, residual.get(v).get(u) + bottleneck);
    }

    maxFlow += bottleneck;
    augmentingPaths.push(path);

    steps.push({
      type: 'augment',
      description: `Iteration ${iteration}: Pushed ${bottleneck} Mbps. Total flow = ${maxFlow} Mbps.`,
      path: [...path],
      bottleneck,
      totalFlow: maxFlow,
      residualSnapshot: snapshotResidual(residual),
      bfsVisited: []
    });
  }

  steps.push({
    type: 'no-path',
    description: `BFS found no more augmenting paths. Algorithm terminates.`,
    path: null,
    bottleneck: null,
    totalFlow: maxFlow,
    residualSnapshot: snapshotResidual(residual),
    bfsVisited: bfsResult ? bfsResult.visited : []
  });

  steps.push({
    type: 'done',
    description: `✓ Edmonds-Karp complete. Maximum flow = ${maxFlow} Mbps.`,
    path: null,
    bottleneck: null,
    totalFlow: maxFlow,
    residualSnapshot: snapshotResidual(residual),
    bfsVisited: []
  });

  // Compute flow on each original edge
  const flowOnEdge = new Map();
  for (const node of nodes) {
    flowOnEdge.set(node, new Map());
  }
  for (const edge of edges) {
    const originalCapacity = edge.capacity;
    const remainingCapacity = residual.get(edge.from).get(edge.to) || 0;
    const flow = originalCapacity - remainingCapacity;
    flowOnEdge.get(edge.from).set(edge.to, Math.max(0, flow));
  }

  // Find bottleneck (saturated) edges
  const bottleneckEdges = [];
  for (const edge of edges) {
    const flow = flowOnEdge.get(edge.from).get(edge.to) || 0;
    if (flow > 0 && flow >= edge.capacity) {
      bottleneckEdges.push({
        from: edge.from,
        to: edge.to,
        capacity: edge.capacity,
        flow: flow
      });
    }
  }

  return { maxFlow, flowOnEdge, bottleneckEdges, augmentingPaths, steps };
}

/**
 * Helper: snapshot the residual graph as a plain object for step recording.
 */
function snapshotResidual(residual) {
  const snap = {};
  for (const [node, neighbors] of residual) {
    snap[node] = {};
    for (const [target, cap] of neighbors) {
      if (cap > 0) snap[node][target] = cap;
    }
  }
  return snap;
}
