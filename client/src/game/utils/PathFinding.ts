import { PathNode } from '../../types/game';

export class PathFinder {
  private grid: boolean[][];
  private width: number;
  private height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    
    // Initialize grid with all tiles walkable
    this.grid = Array(height).fill(0).map(() => Array(width).fill(true));
  }
  
  /**
   * Set whether a tile is walkable or not
   */
  setWalkableAt(x: number, y: number, walkable: boolean) {
    if (this.isValidCoordinate(x, y)) {
      this.grid[y][x] = walkable;
    }
  }
  
  /**
   * Check if a tile is walkable
   */
  isWalkableAt(x: number, y: number): boolean {
    return this.isValidCoordinate(x, y) && this.grid[y][x];
  }
  
  /**
   * Check if coordinates are within grid bounds
   */
  isValidCoordinate(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
  
  /**
   * Find all tiles that are within a certain number of moves from a starting position
   */
  findTilesInRange(startX: number, startY: number, movePoints: number) {
    const visited = new Set<string>();
    const queue: { x: number, y: number, cost: number }[] = [];
    const results: { x: number, y: number, cost: number }[] = [];
    
    // Add starting point
    queue.push({ x: startX, y: startY, cost: 0 });
    visited.add(`${startX},${startY}`);
    
    // Breadth-first search to find all reachable tiles
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Found a valid tile within range
      if (current.cost <= movePoints) {
        results.push(current);
        
        // Check adjacent tiles
        const adjacentTiles = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 }
        ];
        
        for (const tile of adjacentTiles) {
          const key = `${tile.x},${tile.y}`;
          
          // Skip if already visited or not walkable
          if (visited.has(key) || !this.isWalkableAt(tile.x, tile.y)) {
            continue;
          }
          
          // Add to queue with increased cost
          queue.push({ x: tile.x, y: tile.y, cost: current.cost + 1 });
          visited.add(key);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Find a path from start to end, limited by available move points
   * Returns an array of points including start and end if a path is found,
   * otherwise returns an empty array
   */
  findPath(startX: number, startY: number, endX: number, endY: number, movePoints: number) {
    // Quick return for invalid inputs
    if (!this.isValidCoordinate(startX, startY) || 
        !this.isValidCoordinate(endX, endY) || 
        !this.isWalkableAt(endX, endY)) {
      return [];
    }
    
    // A* pathfinding algorithm
    const openList: PathNode[] = [];
    const closedList = new Set<string>();
    const nodeMap = new Map<string, PathNode>();
    
    // Add start node
    const startNode: PathNode = {
      x: startX,
      y: startY,
      f: 0,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY)
    };
    
    openList.push(startNode);
    nodeMap.set(`${startX},${startY}`, startNode);
    
    while (openList.length > 0) {
      // Sort by f-value and get the best node
      openList.sort((a, b) => a.f - b.f);
      const currentNode = openList.shift()!;
      const key = `${currentNode.x},${currentNode.y}`;
      
      // If we've reached the end or used all move points, reconstruct the path
      if ((currentNode.x === endX && currentNode.y === endY) || 
          currentNode.g >= movePoints) {
        return this.reconstructPath(currentNode);
      }
      
      // Move current node to closed list
      closedList.add(key);
      
      // Check all adjacent tiles
      const adjacentTiles = [
        { x: currentNode.x + 1, y: currentNode.y },
        { x: currentNode.x - 1, y: currentNode.y },
        { x: currentNode.x, y: currentNode.y + 1 },
        { x: currentNode.x, y: currentNode.y - 1 }
      ];
      
      for (const tile of adjacentTiles) {
        const tileKey = `${tile.x},${tile.y}`;
        
        // Skip if in closed list, not walkable, or out of range
        if (closedList.has(tileKey) || 
            !this.isWalkableAt(tile.x, tile.y) || 
            currentNode.g + 1 > movePoints) {
          continue;
        }
        
        // Calculate g, h, and f values
        const g = currentNode.g + 1;
        const h = this.heuristic(tile.x, tile.y, endX, endY);
        const f = g + h;
        
        // Check if this is a better path to this tile
        const existingNode = nodeMap.get(tileKey);
        
        if (!existingNode || g < existingNode.g) {
          // Create or update the node
          const newNode: PathNode = {
            x: tile.x,
            y: tile.y,
            f,
            g,
            h,
            parent: currentNode
          };
          
          nodeMap.set(tileKey, newNode);
          
          // Add to open list if not there already
          if (!existingNode) {
            openList.push(newNode);
          }
        }
      }
    }
    
    // No path found
    return [];
  }
  
  /**
   * Manhattan distance heuristic
   */
  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }
  
  /**
   * Reconstruct the path by following parent pointers
   */
  private reconstructPath(endNode: PathNode): { x: number, y: number }[] {
    const path: { x: number, y: number }[] = [];
    let currentNode: PathNode | undefined = endNode;
    
    while (currentNode) {
      path.unshift({ x: currentNode.x, y: currentNode.y });
      currentNode = currentNode.parent;
    }
    
    return path;
  }
}
