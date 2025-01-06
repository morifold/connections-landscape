import * as d3 from 'd3';
import {
  GraphData,
  ForceSimulationNode,
  ChartDimensions,
} from '../types/graph';
import { getColorScale } from '../utils/colors';

export class ForceGraph {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private simulation: d3.Simulation<
    ForceSimulationNode,
    d3.SimulationLinkDatum<ForceSimulationNode>
  >;
  private dimensions: ChartDimensions;
  private data: GraphData;
  private colorScale: d3.ScaleOrdinal<string, string>;

  constructor(container: HTMLElement, data: GraphData) {
    this.dimensions = {
      width: container.clientWidth,
      height: container.clientHeight,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    };
    this.data = data;
    this.colorScale = getColorScale();
    const { width, height } = this.dimensions;
    this.svg = d3
      .select(container)
      .append('svg')
      .attr('width', this.dimensions.width)
      .attr('height', this.dimensions.height)
      .attr('viewBox', [-width / 2, -height / 2, width, height]);

    this.simulation = d3
      .forceSimulation<ForceSimulationNode>()
      .force(
        'link',
        d3
          .forceLink<
            ForceSimulationNode,
            d3.SimulationLinkDatum<ForceSimulationNode>
          >()
          .id((d) => d.id)
      )
      .force('charge', d3.forceManyBody().strength(-50))
      .force('x', d3.forceX())
      .force('y', d3.forceY());

    // .force(
    //   'center',
    //   d3.forceCenter(this.dimensions.width / 2, this.dimensions.height / 2)
    // );

    this.initialize();
  }

  private initialize(): void {
    const links = this.svg
      .append('g')
      .selectAll('line')
      .data(this.data.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.value));

    const nodes = this.svg
      .append('g')
      .selectAll('circle')
      .data(this.data.nodes)
      .enter()
      .append('circle')
      .attr('r', 5)
      .attr('fill', (d) => d.group && this.colorScale(d.group.toString()))
      .call(this.drag());

    nodes.append('title').text((d) => d.id);

    this.simulation
      .nodes(this.data.nodes as ForceSimulationNode[])
      .on('tick', () => {
        links
          .attr('x1', (d) => (d.source as ForceSimulationNode).x!)
          .attr('y1', (d) => (d.source as ForceSimulationNode).y!)
          .attr('x2', (d) => (d.target as ForceSimulationNode).x!)
          .attr('y2', (d) => (d.target as ForceSimulationNode).y!);

        nodes.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);
        if (this.tickCallback) {
          this.tickCallback();
        }
      });

    const linkForce =
      this.simulation.force<
        d3.ForceLink<
          ForceSimulationNode,
          d3.SimulationLinkDatum<ForceSimulationNode>
        >
      >('link');
    if (linkForce) {
      console.log('links are', this.data.links);
      linkForce.links(this.data.links);
    }
  }
  public setTickCallback(tickCallback) {
    this.tickCallback = tickCallback;
  }
  private drag() {
    const dragstarted = (event: any, d: any) => {
      if (!event.active) this.simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    };

    const dragged = (event: any, d: any) => {
      d.fx = event.x;
      d.fy = event.y;
    };

    const dragended = (event: any, d: any) => {
      if (!event.active) this.simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    };

    return d3
      .drag<SVGCircleElement, ForceSimulationNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  public update(newData: GraphData): void {
    this.data = newData;
    this.svg.selectAll('*').remove();
    this.simulation.stop();
    this.initialize();
    this.simulation.restart();
  }

  public getData(): GraphData {
    return this.data;
  }
  public getAlpha() {
    return this.simulation.alpha();
  }
  public stopSimulation() {
    this.simulation.stop();
  }
}
