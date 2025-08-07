import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Send,
  Loader2,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedbackFormProps {
  originalText: string;
  originalPrediction: string;
  originalConfidence: number;
  onClose: () => void;
}

export function FeedbackForm({ originalText, originalPrediction, originalConfidence, onClose }: FeedbackFormProps) {
  const [feedbackType, setFeedbackType] = useState<string>('');
  const [userAnnotation, setUserAnnotation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const API_BASE_URL = 'http://localhost:5000/api';

  const handleSubmit = async () => {
    if (!feedbackType) {
      toast({
        title: "Error",
        description: "Please select a feedback type",
        variant: "destructive",
      });
      return;
    }

    if (feedbackType === 'missed_hate' && !userAnnotation.trim()) {
      toast({
        title: "Error",
        description: "Please specify the hate word that was missed",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: originalText,
          feedback_type: feedbackType,
          user_annotation: userAnnotation.trim(),
          original_prediction: originalPrediction,
          confidence: originalConfidence
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      const result = await response.json();
      
      toast({
        title: "Feedback Submitted",
        description: result.message,
      });

      setIsSubmitted(true);
      
      // Close form after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-2 border-green-100 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <CardTitle className="text-xl font-bold text-green-800">Feedback Submitted!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-green-700 mb-4">
            Thank you for your feedback! This will help improve our model's accuracy.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-green-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Closing automatically...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-100 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-blue-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Model Feedback
            </CardTitle>
            <CardDescription className="text-blue-600 mt-1">
              Help improve our hate speech detection model
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 p-6">
        {/* Original Analysis Summary */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Original Analysis</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Text:</span>
              <span className="ml-2 font-medium">"{originalText.substring(0, 50)}{originalText.length > 50 ? '...' : ''}"</span>
            </div>
            <div>
              <span className="text-gray-600">Prediction:</span>
              <Badge 
                variant={originalPrediction === 'hate_speech' ? 'destructive' : originalPrediction === 'flagged' ? 'secondary' : 'default'}
                className="ml-2"
              >
                {originalPrediction === 'hate_speech' ? 'Hate Speech' : originalPrediction === 'flagged' ? 'Flagged' : 'Safe'}
              </Badge>
            </div>
            <div>
              <span className="text-gray-600">Confidence:</span>
              <span className="ml-2 font-medium">{originalConfidence.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Feedback Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            What type of feedback are you providing? *
          </label>
          <Select value={feedbackType} onValueChange={setFeedbackType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select feedback type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="missed_hate">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>Missed Hate Word</span>
                </div>
              </SelectItem>
              <SelectItem value="false_positive">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>False Positive</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User Annotation Input */}
        {feedbackType === 'missed_hate' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Which hate word was missed? *
            </label>
            <Input
              placeholder="Enter the hate word that should have been detected..."
              value={userAnnotation}
              onChange={(e) => setUserAnnotation(e.target.value)}
              className="border-2 focus:border-red-400 focus:ring-2 focus:ring-red-200"
            />
            <p className="text-xs text-gray-500">
              This word will be added to our hate word database for immediate improvement.
            </p>
          </div>
        )}

        {feedbackType === 'false_positive' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Additional Comments (Optional)
            </label>
            <Textarea
              placeholder="Please explain why this text should not be flagged as hate speech..."
              value={userAnnotation}
              onChange={(e) => setUserAnnotation(e.target.value)}
              className="min-h-[80px] border-2 focus:border-green-400 focus:ring-2 focus:ring-green-200"
            />
            <p className="text-xs text-gray-500">
              Your feedback will be reviewed to improve our model's accuracy.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !feedbackType || (feedbackType === 'missed_hate' && !userAnnotation.trim())}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Feedback
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>How this helps:</strong> Your feedback directly improves our model. 
            Missed hate words are added immediately, while false positives are reviewed for model retraining.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 