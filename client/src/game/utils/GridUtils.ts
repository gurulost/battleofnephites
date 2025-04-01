export class GridUtils {
  /**
   * Convert grid (cartesian) coordinates to isometric screen coordinates
   */
  static cartesianToIsometric(x: number, y: number, tileWidth: number, tileHeight: number) {
    const screenX = (x - y) * (tileWidth / 2);
    const screenY = (x + y) * (tileHeight / 2);
    
    return { screenX, screenY };
  }
  
  /**
   * Convert isometric screen coordinates to grid (cartesian) coordinates
   */
  static isometricToCartesian(screenX: number, screenY: number, tileWidth: number, tileHeight: number) {
    const x = (screenX / (tileWidth / 2) + screenY / (tileHeight / 2)) / 2;
    const y = (screenY / (tileHeight / 2) - screenX / (tileWidth / 2)) / 2;
    
    return { x: Math.floor(x), y: Math.floor(y) };
  }
  
  /**
   * Get the Manhattan distance between two grid points
   */
  static getManhattanDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }
  
  /**
   * Get all grid coordinates within a certain radius of a point
   */
  static getPointsInRadius(x: number, y: number, radius: number) {
    const points = [];
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) + Math.abs(dy) <= radius) {
          points.push({ x: x + dx, y: y + dy });
        }
      }
    }
    
    return points;
  }
}
