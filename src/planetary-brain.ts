import { ForceGraph } from './chart/forceGraph';
import { VoronoiDiagram } from './chart/voronoiDiagram';
import { generateVoronoiData } from './data/generateVoronoiData';
import {
  generateInteriorBoundaryPoints,
  generateExteriorBoundaryPoints,
} from './dual-mesh/create.ts';
import * as d3 from 'd3';
import {
  Deck,
  MapView,
  LinearInterpolator,
  COORDINATE_SYSTEM,
} from '@deck.gl/core';
import {
  BitmapLayer,
  ArcLayer,
  ScatterplotLayer,
  LineLayer,
} from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { getHighResImageFromSvg, insertDiv } from './utils/misc';

const worldDimensions = {
  x: 100,
  y: 50,
};

const defaultColorRange = [
  [213, 62, 79],
  [252, 141, 89],
  [254, 224, 139],
  [230, 245, 152],
  [153, 213, 148],
  [50, 136, 189],
];

export function createVis(config, data, parentContainer) {
  setupGraph(config, data, setupMapVis, parentContainer);
}

function setupMapVis(
  img,
  { graphData, voronoiDiagram, appElem, config: { styleConfig, mapVisConfig } }
) {
  const scaleFactor = voronoiDiagram.getDimensions().width / img.width;
  console.log('scale', scaleFactor);
  const hoverState = {
    hoveredLinkIndex: null,
  };
  const mapDims = {
    W: img.width,
    H: img.height,
  };
  const landWidth = voronoiDiagram.getDimensions().width / 100;
  const landHeight = voronoiDiagram.getDimensions().height / 100;
  const coordBounds = {
    left: -landWidth,
    bottom: -landHeight,
    right: landWidth,
    top: landHeight,
  };
  const bitmapLayer = new BitmapLayer({
    id: 'BitmapLayer',
    bounds: [
      coordBounds.left,
      coordBounds.bottom,
      coordBounds.right,
      coordBounds.top,
    ],
    image: img,
    pickable: true,
    _imageCoordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  });

  const coordsHash = {};

  const view = new MapView({
    id: 'view',
    x: 0,
    y: 0,
    width: mapDims.W * scaleFactor,
    height: mapDims.H * scaleFactor,
  });

  const deck = new Deck({
    views: view,
    initialViewState: {
      longitude: 0,
      latitude: 0,
      zoom: 1,
    },
    controller: true,
    layers: [bitmapLayer],
    onClick: mapVisConfig && mapVisConfig.onClick,
    parent: appElem.querySelector('.mapview-container'),
  });

  setTimeout(onAfterRender, 0);

  function onAfterRender() {
    const { longitude, latitude, zoom } = deck.getViewports()[0].fitBounds([
      [coordBounds.left, coordBounds.bottom],
      [coordBounds.right, coordBounds.top],
    ]);

    deck.setProps({
      initialViewState: {
        longitude,
        latitude,
        zoom,
      },
    });

    const voronoi = voronoiDiagram.getVoronoi();
    const arcLayer = createArcLayer();

    const heatmapLayer = new HeatmapLayer({
      id: 'HeatmapLayer',
      data: graphData.nodes,

      aggregation: 'SUM',
      getPosition: (node) =>
        getCoords(voronoiDiagram.getInteriorNode(node.index)),
      getWeight: (node) => node.vx,
      radiusPixels: 100,
      colorRange:
        (styleConfig && styleConfig.heatmapColorRange) || defaultColorRange,
    });

    const scatterLayer = new ScatterplotLayer({
      id: 'ScatterplotLayer',
      data: graphData.nodes,

      stroked: true,
      getPosition: (node) =>
        getCoords(voronoiDiagram.getInteriorNode(node.index)),
      getRadius: (d) => 500,
      getFillColor: [255, 140, 0, 10],
      getLineColor: [0, 0, 0],
      getLineWidth: 1,
      radiusScale: 6,
      pickable: true,
      autoHighlight: true,
    });
    const lineLayer = createLineLayer();
    deck.setProps({
      layers: [bitmapLayer, lineLayer, arcLayer, heatmapLayer, scatterLayer],
      onHover: ({ layer, object }) => {
        if (layer && layer.id === 'ArcLayer') {
          if (object && hoverState.hoveredLinkIndex !== object.index) {
            hoverState.hoveredLinkIndex = object.index;
            deck.setProps({
              layers: [
                bitmapLayer,
                lineLayer,
                createArcLayer(),
                heatmapLayer,
                scatterLayer,
              ],
            });
          }
        }
      },
    });

    // animate to initial camera pos
    setTimeout(() => {
      deck.setProps({
        initialViewState: {
          longitude,
          latitude,
          zoom,
          pitch: 80,
          transitionDuration: 500,
          transitionInterpolator: new LinearInterpolator(),
        },
      });
    }, 200);

    function getCoords(node) {
      if (coordsHash[node.index]) {
        return coordsHash[node.index];
      }
      const { x, y } = node;
      const viewport = deck.getViewports()[0];
      const baseCoords = [
        (x / worldDimensions.x) * viewport.width,
        (y / worldDimensions.y) * viewport.height,
      ];

      const newCoords = viewport.unproject(baseCoords, {
        targetZ: viewport.zoom,
        topLeft: false,
      });

      coordsHash[node.index] = newCoords;
      return newCoords;
    }

    function isLinkToNeighbor({ source, target }) {
      const sourceNode = voronoiDiagram.getInteriorNode(source.index);
      const targetNode = voronoiDiagram.getInteriorNode(target.index);
      const overlaps = [];
      for (let neighborIdx of voronoi.neighbors(sourceNode.voIdx)) {
        if (neighborIdx === targetNode.voIdx) {
          overlaps.push([neighborIdx]);
          break;
        }
      }

      if (overlaps.length) {
        return false;
      }

      for (let neighborIdx of voronoi.neighbors(targetNode.voIdx)) {
        if (neighborIdx === sourceNode.voIdx) {
          overlaps.push([neighborIdx]);
          break;
        }
      }

      if (overlaps.length) {
        return false;
      }

      return true;
    }

    function createArcLayer() {
      return new ArcLayer({
        id: 'ArcLayer',
        data: graphData.links.filter(isLinkToNeighbor),
        getSourcePosition: ({ source }) =>
          getCoords(voronoiDiagram.getInteriorNode(source.index, source)),
        getTargetPosition: ({ target }) =>
          getCoords(voronoiDiagram.getInteriorNode(target.index, target)),
        getSourceColor: (d) => [255, 0, 0, 10],
        getTargetColor: (d) => [200, 0, 200, 150],
        getTilt: 1,
        getWidth: (link) => {
          if (link.index === hoverState.hoveredLinkIndex) {
            return 10;
          }
          return 2;
        },
        getHeight: 0.5,
        pickable: true,
        greatCircle: true,
        autoHighlight: true,
      });
    }

    function createLineLayer() {
      return new LineLayer({
        id: 'LineLayer',
        data: graphData.links.filter((link) => !isLinkToNeighbor(link)),
        getColor: (d) => [d.source.id.length * 4, 140, 0],
        getSourcePosition: ({ source }) =>
          getCoords(voronoiDiagram.getInteriorNode(source.index, source)),
        getTargetPosition: ({ target }) =>
          getCoords(voronoiDiagram.getInteriorNode(target.index, target)),
        getWidth: 3,
        pickable: true,
      });
    }
  }
}

