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
