// Utility functions for player-related operations

export const capitalizeName = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const getCompatibilityColor = (score?: number) => {
  if (!score) return "from-gray-400 to-gray-500";
  if (score >= 90) return "from-primary to-success";
  if (score >= 80) return "from-analytics to-primary";
  if (score >= 70) return "from-accent to-analytics";
  return "from-gray-400 to-gray-500";
};

