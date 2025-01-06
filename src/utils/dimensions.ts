import { ChartDimensions } from '../types/chart';

export const getChartDimensions = (container: HTMLElement): ChartDimensions => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  return {
    width,
    height,
    margin: {
      top: 20,
      right: 20,
      bottom: 30,
      left: 40
    }
  };
};