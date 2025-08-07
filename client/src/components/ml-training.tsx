import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface TrainingResult {
  success: boolean;
  accuracy?: number;
  training_samples?: number;
  test_samples?: number;
  hate_words_loaded?: number;
  error?: string;
}

interface MLHealthStatus {
  status: string;
  model_trained: boolean;
  hate_words_loaded: number;
  message?: string;
}

export function MLTrainingComponent() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const { toast } = useToast();

  // Check ML backend health
  const { data: mlHealth, isLoading: healthLoading } = useQuery<MLHealthStatus>({
    queryKey: ['/api/ml/health'],
    refetchInterval: 10000, // Check every 10 seconds
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setTrainingResult(null);
    }
  };

  const handleTraining = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to train the model",
        variant: "destructive",
      });
      return;
    }

    setIsTraining(true);
    setTrainingResult(null);

    try {
      // Read the file content
      const fileContent = await selectedFile.text();
      
      // Send the file content as JSON
      const response = await fetch('/api/ml/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'train_with_uploaded_data',
          filename: selectedFile.name,
          content: fileContent
        }),
      });

      if (!response.ok) {
        throw new Error(`Training failed: ${response.status}`);
      }

      const result: TrainingResult = await response.json();
      setTrainingResult(result);

      if (result.success) {
        toast({
          title: "Training completed successfully!",
          description: `Model trained with ${result.training_samples} samples. Accuracy: ${(result.accuracy || 0 * 100).toFixed(1)}%`,
        });
      } else {
        toast({
          title: "Training failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTrainingResult({ success: false, error: errorMessage });
      toast({
        title: "Training error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ML Backend Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Backend Status
          </CardTitle>
          <CardDescription>
            Python machine learning backend connection status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
              <span>Checking ML backend...</span>
            </div>
          ) : mlHealth?.status === 'healthy' ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ML backend is running successfully. Model trained: {mlHealth.model_trained ? 'Yes' : 'No'}
                {mlHealth.hate_words_loaded > 0 && ` (${mlHealth.hate_words_loaded} hate words loaded)`}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {mlHealth?.message || 'ML backend is not available. Please start the Python ML backend.'}
                <br />
                <code className="text-xs mt-2 block">python ml_backend/app.py</code>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Training Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Train Model
          </CardTitle>
          <CardDescription>
            Upload a CSV file or use the existing dataset to train the detection model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dataset Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Existing Dataset Option */}
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Use Existing Dataset:</strong>
                <br />
                • Dataset: <code>DataSets/sinhala-hate-speech-dataset.csv</code>
                <br />
                • Contains: 6,345 Sinhala/Singlish comments
                <br />
                • Ready to use immediately
              </AlertDescription>
            </Alert>

            {/* Upload Option */}
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                <strong>Upload Your Own Dataset:</strong>
                <br />
                • Format: CSV with text, label columns
                <br />
                • Label: 0 for normal, 1 for hate speech
                <br />
                • Supports Sinhala/English/Singlish
              </AlertDescription>
            </Alert>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="training-file">Upload Custom Training Data (Optional)</Label>
            <Input
              id="training-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isTraining}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Training Progress */}
          {isTraining && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                <span>
                  {selectedFile 
                    ? `Training model with uploaded dataset: ${selectedFile.name}...`
                    : "Training model with existing dataset..."
                  }
                </span>
              </div>
              <Progress value={50} className="w-full" />
              <p className="text-xs text-muted-foreground">
                This may take a few minutes. Processing with Unicode support.
              </p>
            </div>
          )}

          {/* Training Results */}
          {trainingResult && (
            <Alert variant={trainingResult.success ? "default" : "destructive"}>
              {trainingResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {trainingResult.success ? (
                  <div>
                    <strong>Training Successful!</strong>
                    <br />
                    • Accuracy: {((trainingResult.accuracy || 0) * 100).toFixed(1)}%
                    <br />
                    • Training samples: {trainingResult.training_samples}
                    {trainingResult.test_samples && (
                      <>
                        <br />
                        • Test samples: {trainingResult.test_samples}
                      </>
                    )}
                    <br />
                    • Models trained: 4 (including ensemble)
                  </div>
                ) : (
                  <div>
                    <strong>Training Failed:</strong>
                    <br />
                    {trainingResult.error}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Train Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleTraining}
              disabled={isTraining || mlHealth?.status !== 'healthy'}
              className="w-full"
            >
              {isTraining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Training Model...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  {selectedFile ? 'Train with Uploaded Dataset' : 'Train with Existing Dataset'}
                </>
              )}
            </Button>

            {selectedFile && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setTrainingResult(null);
                }}
                disabled={isTraining}
                className="w-full"
              >
                Use Existing Dataset Instead
              </Button>
            )}
          </div>

          {mlHealth?.status !== 'healthy' && (
            <p className="text-xs text-muted-foreground text-center">
              Start the Python ML backend to enable training
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}