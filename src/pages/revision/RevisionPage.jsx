import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayCircle } from "lucide-react";

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
  const [revisionDurations, setRevisionDurations] = useState({
    1: "10",
    2: "10",
    3: "10",
    4: "10",
    5: "10"
  });

  useEffect(() => {
    const fetchMemorization = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/memorizations/${entryId}/completed`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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

  // Add effect to fetch existing revision sessions
  useEffect(() => {
    const fetchRevisionSessions = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/memorizations/${entryId}/revisions`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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

  // Update handleSessionComplete to call completeRevisionSession
  const handleSessionComplete = async () => {
    if (!activeSession) return;

    try {
      const response = await fetch(`http://localhost:5000/api/memorizations/revisions/${activeSession._id}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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
      }
    } catch (error) {
      console.error("Failed to complete session:", error);
    }
  };

  // Timer effect that calls handleSessionComplete when time is up
  useEffect(() => {
    let interval;
    if (activeSession && !isPaused) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => {
          const duration = parseInt(revisionDurations[completedSessions + 1]);
          if (prev >= duration) {
            clearInterval(interval);
            handleSessionComplete(); // Call complete when time is up
            return duration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession, isPaused, revisionDurations, completedSessions]);

  const handleStartRevision = async (sessionNumber) => {
    try {
      const response = await fetch(`http://localhost:5000/api/memorizations/${entryId}/revisions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          duration: parseInt(revisionDurations[sessionNumber])
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.revisionSession);
        setTimeElapsed(0);
      }
    } catch (error) {
      console.error("Failed to start revision:", error);
    }
  };

  const handleTogglePause = async () => {
    if (!activeSession) return;

    try {
      const response = await fetch(`http://localhost:5000/api/memorizations/revisions/${activeSession._id}/pause`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        setIsPaused(!isPaused);
      }
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!memorization) return null;

  return (
    <Card className="max-w-2xl mx-auto">
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
        {/* Timer and Session Indicators Container */}
        <div className="flex items-center justify-center gap-8">
          {/* Main Timer Circle */}
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
                    strokeDasharray={`${(timeElapsed / parseInt(revisionDurations[completedSessions + 1])) * 365} 365`}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                {activeSession ? formatTime(timeElapsed) : "00:00"}
              </div>
            </div>

            {/* Session Indicators - Horizontal */}
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
                    <SelectItem value="10">10 detik</SelectItem>
                    <SelectItem value="15">15 detik</SelectItem>
                    <SelectItem value="20">20 detik</SelectItem>
                    <SelectItem value="25">25 detik</SelectItem>
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
  );
} 