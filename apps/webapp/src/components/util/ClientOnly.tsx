import { useEffect, useState } from 'react';
/**
 * ClientOnly component that renders its children only on the client side.
 * This is useful for components that rely on browser-specific APIs or
 * need to avoid server-side rendering issues.
 *
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The children to render.
 * @returns {React.ReactNode | null} The rendered children or null if not on the client.
 */

export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [render, setRender] = useState(false);
  useEffect(() => {
    setRender(true);
  }, []);
  if (!render) return null;
  return children;
}
