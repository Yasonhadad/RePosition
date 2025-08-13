import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Download, Columns3 } from "lucide-react";
import { uploadCompatibilityCsv } from "@/lib/api";

type UploadResultItem = {
  player_id: number;
  status: "ok" | "missing";
  name?: string | null;
  natural_pos?: string | null;
  compatibility: null | {
    best_pos?: string | null;
    best_fit_score?: number | null;
    st_fit?: number | null;
    lw_fit?: number | null;
    rw_fit?: number | null;
    cm_fit?: number | null;
    cdm_fit?: number | null;
    cam_fit?: number | null;
    lb_fit?: number | null;
    rb_fit?: number | null;
    cb_fit?: number | null;
  };
};

export default function CsvUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ count: number; results: UploadResultItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetailed, setShowDetailed] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "player_id",
      "name",
      "date_of_birth",
      "sub_position",
      "height_in_cm",
      "age",
      "acceleration",
      "sprint_speed",
      "positioning",
      "finishing",
      "shot_power",
      "long_shots",
      "volleys",
      "penalties",
      "vision",
      "crossing",
      "free_kick_accuracy",
      "short_passing",
      "long_passing",
      "curve",
      "dribbling",
      "agility",
      "balance",
      "reactions",
      "ball_control",
      "composure",
      "interceptions",
      "heading_accuracy",
      "def_awareness",
      "standing_tackle",
      "jumping",
      "strength",
      "aggression",
      "weight_in_kg",
    ];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compatibility_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadCompatibilityCsv(file);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compatibility_results.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!result) return;
    const headers = [
      "player_id","status","best_pos","best_fit_score",
      "st_fit","lw_fit","rw_fit","cm_fit","cdm_fit","cam_fit","lb_fit","rb_fit","cb_fit",
    ];
    const lines = [headers.join(",")];
    for (const r of result.results) {
      const c = r.compatibility || {} as any;
      const row = [
        r.player_id,
        r.status,
        c.best_pos ?? "",
        c.best_fit_score ?? "",
        c.st_fit ?? "",
        c.lw_fit ?? "",
        c.rw_fit ?? "",
        c.cm_fit ?? "",
        c.cdm_fit ?? "",
        c.cam_fit ?? "",
        c.lb_fit ?? "",
        c.rb_fit ?? "",
        c.cb_fit ?? "",
      ];
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compatibility_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="main-content p-6 pt-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> Upload CSV to get position compatibility scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <input type="file" accept=".csv" onChange={handleFileChange} />
            <Button onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Process"}
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate} className="flex items-center gap-2">
              <Download className="w-4 h-4" /> Download Template
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Template includes the required feature columns including <code>player_id</code>.</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Results ({result.count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <Button variant="outline" onClick={() => setShowDetailed(v => !v)} className="flex items-center gap-2">
                <Columns3 className="w-4 h-4" /> {showDetailed ? "Hide detailed" : "Show detailed"}
              </Button>
              <Button variant="secondary" onClick={downloadJSON} className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Download JSON
              </Button>
              <Button variant="secondary" onClick={downloadCSV} className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Download CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Player ID</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Current Position</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Best Position</th>
                    <th className="py-2 pr-4">Best Score</th>
                    {showDetailed && (
                      <>
                        <th className="py-2 pr-4">ST fit</th>
                        <th className="py-2 pr-4">LW fit</th>
                        <th className="py-2 pr-4">RW fit</th>
                        <th className="py-2 pr-4">CM fit</th>
                        <th className="py-2 pr-4">CDM fit</th>
                        <th className="py-2 pr-4">CAM fit</th>
                        <th className="py-2 pr-4">LB fit</th>
                        <th className="py-2 pr-4">RB fit</th>
                        <th className="py-2 pr-4">CB fit</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row) => (
                    <tr key={row.player_id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4">{row.player_id}</td>
                      <td className="py-2 pr-4">{row.name ?? "-"}</td>
                      <td className="py-2 pr-4">{row.natural_pos ?? "-"}</td>
                      <td className="py-2 pr-4">
                        {row.status === "ok" ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" /> Missing
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{row.compatibility?.best_pos ?? "-"}</td>
                      <td className="py-2 pr-4">{row.compatibility?.best_fit_score ?? "-"}</td>
                      {showDetailed && (
                        <>
                          <td className="py-2 pr-4">{row.compatibility?.st_fit ?? "-"}</td>
                          <td className="py-2 pr-4">{row.compatibility?.lw_fit ?? "-"}</td>
                          <td className="py-2 pr-4">{row.compatibility?.rw_fit ?? "-"}</td>
                          <td className="py-2 pr-4">{row.compatibility?.cm_fit ?? "-"}</td>
                          <td className="py-2 pr-4">{row.compatibility?.cdm_fit ?? "-"}</td>
                          <td className="py-2 pr-4">{row.compatibility?.cam_fit ?? "-"}</td>
                          <td className="py-2 pr-4">{row.compatibility?.lb_fit ?? "-"}</td>
                          <td className="py-2 pr-4">{row.compatibility?.rb_fit ?? "-"}</td>
                          <td className="py-2 pr-4">{row.compatibility?.cb_fit ?? "-"}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


