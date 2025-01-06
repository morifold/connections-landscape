import './style.css';
import { generateRandomGraphData } from './data/generateGraphData';
import InputGraphData from './data/miserables.json';
import { createRoot } from 'react-dom/client';
import DemoPanel from './DemoPanel';
import ObsidianGraphData from './data/obsidian-syntomic-graph.json';

const root = createRoot(document.getElementById('demo-app'));

const graphConfig = {
  appId: 'app1',
  styleConfig: {
    TypeToFill: {
      extFrame: 'none',
      intFrame: 'none',
      interior: '#ffd166',
      coast: '#ffb703',
      shore: 'none',
      river: 'none',
    },
    heatmapColorRange: [
      [255, 255, 204],
      [199, 233, 180],
      [127, 205, 187],
      [65, 182, 196],
      [44, 127, 184],
      [37, 52, 148],
    ],
  },
};

const ObsidianGraphConfig = {
  appId: 'app2',
  styleConfig: {
    TypeToFill: {
      extFrame: 'none',
      intFrame: 'none',
      interior: '#ffcad4',
      coast: '#ffcad4',
      shore: 'none',
      river: 'none',
    },
    heatmapColorRange: [
      [255, 255, 204],
      [199, 233, 180],
      [127, 205, 187],
      [65, 182, 196],
      [44, 127, 184],
      [37, 52, 148],
    ],
  },
};

const FormattedObsidianData = {
  nodes: ObsidianGraphData.elements.nodes
    .map((node) => node.data)
    .filter((node) => node.degree),
  links: ObsidianGraphData.elements.edges.map((link) => link.data),
};

root.render(
  <div>
    <div class="demo-section-big">
      {getDemoHeader('A Knowledge Graph', 'visualizing an obsidian bank')}
      <DemoPanel
        graphConfig={ObsidianGraphConfig}
        graphData={FormattedObsidianData}
      />
    </div>

    <div class="demo-sect-small">
      {getDemoHeader(
        'Relationships',
        'relationships between characters from a novel'
      )}
      <DemoPanel
        graphConfig={graphConfig}
        graphData={InputGraphData}
        class="demo-panel-small"
      />
    </div>
    <div class="demo-sect-small">
      {getDemoHeader(
        'Dense Graph',
        'A randomly generated densely connected graph'
      )}
      <DemoPanel
        graphConfig={ObsidianGraphConfig}
        graphData={generateRandomGraphData(20)}
      />
    </div>
  </div>
);

function getDemoHeader(title, desc) {
  return (
    <div class="demo-header">
      <div class="demo-header-title">{title}</div>
      <div class="demo-header-desc">{desc}</div>
    </div>
  );
}
