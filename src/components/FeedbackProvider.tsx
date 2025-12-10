import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, ThumbsUp, Bug, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface FeedbackContextType {
  trackAction: (action: string) => void;
  showFirstTimePopup: (action: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType>({ 
  trackAction: () => {},
  showFirstTimePopup: () => {}
});

export const useFeedback = () => useContext(FeedbackContext);

interface FeedbackProviderProps {
  children: ReactNode;
}

export const FeedbackProvider = ({ children }: FeedbackProviderProps) => {
  const { user } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'bug' | 'issue'>('feedback');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [triggerAction, setTriggerAction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    if (user) {
      fetchActionCount();
    }
  }, [user]);

  const fetchActionCount = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('action_count, last_feedback_at')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setActionCount(data.action_count || 0);
    }
  };

  const trackActivity = async (activityType: string) => {
    if (!user) return;
    
    try {
      await supabase.from('user_activity').insert({
        user_id: user.id,
        activity_type: activityType,
        metadata: { action: activityType }
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  const showFirstTimePopup = async (action: string) => {
    if (!user) return;
    
    // Check if this is user's first quotation/invoice
    const { data: profile } = await supabase
      .from('profiles')
      .select('action_count')
      .eq('id', user.id)
      .single();
    
    const count = profile?.action_count || 0;
    
    // Show popup for first-time actions (first quotation, first invoice, etc.)
    if (count <= 1) {
      setIsFirstTime(true);
      setTriggerAction(action);
      setShowFeedback(true);
    }
  };

  const trackAction = async (action: string) => {
    if (!user) return;

    const newCount = actionCount + 1;
    setActionCount(newCount);

    // Track activity
    await trackActivity(action);

    // Update action count in database
    await supabase
      .from('profiles')
      .update({ action_count: newCount })
      .eq('id', user.id);

    // Check if we should show feedback (every 3 actions, but not more than once per day)
    if (newCount > 0 && newCount % 3 === 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_feedback_at')
        .eq('id', user.id)
        .single();

      const lastFeedback = profile?.last_feedback_at ? new Date(profile.last_feedback_at) : null;
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      if (!lastFeedback || lastFeedback < oneDayAgo) {
        setIsFirstTime(false);
        setTriggerAction(action);
        setShowFeedback(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please login to submit feedback");
      return;
    }

    // For bug/issue reports, message is required
    if ((feedbackType === 'bug' || feedbackType === 'issue') && !message.trim()) {
      toast.error("Please describe the bug or issue");
      return;
    }

    // For feedback, rating is required
    if (feedbackType === 'feedback' && rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          rating: feedbackType === 'feedback' ? rating : 0,
          message: message || null,
          trigger_action: triggerAction,
          feedback_type: feedbackType,
        });

      if (error) throw error;

      // Update last feedback timestamp
      await supabase
        .from('profiles')
        .update({ last_feedback_at: new Date().toISOString() })
        .eq('id', user.id);

      const successMessages = {
        feedback: "Thank you for your feedback!",
        bug: "Bug report submitted. We'll look into it!",
        issue: "Issue reported. Thank you for letting us know!",
      };

      toast.success(successMessages[feedbackType]);
      resetForm();
    } catch (error: any) {
      toast.error("Failed to submit. Please try again.");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowFeedback(false);
    setRating(0);
    setMessage("");
    setFeedbackType('feedback');
    setIsFirstTime(false);
  };

  return (
    <FeedbackContext.Provider value={{ trackAction, showFirstTimePopup }}>
      {children}
      
      <Dialog open={showFeedback} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isFirstTime ? "Congratulations! 🎉" : "How's your experience?"}
            </DialogTitle>
            {isFirstTime && (
              <p className="text-center text-sm text-muted-foreground pt-2">
                You've just completed your first {triggerAction.replace('_', ' ')}! 
                We'd love to hear from you.
              </p>
            )}
          </DialogHeader>
          
          <Tabs value={feedbackType} onValueChange={(v) => setFeedbackType(v as typeof feedbackType)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="feedback" className="flex items-center gap-1 text-xs">
                <ThumbsUp className="h-3 w-3" />
                Feedback
              </TabsTrigger>
              <TabsTrigger value="bug" className="flex items-center gap-1 text-xs">
                <Bug className="h-3 w-3" />
                Bug
              </TabsTrigger>
              <TabsTrigger value="issue" className="flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Issue
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feedback" className="space-y-4 pt-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Tell us more about your experience (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </TabsContent>

            <TabsContent value="bug" className="space-y-4 pt-4">
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <Bug className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700">Report a bug you've encountered</p>
              </div>
              <Textarea
                placeholder="Please describe the bug in detail. What were you trying to do? What happened instead?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
            </TabsContent>

            <TabsContent value="issue" className="space-y-4 pt-4">
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <p className="text-sm text-orange-700">Report an issue or problem</p>
              </div>
              <Textarea
                placeholder="Describe the issue you're facing. What's not working as expected?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={resetForm}>
              Maybe Later
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || (feedbackType === 'feedback' && rating === 0) || ((feedbackType === 'bug' || feedbackType === 'issue') && !message.trim())}
            >
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FeedbackContext.Provider>
  );
};