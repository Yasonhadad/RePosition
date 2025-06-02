import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Play, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadResult {
  message: string;
  recordsProcessed: number;
  errors: string[];
}

interface AnalysisResult {
  message: string;
  results?: any[];
  totalProcessed?: number;
  totalPlayers?: number;
  errors?: string[];
}

export default function DataUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("players");
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation<UploadResult, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `Processed ${data.recordsProcessed} records successfully`,
      });
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const analyzeAllMutation = useMutation<AnalysisResult, Error>({
    mutationFn: async () => {
      const response = await fetch("/api/analyze/all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Analysis failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${data.totalProcessed} of ${data.totalPlayers} players`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (file: File | null) => {
    if (file && file.type === "text/csv") {
      setSelectedFile(file);
    } else if (file) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("csvFile", selectedFile);
    formData.append("fileType", fileType);

    uploadMutation.mutate(formData);
  };

  const handleAnalyzeAll = () => {
    analyzeAllMutation.mutate();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark mb-2">Data Upload & Analysis</h2>
        <p className="text-gray-600">
          Upload CSV files and run ML analysis on player data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Upload Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-dark">
              Upload CSV Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Type Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2">
                Data Type
              </Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="players">Players Data</SelectItem>
                  <SelectItem value="clubs">Clubs Data</SelectItem>
                  <SelectItem value="competitions">Competitions Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary bg-opacity-5"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-dark">
                  Drop CSV file here
                </h3>
                <p className="text-sm text-gray-600">
                  or click to browse files
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-dark">{selectedFile.name}</p>
                  <p className="text-xs text-gray-600">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  Remove
                </Button>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full"
              size="lg"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV File
                </>
              )}
            </Button>

            {/* Upload Results */}
            {uploadMutation.isSuccess && uploadMutation.data && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {uploadMutation.data.message} - {uploadMutation.data.recordsProcessed} records processed
                  {uploadMutation.data.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Errors ({uploadMutation.data.errors.length}):</p>
                      <ul className="text-xs space-y-1 mt-1">
                        {uploadMutation.data.errors.slice(0, 5).map((error, i) => (
                          <li key={i} className="text-red-600">{error}</li>
                        ))}
                        {uploadMutation.data.errors.length > 5 && (
                          <li className="text-gray-600">
                            ... and {uploadMutation.data.errors.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {uploadMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadMutation.error?.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ML Analysis Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-dark">
              ML Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-dark mb-2">
                Run Position Compatibility Analysis
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Analyze all players using XGBoost models to calculate position compatibility scores.
                This process may take several minutes depending on the number of players.
              </p>

              <Button
                onClick={handleAnalyzeAll}
                disabled={analyzeAllMutation.isPending}
                className="w-full"
                size="lg"
              >
                {analyzeAllMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Running Analysis...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Analyze All Players
                  </>
                )}
              </Button>
            </div>

            {analyzeAllMutation.isPending && (
              <div className="space-y-2">
                <Progress value={33} className="w-full" />
                <p className="text-sm text-gray-600 text-center">
                  Processing player data with ML models...
                </p>
              </div>
            )}

            {analyzeAllMutation.isSuccess && analyzeAllMutation.data && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {analyzeAllMutation.data.message}
                  {analyzeAllMutation.data.totalProcessed && analyzeAllMutation.data.totalPlayers && (
                    <div className="mt-2">
                      <p>
                        Successfully analyzed {analyzeAllMutation.data.totalProcessed} of{" "}
                        {analyzeAllMutation.data.totalPlayers} players
                      </p>
                    </div>
                  )}
                  {analyzeAllMutation.data.errors && analyzeAllMutation.data.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">
                        Errors ({analyzeAllMutation.data.errors.length}):
                      </p>
                      <ul className="text-xs space-y-1 mt-1">
                        {analyzeAllMutation.data.errors.slice(0, 3).map((error, i) => (
                          <li key={i} className="text-red-600">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {analyzeAllMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{analyzeAllMutation.error?.message}</AlertDescription>
              </Alert>
            )}

            {/* Instructions */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-dark mb-2">Instructions</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Upload player data CSV file first</li>
                <li>2. Upload clubs data if analyzing teams</li>
                <li>3. Run ML analysis to calculate compatibility scores</li>
                <li>4. Use search and team analysis features</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
