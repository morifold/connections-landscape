import { DataPoint } from '../types/chart';

export const generateRandomData = (n: number): DataPoint[] => {
  return Array.from({ length: n }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100
  }));
};