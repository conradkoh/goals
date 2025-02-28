export const ConditionalRender = ({
  condition,
  children,
}: {
  condition: boolean;
  children: React.ReactNode;
}) => {
  if (condition) {
    return children;
  }
  return null;
};
