import * as d3 from 'd3';

export const getColorScale = () => {
  return d3.scaleOrdinal(d3.schemeCategory10);
};