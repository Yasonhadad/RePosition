import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { PositionCompatibility } from "@shared/schema";

interface CompatibilityChartProps {
  compatibility: PositionCompatibility;
}

export function CompatibilityChart({ compatibility }: CompatibilityChartProps) {
  const data = [
    { position: "ST", value: compatibility.st_fit || 0 },
    { position: "LW", value: compatibility.lw_fit || 0 },
    { position: "RW", value: compatibility.rw_fit || 0 },
    { position: "CAM", value: compatibility.cam_fit || 0 },
    { position: "CM", value: compatibility.cm_fit || 0 },
    { position: "CDM", value: compatibility.cdm_fit || 0 },
    { position: "LB", value: compatibility.lb_fit || 0 },
    { position: "RB", value: compatibility.rb_fit || 0 },
    { position: "CB", value: compatibility.cb_fit || 0 },
  ].filter(item => item.value > 0);

  const getBarColor = (value: number) => {
    if (value >= 90) return "#00A651"; // Primary green
    if (value >= 80) return "#007BFF"; // Analytics blue
    if (value >= 70) return "#FFD700"; // Accent gold
    return "#6B7280"; // Gray
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="position" />
          <YAxis domain={[0, 100]} />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Compatibility"]}
            labelStyle={{ color: "#1A1A1A" }}
          />
          <Bar 
            dataKey="value" 
            fill={(entry: any) => getBarColor(entry.value)}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
