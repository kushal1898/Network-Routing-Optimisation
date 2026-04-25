// graph.js — Graph class (nodes, edges, adjacency list, dual weights)

class Graph {
  constructor() {
    // Map<nodeId, Map<nodeId, {distance, capacity}>>
    this.adjacencyList = new Map();
  }

  addNode(id) {
    if (this.adjacencyList.has(id)) {
      throw new Error(`Node "${id}" already exists.`);
    }
    this.adjacencyList.set(id, new Map());
  }

  removeNode(id) {
    if (!this.adjacencyList.has(id)) return;
    this.adjacencyList.delete(id);
    // Remove all edges referencing this node
    for (const [, neighbors] of this.adjacencyList) {
      neighbors.delete(id);
    }
  }

  addEdge(from, to, distance, capacity) {
    if (from === to) {
      throw new Error('Self-loops are not allowed.');
    }
    if (!this.adjacencyList.has(from)) {
      throw new Error(`Node "${from}" does not exist.`);
    }
    if (!this.adjacencyList.has(to)) {
      throw new Error(`Node "${to}" does not exist.`);
    }
    // Overwrites if edge already exists
    this.adjacencyList.get(from).set(to, { distance, capacity });
  }

  removeEdge(from, to) {
    if (this.adjacencyList.has(from)) {
      this.adjacencyList.get(from).delete(to);
    }
  }

  getNodes() {
    return Array.from(this.adjacencyList.keys());
  }

  getEdges() {
    const edges = [];
    for (const [from, neighbors] of this.adjacencyList) {
      for (const [to, data] of neighbors) {
        edges.push({ from, to, distance: data.distance, capacity: data.capacity });
      }
    }
    return edges;
  }

  getNeighbors(node) {
    if (!this.adjacencyList.has(node)) return [];
    const neighbors = [];
    for (const [to, data] of this.adjacencyList.get(node)) {
      neighbors.push({ node: to, distance: data.distance, capacity: data.capacity });
    }
    return neighbors;
  }

  hasEdge(from, to) {
    return this.adjacencyList.has(from) && this.adjacencyList.get(from).has(to);
  }

  nodeCount() {
    return this.adjacencyList.size;
  }

  edgeCount() {
    let count = 0;
    for (const [, neighbors] of this.adjacencyList) {
      count += neighbors.size;
    }
    return count;
  }

  reset() {
    this.adjacencyList.clear();
  }

  toCytoscapeElements() {
    const elements = [];

    // Add nodes
    for (const nodeId of this.adjacencyList.keys()) {
      elements.push({ data: { id: nodeId } });
    }

    // Add edges
    for (const [from, neighbors] of this.adjacencyList) {
      for (const [to, data] of neighbors) {
        elements.push({
          data: {
            id: `${from}-${to}`,
            source: from,
            target: to,
            distance: data.distance,
            capacity: data.capacity,
            label: `d:${data.distance}\nbw:${data.capacity}`
          }
        });
      }
    }

    return elements;
  }
}