function setupGraph(
  config,
  initialGraphData,
  renderedCallback,
  parentContainer = document.body
) {
  const appElem = insertDiv(
    {
      id: `pb-app-${config.appId}`,
      className: 'pb-app-container',
    },
    parentContainer
  );

  appElem.innerHTML = `
    <div class="force-graph-container chart-container"></div>
    <div class="voronoi-container chart-container"></div>
    <div class="concealer"></div>
    <div class="mapview-container"></div>
  `;

  const forceContainer = appElem.querySelector<HTMLDivElement>(
    '.force-graph-container'
  );

  const forceGraph = new ForceGraph(forceContainer, initialGraphData);

  const AdjacencyMatrix = {};

  const ValenceDict = {};

  initialGraphData.links.forEach((link) => {
    if (AdjacencyMatrix[link.source.id]) {
      if (AdjacencyMatrix[link.source.id][link.target.id]) {
        AdjacencyMatrix[link.source.id][link.target.id].push(link);
      } else {
        AdjacencyMatrix[link.source.id][link.target.id] = [link];
        bumpValence(link.source.id);
        bumpValence(link.target.id);
      }
    } else {
      AdjacencyMatrix[link.source.id] = {
        [link.target.id]: [link],
      };
      bumpValence(link.source.id);
      bumpValence(link.target.id);
    }
  });

  function bumpValence(id) {
    if (ValenceDict[id]) {
      ValenceDict[id]++;
    } else {
      ValenceDict[id] = 1;
    }
  }

  function getValence(x) {
    return ValenceDict[x] || 0;
  }

  function areLinked(x, y) {
    return x && y && (linkExists(x, y) || linkExists(y, x));
  }

  function linkExists(x, y) {
    return !!(AdjacencyMatrix[x] && AdjacencyMatrix[x][y]);
  }

  console.log('adj', AdjacencyMatrix);

  // Initialize Voronoi Diagram
  const voronoiContainer =
    document.querySelector<HTMLDivElement>('.voronoi-container')!;
  const initialVoronoiData = generateVoronoiData(20);
  const voronoiDiagram = new VoronoiDiagram(
    voronoiContainer,
    initialVoronoiData,
    worldDimensions,
    config.styleConfig
  );
  const boundarySpacing = 3 * Math.sqrt(2);
  const bounds = { left: 10, top: 10, width: 100, height: 50 }; // left,top must be 0 for poisson
  const renderingState = {};

  const extFramePts = generateExteriorBoundaryPoints(
    bounds,
    boundarySpacing
  ).map(([x, y], idx) => ({ x, y, cellType: 'extFrame', voIdx: idx }));
  const intFramePts = generateInteriorBoundaryPoints(
    bounds,
    boundarySpacing
  ).map(([x, y], idx) => ({
    x,
    y,
    cellType: 'intFrame',
    voIdx: extFramePts.length + idx,
  }));

  const timer = {
    time: 0,
  };
  forceGraph.setTickCallback(() => {
    if (forceGraph.getAlpha() > 0.5) {
      return;
    }
    forceGraph.stopSimulation();

    const containerSize = {
      x: forceContainer.clientWidth,
      y: forceContainer.clientHeight,
    };
    // if (renderingState.rendered || renderingState.rendering) {
    //   return;
    // }
    const vironoiGraph = forceGraph.getData();
    // gets voronoi points from force points
    const voronoiPts = vironoiGraph.nodes.map((node) => ({
      ...node,
      x: (node.x / containerSize.x + 0.5) * worldDimensions.x,
      y: (-node.y / containerSize.y + 0.5) * worldDimensions.y,
      cellType: 'interior',
    }));
    const numPrefixPoints = extFramePts.length + intFramePts.length;
    voronoiDiagram.update(
      [...extFramePts, ...intFramePts, ...voronoiPts],
      numPrefixPoints
    );

    const voronoiContainerSize = {
      x: forceContainer.clientWidth,
      y: forceContainer.clientHeight,
    };

    // let voronoi do a round of positioning then compute boundary + add new nodes (another layer of rendering)
    setTimeout(() => {
      const voronoi = voronoiDiagram.getVoronoi();
      const coastCellDict = {};

      const coastCells = [];

      if (!voronoi) {
        return;
      }

      intFramePts.forEach((pt) => {
        voronoi.neighbors(pt.voIdx).forEach((neighborIdx) => {
          const neighbor = voronoiDiagram.getNodeByIdx(neighborIdx);
          if (neighbor && neighbor.cellType === 'interior') {
            if (coastCellDict[neighborIdx]) {
              return;
            }
            coastCellDict[neighborIdx] = neighbor;

            coastCells.push(neighbor);
            neighbor.cellType = 'coast';
          }
        });
      });

      if (!coastCells.length) {
        return;
      }

      const coastline = d3.path();
      const firstCell = coastCells[0];
      const firstCellCoords = voronoiDiagram.getScaledPoint(firstCell);

      coastline.moveTo(firstCellCoords.x, firstCellCoords.y);
      coastCells.forEach((cell) => {
        const { x, y } = voronoiDiagram.getScaledPoint(cell);
        coastline.lineTo(x, y);
      });
      coastline.closePath();
      voronoiDiagram.redraw();

      const coastPath = voronoiDiagram
        .getSvg()
        .append('path')
        .attr('d', coastline.toString())
        .attr('stroke', 'red')
        .attr('stroke-width', 5)
        .attr('fill', 'none');

      // Create coast
      const bbox = coastPath.node().getBBox();
      const xCenter = bbox.width / 2 + bbox.x;
      const yCenter = bbox.height / 2 + bbox.y;

      const scale = 1.5;
      const offsetX = (1 - scale) * xCenter;
      const offsetY = (1 - scale) * yCenter;

      coastPath.attr(
        'transform',
        `translate(${offsetX}, ${offsetY}) scale(${scale})`
      );

      const coastSvgElem = coastPath.node();
      const transformMatrix =
        coastSvgElem.transform.baseVal.consolidate().matrix;

      const totalLength = coastSvgElem.getTotalLength();

      let currentLength = 0;
      const shoreCells = [];
      while (currentLength < totalLength) {
        const { x, y } = coastSvgElem
          .getPointAtLength(currentLength)
          .matrixTransform(transformMatrix);
        const shoreCell = {
          x,
          y,
          cellType: 'shore',
        };
        shoreCells.push(shoreCell);
        currentLength += boundarySpacing * 5;
      }

      voronoiDiagram.insertAndRedraw(shoreCells);

      const riverCells = [];

      function getScaledCell(cell) {
        return {
          ...cell,
          x: (cell.x / worldDimensions.x) * containerSize.x,
          y: (cell.y / worldDimensions.y) * containerSize.y,
        };
      }
      const includedCellTypes = {
        interior: 1,
        // coast: 1,
      };
      voronoiDiagram.getData().forEach((pt) => {
        if (!includedCellTypes[pt.cellType] || getValence(pt.id) >= 2) {
          return;
        }
        const neighbors = voronoi.neighbors(
          voronoiDiagram.getInteriorNodeIndex(pt.index)
        );

        neighbors.forEach((neighborIdx) => {
          const neighbor = voronoiDiagram.getNodeByIdx(neighborIdx);
          if (getValence(neighbor.id) >= 2 || !(pt.id && neighbor.id)) {
            return;
          }
          if (!areLinked(pt.id, neighbor.id)) {
            if (Math.random() > 0.5) {
              return;
            }
            const dx = neighbor.x - pt.x;
            const dy = neighbor.y - pt.y;
            const riverCell1 = getScaledCell({
              x: pt.x + dx / 2,
              y: pt.y + dy / 2,
              cellType: 'river',
            });
            const riverCell2 = getScaledCell({
              x: pt.x + (dx / 4) * (Math.random() - 0.5),
              y: pt.y + (dy / 4) * (Math.random() - 0.5),
              cellType: 'river',
            });

            const riverCell3 = getScaledCell({
              x: pt.x + (dx / 4) * (Math.random() - 0.5),
              y: pt.y + (dy / 4) * (Math.random() - 0.5),
              cellType: 'river',
            });

            riverCells.push(riverCell1);
            riverCells.push(riverCell2);
            riverCells.push(riverCell3);
          }
        });
      });

      voronoiDiagram.insertAndRedraw(riverCells);

      renderingState.rendering = true;

      setTimeout(() => {
        if (renderingState.rendered) {
          return;
        }
        console.log('last render');
        const svgElement = voronoiDiagram.getSvg().node();
        getHighResImageFromSvg(voronoiDiagram.getDimensions(), svgElement, 10)
          .then((img) => {
            renderingState.rendered = true;

            renderedCallback(img, {
              graphData: forceGraph.getData(),
              voronoiDiagram,
              voronoiContainerSize,
              appElem,
              config,
            });
            // Use the img object as needed
          })
          .catch((error) => console.error('Error:', error));
      }, 300);
    }, 0);
  });
}
