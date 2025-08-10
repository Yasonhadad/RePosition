// Utility functions for player-related operations

export const getPlayerInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

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

export const formatMarketValue = (value?: number) => {
  if (!value) return "N/A";
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
  return `€${value}`;
};

export const getPositionColor = (position?: string) => {
  if (!position) return "bg-gray-100 text-gray-800";
  
  const colors: Record<string, string> = {
    'ST': 'bg-red-100 text-red-800',
    'LW': 'bg-blue-100 text-blue-800',
    'RW': 'bg-blue-100 text-blue-800',
    'CAM': 'bg-green-100 text-green-800',
    'CM': 'bg-green-100 text-green-800',
    'CDM': 'bg-yellow-100 text-yellow-800',
    'LB': 'bg-purple-100 text-purple-800',
    'RB': 'bg-purple-100 text-purple-800',
    'CB': 'bg-orange-100 text-orange-800',
  };
  
  return colors[position] || "bg-gray-100 text-gray-800";
}; 