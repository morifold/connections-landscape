import * as d3 from 'd3';
import { ChartDimensions, DataPoint } from '../types/chart';

export class ScatterPlot {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private dimensions: ChartDimensions;
  private data: DataPoint[];

  constructor(container: HTMLElement, data: DataPoint[]) {
    this.dimensions = {
      width: container.clientWidth,
      height: container.clientHeight,
      margin: { top: 20, right: 20, bottom: 30, left: 40 }
    };
    this.data = data;

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', this.dimensions.width)
      .attr('height', this.dimensions.height);

    this.initialize();
  }

  private initialize(): void {
    const { width, height, margin } = this.dimensions;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
      .domain(d3.extent(this.data, d => d.x) as [number, number])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(this.data, d => d.y) as [number, number])
      .range([innerHeight, 0]);

    const g = this.svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    g.append('g')
      .call(d3.axisLeft(yScale));

    // Add points
    g.selectAll('circle')
      .data(this.data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 5)
      .attr('fill', 'steelblue');
  }

  public update(newData: DataPoint[]): void {
    this.data = newData;
    this.svg.selectAll('*').remove();
    this.initialize();
  }
}