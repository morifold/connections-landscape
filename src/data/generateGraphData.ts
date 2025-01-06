import { GraphData } from '../types/graph';

export const generateRandomGraphData = (nodeCount: number): GraphData => {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node${i}`,
    group: Math.floor(Math.random() * 5)
  }));

  const links = nodes.flatMap((node, i) => {
    const numLinks = Math.floor(Math.random() * 3) + 1;
    return Array.from({ length: numLinks }, () => ({
      source: node.id,
      target: `node${Math.floor(Math.random() * nodeCount)}`,
      value: Math.random() * 10
    }));
  });

  return { nodes, links };
};