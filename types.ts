
export interface Dimensions {
  width: number;
  height: number;
}

export interface ConversionResult {
  dataUrl: string;
  dimensions: Dimensions;
  fileName: string;
}
