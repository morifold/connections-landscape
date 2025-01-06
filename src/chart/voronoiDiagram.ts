import * as d3 from 'd3';
import { ChartDimensions, DataPoint } from '../types/chart';
import { getColorScale } from '../utils/colors';

const DEFAULT_STYLE_CONFIG = {
  TypeToFill: {
    extFrame: 'none',
    intFrame: 'none',
    interior: '#c9ada7',
    coast: '#9a8c98',
    shore: 'none',
  },
};

export class VoronoiDiagram {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private dimensions: ChartDimensions;
  private data: DataPoint[];
  private colorScale: d3.ScaleOrdinal<string, string>;
  private voronoi: Object;
  private frameData;

  constructor(
    container: HTMLElement,
    data: DataPoint[],
    worldDimensions,
    styleConfig
  ) {
    this.styleConfig = styleConfig || DEFAULT_STYLE_CONFIG;
    this.worldDimensions = worldDimensions;
    this.dimensions = {
      width: container.clientWidth,
      height: container.clientHeight,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    };
    this.data = data;
    this.colorScale = getColorScale();
    this.voronoi = null;
    this.nodeIndex = {};
    this.frameData = {};
    const { width, height } = this.dimensions;
    this.svg = d3
      .select(container)
      .append('svg')
      .attr('width', this.dimensions.width)
      .attr('height', this.dimensions.height);
    // .attr('viewBox', [-width / 2, -height / 2, width, height]);

    this.initialize();
  }

  private initialize(): void {
    const { width, height, margin } = this.dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = this.svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain([0, this.worldDimensions.x])
      .range([0, innerWidth]);
    const yScale = d3
      .scaleLinear()
      .domain([0, this.worldDimensions.y])
      .range([innerHeight, 0]);
    this.xScale = xScale;
    this.yScale = yScale;
    // Create Voronoi diagram
    const delaunay = d3.Delaunay.from(
      this.data,
      (d) => xScale(d.x),
      (d) => yScale(d.y)
    );
    const voronoi = delaunay.voronoi([0, 0, innerWidth, innerHeight]);

    // Draw Voronoi cells
    g.append('g')
      .selectAll('path')
      .data(this.data)
      .join('path')
      .attr('d', (_, i) => voronoi.renderCell(i))
      .attr(
        'fill',
        (node) => this.styleConfig.TypeToFill[node.cellType] || 'red'
      )
      .attr('stroke', (d) => {
        if (d.cellType === 'interior' || d.cellType === 'coast') {
          return 'rgba(0, 0, 0, .1)';
        }
        return 'none';
      })
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8);

    // Add points
    g.append('g')
      .selectAll('circle')
      .data(this.data)
      .join('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 0.5)
      .attr('fill', (d) => d.fill || 'rgba(0, 0, 0, 0.001)')
      .each((d, idx) => {
        this.nodeIndex[idx] = d;
        d.voIdx = idx;
      });

    this.voronoi = voronoi;
  }

  public update(newData: DataPoint[], numPrefixPoints): void {
    this.data = newData;
    if (numPrefixPoints) {
      this.frameData.numPrefixPoints = numPrefixPoints;
    }
    this.svg.selectAll('*').remove();
    this.initialize();
  }

  public redraw() {
    this.svg.selectAll('*').remove();
    this.initialize();
  }

  public getVoronoi() {
    return this.voronoi;
  }
  public getNodeByIdx(idx) {
    return this.nodeIndex[idx];
  }
  public getInteriorNode(interiorIdx, node) {
    return this.nodeIndex[this.frameData.numPrefixPoints + interiorIdx];
  }
  public getInteriorNodeIndex(interiorIdx) {
    return this.frameData.numPrefixPoints + interiorIdx;
  }
  public getCoordinatePoints({ x, y }) {
    return {
      x: x,
      y: y,
    };
  }
  public getSvg() {
    return this.svg;
  }
  public insertAndRedraw(points) {
    this.update([
      ...this.data,
      ...points.map((point) => ({
        ...point,
        x: this.xScale.invert(point.x - this.dimensions.margin.left),
        y: this.yScale.invert(point.y - this.dimensions.margin.top),
      })),
    ]);
  }
  public getScaledPoint({ x, y }) {
    return {
      x: this.xScale(x) + this.dimensions.margin.left,
      y: this.yScale(y) + this.dimensions.margin.top,
    };
  }
  public getDimensions() {
    return this.dimensions;
  }
  public getData() {
    return this.data;
  }
}
