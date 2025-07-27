import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export default function Settings() {
  const [confidenceThreshold, setConfidenceThreshold] = useState([75]);
  const [autoHideEnabled, setAutoHideEnabled] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [encodedDetection, setEncodedDetection] = useState(false);

  return (
    <>
      <Header 
        title="Settings" 
        description="Configure hate speech detection system parameters" 
      />
      
      <div className="p-6 max-w-4xl">
        {/* Detection Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detection Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Confidence Threshold</Label>
              <div className="px-3">
                <Slider
                  value={confidenceThreshold}
                  onValueChange={setConfidenceThreshold}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
              <p className="text-sm text-slate-500">
                Content with confidence above {confidenceThreshold[0]}% will be flagged
              </p>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Hide High Confidence</Label>
                <p className="text-sm text-slate-500">
                  Automatically hide content with high hate speech confidence
                </p>
              </div>
              <Switch
                checked={autoHideEnabled}
                onCheckedChange={setAutoHideEnabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Real-Time Analysis</Label>
                <p className="text-sm text-slate-500">
                  Analyze content as users type
                </p>
              </div>
              <Switch
                checked={realTimeEnabled}
                onCheckedChange={setRealTimeEnabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Encoded Variation Detection</Label>
                <p className="text-sm text-slate-500">
                  Detect obfuscated and encoded hate speech
                </p>
              </div>
              <Switch
                checked={encodedDetection}
                onCheckedChange={setEncodedDetection}
              />
            </div>
          </CardContent>
        </Card>

        {/* Model Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Model Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary-model">Primary Model</Label>
                <Input
                  id="primary-model"
                  value="mBERT-base"
                  readOnly
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fallback-model">Fallback Model</Label>
                <Input
                  id="fallback-model"
                  value="LSTM-classifier"
                  readOnly
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Model Status</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                    <span className="font-medium">mBERT</span>
                  </div>
                  <span className="text-sm text-slate-600">Online</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-warning rounded-full"></div>
                    <span className="font-medium">LSTM</span>
                  </div>
                  <span className="text-sm text-slate-600">Training</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-content-length">Max Content Length</Label>
                <Input
                  id="max-content-length"
                  type="number"
                  defaultValue="500"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="analysis-timeout">Analysis Timeout (ms)</Label>
                <Input
                  id="analysis-timeout"
                  type="number"
                  defaultValue="5000"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batch-size">Batch Processing Size</Label>
                <Input
                  id="batch-size"
                  type="number"
                  defaultValue="10"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cache-duration">Cache Duration (minutes)</Label>
                <Input
                  id="cache-duration"
                  type="number"
                  defaultValue="60"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button className="bg-primary hover:bg-blue-700">
            Save Settings
          </Button>
          <Button variant="outline">
            Reset to Defaults
          </Button>
          <Button variant="outline">
            Export Configuration
          </Button>
        </div>
      </div>
    </>
  );
}
