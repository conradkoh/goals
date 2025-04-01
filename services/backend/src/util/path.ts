export const joinPath = (...paths: string[]) => {
  return paths.join('/').replace(/\/\//g, '/');
};

/**
 * Get the next path in the path hierarchy.
 * @param path - The current path.
 * @returns The next path.
 */
export const getNextPath = (path: string) => {
  return `${path}0`;
};

/**
 * Validates that a goal's inPath matches its depth
 * @param depth The depth of the goal (0 for quarterly, 1 for weekly, 2 for daily)
 * @param inPath The path to validate
 * @returns true if the path is valid for the given depth
 */
export function validateGoalPath(depth: number, inPath: string): boolean {
  if (!inPath) return false;

  switch (depth) {
    case 0: // Quarterly
      return inPath === '/';
    case 1: // Weekly
      // Should match /{quarterlyId} where ID can contain alphanumeric chars and semicolons
      return /^\/[a-z0-9;]+$/i.test(inPath);
    case 2: // Daily
      // Should match /{quarterlyId}/{weeklyId} where IDs can contain alphanumeric chars and semicolons
      return /^\/[a-z0-9;]+\/[a-z0-9;]+$/i.test(inPath);
    default:
      return false;
  }
}
