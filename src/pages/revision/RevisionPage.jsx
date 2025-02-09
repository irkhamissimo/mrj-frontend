import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayCircle, ArrowLeft } from "lucide-react";
import { apiCall } from "@/lib/api";

const formatDate = () => {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date().toLocaleDateString('id-ID', options);
};

export default function RevisionPage() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const [memorization, setMemorization] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [revisionDurations, setRevisionDurations] = useState({
    1: "10",
    2: "10",
    3: "10",
    4: "10",
    5: "10"
  });

  // On mount, check if there's an active session in localStorage and set states accordingly.
  useEffect(() => {
    const storedSession = localStorage.getItem("activeRevisionSession");
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      setActiveSession({ _id: parsed.revisionSessionId });
      setSessionDuration(parsed.sessionDuration);
      setIsPaused(parsed.paused);
      let effectiveTime = parsed.elapsedBeforePause;
      if (!parsed.paused && parsed.startTime) {
        effectiveTime =
          Math.floor((Date.now() - parsed.startTime) / 1000) +
          parsed.elapsedBeforePause;
      }
      setTimeElapsed(effectiveTime);
    }
  }, []);

  useEffect(() => {
    const fetchMemorization = async () => {
      try {
        const response = await apiCall(`/memorizations/${entryId}/completed`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        const data = await response.json();
        if (response.ok && data.length > 0) {
          setMemorization(data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch memorization:", error);
      }
    };
    fetchMemorization();
  }, [entryId]);

  // Fetch existing revision sessions
  useEffect(() => {
    const fetchRevisionSessions = async () => {
      try {
        const response = await apiCall(`/memorizations/${entryId}/revisions`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setCompletedSessions(data.completedSessions);
          // If there's an active session that isn't completed, set it
          const activeSessionData = data.revisionSessions.find(s => !s.completed);
          if (activeSessionData) {
            setActiveSession(activeSessionData);
          }
        }
      } catch (error) {
        console.error("Failed to fetch revision sessions:", error);
      }
    };

    fetchRevisionSessions();
  }, [entryId]);

  // Timer effect: update timeElapsed every second based on shared localStorage.
  useEffect(() => {
    if (!activeSession) return;

    const intervalId = setInterval(() => {
      const stored = localStorage.getItem("activeRevisionSession");
      if (stored) {
        const s = JSON.parse(stored);
        let effectiveTime;
        if (s.paused) {
          effectiveTime = s.elapsedBeforePause;
        } else {
          effectiveTime =
            Math.floor((Date.now() - s.startTime) / 1000) + s.elapsedBeforePause;
        }
        setTimeElapsed(effectiveTime);
        if (effectiveTime >= s.sessionDuration) {
          clearInterval(intervalId);
          handleSessionComplete();
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeSession]);

  // Listen for localStorage changes (i.e. across tabs)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "activeRevisionSession") {
        const stored = event.newValue;
        if (stored) {
          const s = JSON.parse(stored);
          setIsPaused(s.paused);
          setSessionDuration(s.sessionDuration);
          let effectiveTime = s.elapsedBeforePause;
          if (!s.paused && s.startTime) {
            effectiveTime =
              Math.floor((Date.now() - s.startTime) / 1000) + s.elapsedBeforePause;
          }
          setTimeElapsed(effectiveTime);
        } else {
          // The session was removed (e.g., completed in another tab)
          setActiveSession(null);
          setTimeElapsed(0);
          setSessionDuration(0);
          setIsPaused(false);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Complete the active revision session
  const handleSessionComplete = async () => {
    if (!activeSession) return;

    try {
      const response = await apiCall(`/memorizations/revisions/${activeSession._id}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: 5 // Default rating
        })
      });

      if (response.ok) {
        setCompletedSessions(prev => prev + 1);
        setActiveSession(null);
        setIsPaused(false);
        setTimeElapsed(0);
        setSessionDuration(0);
        localStorage.removeItem("activeRevisionSession");
      }
    } catch (error) {
      console.error("Failed to complete session:", error);
    }
  };

  // When starting a revision session, store the session meta in localStorage
  const handleStartRevision = async (sessionNumber) => {
    try {
      const durationMinutes = parseInt(revisionDurations[sessionNumber]);
      const response = await apiCall(`/memorizations/${entryId}/revisions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          duration: durationMinutes
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.revisionSession);
        setTimeElapsed(0);
        setSessionDuration(durationMinutes * 60);
        setIsPaused(false);
        const revisionSessionData = {
          revisionSessionId: data.revisionSession._id,
          startTime: Date.now(),
          paused: false,
          elapsedBeforePause: 0,
          sessionDuration: durationMinutes * 60,
        };
        localStorage.setItem(
          "activeRevisionSession",
          JSON.stringify(revisionSessionData)
        );
      }
    } catch (error) {
      console.error("Failed to start revision:", error);
    }
  };

  // Toggle pause/resume and update localStorage so other tabs are in sync.
  const handleTogglePause = async () => {
    if (!activeSession) return;

    try {
      const stored = localStorage.getItem("activeRevisionSession");
      if (!stored) return;
      const s = JSON.parse(stored);

      if (!s.paused) {
        // Pause: calculate effective elapsed time and update.
        const effectiveTime =
          Math.floor((Date.now() - s.startTime) / 1000) + s.elapsedBeforePause;
        const updatedSession = {
          ...s,
          paused: true,
          elapsedBeforePause: effectiveTime,
          startTime: null,
        };
        localStorage.setItem(
          "activeRevisionSession",
          JSON.stringify(updatedSession)
        );
        setIsPaused(true);
      } else {
        // Resume: set a new start time.
        const updatedSession = {
          ...s,
          paused: false,
          startTime: Date.now(),
        };
        localStorage.setItem(
          "activeRevisionSession",
          JSON.stringify(updatedSession)
        );
        setIsPaused(false);
      }

      // Optionally, fire an API call to notify pause/resume action.
      const response = await apiCall(
        `/memorizations/revisions/${activeSession._id}/pause`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to toggle pause via API");
      }
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };

  // Updated formatTime function to display MM:SS format.
  const formatTime = (elapsedSeconds) => {
    const remainingSeconds = sessionDuration - elapsedSeconds;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!memorization) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 relative">
      {/* Back Button positioned absolutely to reduce extra space above it */}
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="absolute -top-2 left-2"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </Button>
      <Card className="mt-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">
              Murajaah Hafalan Baru
            </CardTitle>
            <span className="text-sm text-muted-foreground">{formatDate()}</span>
          </div>
          <p className="text-muted-foreground">
            {memorization.surahEnglishName}: {memorization.fromVerse} - {memorization.toVerse}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer & Session Indicators */}
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-8">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    className="stroke-muted fill-none"
                    strokeWidth="12"
                  />
                  {activeSession && (
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      className="stroke-primary fill-none"
                      strokeWidth="12"
                      strokeDasharray={`${(timeElapsed / sessionDuration) * 365} 365`}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                  {activeSession ? formatTime(timeElapsed) : "0:00"}
                </div>
              </div>
              {/* Session Indicators */}
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((sessionNumber) => (
                  <div
                    key={sessionNumber}
                    className={`w-4 h-4 rounded-full border-2 border-primary ${
                      sessionNumber <= completedSessions
                        ? "bg-primary"
                        : "bg-background"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
  
          {/* Revision Sessions List */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((sessionNumber) => (
              <div key={sessionNumber} className="flex items-center justify-between gap-4 p-2 border rounded-lg">
                <span className="font-medium">Murajaah #{sessionNumber}</span>
                <div className="flex items-center gap-2">
                  <Select
                    value={revisionDurations[sessionNumber]}
                    onValueChange={(value) => 
                      setRevisionDurations(prev => ({...prev, [sessionNumber]: value}))
                    }
                    disabled={activeSession !== null || sessionNumber !== completedSessions + 1}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 menit</SelectItem>
                      <SelectItem value="15">15 menit</SelectItem>
                      <SelectItem value="20">20 menit</SelectItem>
                      <SelectItem value="25">25 menit</SelectItem>
                    </SelectContent>
                  </Select>
                  {sessionNumber === completedSessions + 1 && !activeSession && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartRevision(sessionNumber)}
                    >
                      <PlayCircle className="h-6 w-6" />
                    </Button>
                  )}
                  {activeSession && sessionNumber === completedSessions + 1 && (
                    <Button
                      variant="outline"
                      onClick={handleTogglePause}
                    >
                      {isPaused ? "Lanjutkan" : "Jeda"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 