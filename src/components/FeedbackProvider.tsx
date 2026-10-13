import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, Bug, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FeedbackContextType {
  trackAction: (action: string) => void;
  showFirstTimePopup: (action: string) => void;
  openFeedback: (type?: 'feedback' | 'bug' | 'issue') => void;
}

const FeedbackContext = createContext<FeedbackContextType>({ 
  trackAction: () => {},
  showFirstTimePopup: () => {},
  openFeedback: () => {}
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

  const openFeedback = (type: 'feedback' | 'bug' | 'issue' = 'feedback') => {
    setFeedbackType(type);
    setTriggerAction('manual');
    setIsFirstTime(false);
    setShowFeedback(true);
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

  const feedbackTypeButtons = [
    { type: 'feedback' as const, icon: ThumbsUp, label: 'Feedback', color: 'bg-primary/10 text-primary border-primary/30' },
    { type: 'bug' as const, icon: Bug, label: 'Bug', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
    { type: 'issue' as const, icon: AlertTriangle, label: 'Issue', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
  ];

  return (
    <FeedbackContext.Provider value={{ trackAction, showFirstTimePopup, openFeedback }}>
      {children}
      
      <Dialog open={showFeedback} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-[340px] sm:max-w-sm p-0 gap-0 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="relative px-4 pt-4 pb-3 bg-gradient-to-b from-muted/50 to-background">
            <button 
              onClick={resetForm}
              className="absolute right-3 top-3 p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            <DialogTitle className="text-base font-semibold pr-8">
              {isFirstTime ? "🎉 First Success!" : "Share Your Thoughts"}
            </DialogTitle>
            {isFirstTime && (
              <p className="text-xs text-muted-foreground mt-1">
                You completed your first {triggerAction.replace(/_/g, ' ')}!
              </p>
            )}
          </div>
          
          {/* Type Selection */}
          <div className="px-4 py-3 flex gap-2">
            {feedbackTypeButtons.map(({ type, icon: Icon, label, color }) => (
              <button
                key={type}
                onClick={() => setFeedbackType(type)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all",
                  feedbackType === type 
                    ? color + " border-current" 
                    : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="px-4 pb-4 space-y-3">
            {feedbackType === 'feedback' && (
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors",
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40 hover:text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
            
            <Textarea
              placeholder={
                feedbackType === 'feedback' 
                  ? "Tell us more (optional)" 
                  : feedbackType === 'bug'
                    ? "Describe the bug..."
                    : "What's the issue?"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="resize-none text-sm rounded-xl"
            />

            {/* Submit */}
            <div className="flex gap-2 pt-1">
              <Button 
                variant="ghost" 
                onClick={resetForm}
                className="flex-1 h-9 text-xs"
              >
                Later
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || (feedbackType === 'feedback' && rating === 0) || ((feedbackType === 'bug' || feedbackType === 'issue') && !message.trim())}
                className="flex-1 h-9 text-xs"
              >
                {submitting ? "..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FeedbackContext.Provider>
  );
};