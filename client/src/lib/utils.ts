import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a unique ID (simplistic version)
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Converts a number to a string with a specified number of decimal places
 */
export function toFixedNumber(num: number, digits: number = 1): number {
  const pow = Math.pow(10, digits);
  return Math.round(num * pow) / pow;
}

/**
 * Limits a number within a min and max range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Returns a random element from an array
 */
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 */
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Returns true if two objects have the same coordinates
 */
export function sameCoordinates(obj1: { x: number, y: number }, obj2: { x: number, y: number }): boolean {
  return obj1.x === obj2.x && obj1.y === obj2.y;
}

/**
 * Calculates the Manhattan distance between two points
 */
export function getManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Calculates the Euclidean distance between two points
 */
export function getEuclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}