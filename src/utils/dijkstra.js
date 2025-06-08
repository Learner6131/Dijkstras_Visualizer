import { fromJSON } from "postcss";
import TinyQueue from "tinyqueue";

export function dijkstra(nodes, edges, startNode) {
  const steps = [];
  const dist = {};
  const previous = {};
  const vis = new Set();
  const q = new TinyQueue([], (a, b) => a.priority - b.priority);

  for (const node of nodes) {
    dist[node] = Infinity;
    previous[node] = null;
  }
  dist[startNode] = 0;
  steps.push({ type: "update", from: startNode, to: startNode, distance: 0 });

  q.push({ node: startNode, priority: 0 });

  while (q.length > 0) {
    const { node: curr } = q.pop();

    if (!vis.has(curr)) {
      vis.add(curr);
      steps.push({ type: "visit", node: curr });

      for (const neigh of edges[curr] || []) {
        const { target, weight } = neigh;
        const newDist = dist[curr] + weight;

        if (newDist < dist[target]) {
          dist[target] = newDist;
          previous[target] = curr;
          steps.push({
            type: "update",
            from: curr,
            to: target,
            distance: newDist,
          });
          q.push({ node: target, priority: newDist });
        }
      }
    }
  }

  return { dist, previous, steps };
}
