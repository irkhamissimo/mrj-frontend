import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

const formatDate = () => {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date().toLocaleDateString('id-ID', options);
};

export default function MemorizationPage() {
  const navigate = useNavigate();
  const [surahs, setSurahs] = useState([]);
  const [startSurah, setStartSurah] = useState(null);
  const [startVerse, setStartVerse] = useState("");
  const [endSurah, setEndSurah] = useState(null);
  const [endVerse, setEndVerse] = useState("");
  const [activeSession, setActiveSession] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);

  // Fetch surahs on component mount
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/surahs", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();
        setSurahs(data);
      } catch (error) {
        console.error("Failed to fetch surahs:", error);
      }
    };
    fetchSurahs();
  }, []);

  // Modify handleSessionComplete to properly update UI
  const handleSessionComplete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/memorizations/sessions/${activeSession._id}/status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.session.completed) {
        setCompletedSessions(prev => prev + 1);
        setActiveSession(null);
        setIsPaused(false);
        setTimeElapsed(0);
      }
    } catch (error) {
      console.error("Failed to complete session:", error);
    }
  };

  // Update the timer effect
  useEffect(() => {
    let interval;
    if (activeSession && !isPaused) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => {
          if (prev >= 25) {
            clearInterval(interval);
            handleSessionComplete();
            return 25;
          }
          return prev + 1;
        });
      }, 1000);

      // Add an additional interval to check session status
      const statusInterval = setInterval(() => {
        handleSessionComplete();
      }, 1000); // Check every second

      return () => {
        clearInterval(interval);
        clearInterval(statusInterval);
      };
    }
    return () => {};
  }, [activeSession, isPaused]);

  const handleStartMemorization = async () => {
    if (!startSurah || !startVerse || !endSurah || !endVerse) return;

    // Validate that end surah/verse comes after start surah/verse
    const startSurahNum = parseInt(startSurah);
    const endSurahNum = parseInt(endSurah);
    const startVerseNum = parseInt(startVerse);
    const endVerseNum = parseInt(endVerse);

    if (startSurahNum > endSurahNum || 
        (startSurahNum === endSurahNum && startVerseNum > endVerseNum)) {
      alert("End point must come after start point");
      return;
    }

    try {
      let response;
      
      if (!currentEntry) {
        // First time - start new memorization
        response = await fetch("http://localhost:5000/api/memorizations/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            surahNumber: startSurahNum,
            fromVerse: startVerseNum,
            toVerse: endVerseNum,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setCurrentEntry(data.entry);
          setActiveSession(data.session);
          setTimeElapsed(0);
        }
      } else {
        // Subsequent times - start new session for existing entry
        response = await fetch(`http://localhost:5000/api/memorizations/${currentEntry._id}/sessions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = await response.json();
        if (response.ok) {
          setActiveSession(data);
          setTimeElapsed(0);
        }
      }
    } catch (error) {
      console.error("Failed to start memorization:", error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTogglePause = async () => {
    if (!activeSession) return;

    try {
      const response = await fetch(`http://localhost:5000/api/memorizations/sessions/${activeSession._id}/pause`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setIsPaused(!isPaused);
      }
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };

  const handleFinishMemorization = async () => {
    if (!currentEntry || completedSessions === 0) return;

    try {
      const response = await fetch(`http://localhost:5000/api/memorizations/${currentEntry._id}/finish`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          confidenceLevel: 5,
          notes: "Completed memorization"
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to revision page with the entry ID
        navigate(`/revision/${currentEntry._id}`);
      }
    } catch (error) {
      console.error("Failed to finish memorization:", error);
    }
  };

  // Add cleanup when all sessions are completed
  useEffect(() => {
    if (completedSessions >= 4) {
      // Reset everything after all sessions are done
      setCurrentEntry(null);
      setCompletedSessions(0);
      setStartSurah(null);
      setStartVerse("");
      setEndSurah(null);
      setEndVerse("");
    }
  }, [completedSessions]);

  // Add effect to check for completed memorization
  useEffect(() => {
    const checkCompletedMemorization = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/memorizations/completed", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();
        
        // If there's a completed memorization, redirect to revision page
        if (response.ok && data.length > 0) {
          navigate(`/revision/${data[0]._id}`);
          return;
        }
      } catch (error) {
        console.error("Failed to check completed memorization:", error);
      }
    };

    checkCompletedMemorization();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Ziyadah</CardTitle>
            <span className="text-sm text-muted-foreground">{formatDate()}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer and Session Indicators */}
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* Main Timer Circle */}
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="60"
                  className="stroke-muted fill-none"
                  strokeWidth="8"
                />
                {activeSession && (
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    className="stroke-primary fill-none"
                    strokeWidth="8"
                    strokeDasharray={`${(timeElapsed / 25) * 377} 377`}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                {activeSession ? formatTime(timeElapsed) : "25:00"}
              </div>
            </div>

            {/* Session Indicators */}
            <div className="flex gap-3">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 border-primary ${
                    index < completedSessions
                      ? "bg-primary"
                      : "bg-background"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Surah and Verse Selection */}
          <div className="space-y-6">
            {/* Starting Point */}
            <div className="space-y-2">
              <Label>Start From</Label>
              <div className="flex gap-4">
                <Select 
                  onValueChange={setStartSurah} 
                  disabled={activeSession !== null}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Surah" />
                  </SelectTrigger>
                  <SelectContent>
                    {surahs.map((surah) => (
                      <SelectItem key={surah.number} value={surah.number.toString()}>
                        {surah.number}. {surah.englishName} ({surah.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {startSurah && (
                  <Select 
                    onValueChange={setStartVerse}
                    disabled={activeSession !== null}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Ayah" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(surahs.find(s => s.number === parseInt(startSurah))?.numberOfAyahs || 0)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Ayah {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Ending Point */}
            <div className="space-y-2">
              <Label>End At</Label>
              <div className="flex gap-4">
                <Select 
                  onValueChange={setEndSurah}
                  disabled={activeSession !== null}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Surah" />
                  </SelectTrigger>
                  <SelectContent>
                    {surahs.map((surah) => (
                      <SelectItem key={surah.number} value={surah.number.toString()}>
                        {surah.number}. {surah.englishName} ({surah.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {endSurah && (
                  <Select 
                    onValueChange={setEndVerse}
                    disabled={activeSession !== null}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Ayah" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(surahs.find(s => s.number === parseInt(endSurah))?.numberOfAyahs || 0)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Ayah {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                className="flex-1"
                onClick={activeSession ? handleTogglePause : handleStartMemorization}
                disabled={(!startSurah || !startVerse || !endSurah || !endVerse) && !activeSession}
              >
                {activeSession 
                  ? (isPaused ? "Lanjutkan" : "Jeda") 
                  : "Mulai"}
              </Button>
              
              <Button
                className="flex-1"
                onClick={handleFinishMemorization}
                disabled={completedSessions === 0}
                variant="secondary"
              >
                Selesai
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}