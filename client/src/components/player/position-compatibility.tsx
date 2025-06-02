import type { PositionCompatibility } from "@shared/schema";

interface PositionCompatibilityProps {
  compatibility: PositionCompatibility;
}

export function PositionCompatibility({ compatibility }: PositionCompatibilityProps) {
  const positions = [
    { name: "ST", value: compatibility.st_fit },
    { name: "LW", value: compatibility.lw_fit },
    { name: "RW", value: compatibility.rw_fit },
    { name: "CAM", value: compatibility.cam_fit },
    { name: "CM", value: compatibility.cm_fit },
    { name: "CDM", value: compatibility.cdm_fit },
    { name: "LB", value: compatibility.lb_fit },
    { name: "RB", value: compatibility.rb_fit },
    { name: "CB", value: compatibility.cb_fit },
  ].filter(pos => pos.value !== null);

  const getCompatibilityColor = (value: number) => {
    if (value >= 90) return "bg-primary";
    if (value >= 80) return "bg-analytics";
    if (value >= 70) return "bg-accent";
    if (value >= 60) return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <div>
      <h5 className="font-medium text-dark mb-3">Position Compatibility</h5>
      <div className="space-y-3">
        {positions.map((position) => (
          <div key={position.name} className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 w-8">
              {position.name}
            </span>
            <div className="flex items-center space-x-2 flex-1">
              <div className="w-24 bg-gray-200 rounded-full h-2 ml-3">
                <div
                  className={`h-2 rounded-full ${getCompatibilityColor(position.value!)}`}
                  style={{ width: `${Math.min(position.value!, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-dark w-10 text-right">
                {position.value!.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
