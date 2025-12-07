import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface FeedbackContextType {
  trackAction: (action: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType>({ trackAction: () => {} });

export const useFeedback = () => useContext(FeedbackContext);

interface FeedbackProviderProps {
  children: ReactNode;
}

export const FeedbackProvider = ({ children }: FeedbackProviderProps) => {
  const { user } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [triggerAction, setTriggerAction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionCount, setActionCount] = useState(0);

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

  const trackAction = async (action: string) => {
    if (!user) return;

    const newCount = actionCount + 1;
    setActionCount(newCount);

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
        setTriggerAction(action);
        setShowFeedback(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          rating,
          message: message || null,
          trigger_action: triggerAction,
        });

      if (error) throw error;

      // Update last feedback timestamp
      await supabase
        .from('profiles')
        .update({ last_feedback_at: new Date().toISOString() })
        .eq('id', user.id);

      toast.success("Thank you for your feedback!");
      setShowFeedback(false);
      setRating(0);
      setMessage("");
    } catch (error: any) {
      toast.error("Failed to submit feedback");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FeedbackContext.Provider value={{ trackAction }}>
      {children}
      
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">How's your experience?</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
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
            <div className="space-y-2">
              <Textarea
                placeholder="Tell us more about your experience (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowFeedback(false)}>
              Maybe Later
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FeedbackContext.Provider>
  );
};
