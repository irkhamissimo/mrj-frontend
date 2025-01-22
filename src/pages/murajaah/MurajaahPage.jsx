import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ChevronUp, ChevronDown, Play, Circle, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

function SessionIndicators({ completedSessions = 0, elapsedTime = 0, duration = 25 }) {
  // Convert duration to seconds for calculation (25 seconds for testing)
  const durationInSeconds = duration; // Changed from duration * 60
  const progress = (elapsedTime / durationInSeconds) * 100;
  const circumference = 2 * Math.PI * 28; // 28 is the radius of our circle

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Main timer circle with animation */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="32"
            cy="32"
            r="28"
            className="stroke-muted fill-none"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx="32"
            cy="32"
            r="28"
            className="stroke-primary fill-none transition-all duration-500"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (progress / 100) * circumference}
          />
        </svg>
        <span className="absolute text-sm font-medium">{formatTime(elapsedTime)}</span>
      </div>
      {/* Small session indicators */}
      <div className="flex gap-1">
        {[...Array(4)].map((_, idx) => (
          <Circle 
            key={idx} 
            className={cn(
              "w-4 h-4",
              idx < completedSessions ? "fill-green-500 text-green-500" : "fill-transparent"
            )} 
          />
        ))}
      </div>
    </div>
  );
}

export default function MurajaahPage() {
  const [memorizedData, setMemorizedData] = useState({ bySurah: [], byJuz: [] });
  const [loading, setLoading] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [activeSession, setActiveSession] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Fetch memorized data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch memorized data
        const memResponse = await fetch("http://localhost:5000/api/memorized", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const memData = await memResponse.json();
        setMemorizedData(memData);

        // Fetch completed sessions
        const sessionsResponse = await fetch("http://localhost:5000/api/revisions/memorized", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const sessionsData = await sessionsResponse.json();
        setCompletedSessions(sessionsData.totalSessionsCompleted || 0);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  // Load session state from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('activeSession');
    const savedIsPaused = localStorage.getItem('isPaused');
    const savedElapsedTime = localStorage.getItem('elapsedTime');

    if (savedSession) setActiveSession(JSON.parse(savedSession));
    if (savedIsPaused) setIsPaused(JSON.parse(savedIsPaused));
    if (savedElapsedTime) setElapsedTime(parseInt(savedElapsedTime));
  }, []);

  // Save session state to localStorage when it changes
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('activeSession', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('activeSession');
    }
    localStorage.setItem('isPaused', JSON.stringify(isPaused));
    localStorage.setItem('elapsedTime', elapsedTime.toString());
  }, [activeSession, isPaused, elapsedTime]);

  // Effect for checking session status
  useEffect(() => {
    let intervalId;

    const checkSessionStatus = async () => {
      if (!activeSession) return;

      try {
        const response = await fetch(
          `http://localhost:5000/api/revisions/${activeSession._id}/status`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await response.json();

        if (data.session.completed) {
          setActiveSession(null);
          setElapsedTime(0);
          localStorage.removeItem('activeSession');
          
          // Fetch updated completed sessions count
          const sessionsResponse = await fetch("http://localhost:5000/api/revisions/memorized", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          const sessionsData = await sessionsResponse.json();
          setCompletedSessions(sessionsData.totalSessionsCompleted || 0);
        } else {
          // Calculate elapsed time
          const startTime = new Date(data.session.startTime);
          const now = new Date();
          const elapsed = Math.floor((now - startTime) / 1000);
          const pauseDuration = (data.session.totalPauseDuration || 0);
          setElapsedTime(Math.min(25, elapsed - pauseDuration));
          setIsPaused(data.session.isPaused);
        }
      } catch (error) {
        console.error("Failed to check session status:", error);
      }
    };

    if (activeSession) {
      // Check immediately and then set interval
      checkSessionStatus();
      intervalId = setInterval(checkSessionStatus, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeSession]);

  const handleStartRevision = async (type, identifier) => {
    try {
      const response = await fetch("http://localhost:5000/api/revisions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          type,
          identifier,
          duration: 25
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        setElapsedTime(0);
        setIsPaused(false);
      } else {
        console.error("Failed to start revision:", response);
      }
    } catch (error) {
      console.error("Failed to start revision:", error);
    }
  };

  const handleTogglePause = async () => {
    if (!activeSession) return;

    try {
      const response = await fetch(`http://localhost:5000/api/revisions/${activeSession._id}/pause`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsPaused(data.session.isPaused);
        setActiveSession(data.session);
      }
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };

  const handleAddMemorizedSurah = async (surahNumber, fromVerse, toVerse) => {
    try {
      const response = await fetch("http://localhost:5000/api/memorized/surah", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ surahNumber, fromVerse, toVerse }),
      });
      if (response.ok) {
        // Refresh data
        const data = await response.json();
        setMemorizedData(prev => ({
          ...prev,
          bySurah: [...prev.bySurah, data]
        }));
      }
    } catch (error) {
      console.error("Failed to add memorized surah:", error);
    }
  };

  const handleAddMemorizedJuz = async (juzNumber) => {
    try {
      const response = await fetch("http://localhost:5000/api/memorized/juz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ juzNumber }),
      });
      if (response.ok) {
        // Refresh data
        const data = await response.json();
        setMemorizedData(prev => ({
          ...prev,
          byJuz: [...prev.byJuz, data]
        }));
      }
    } catch (error) {
      console.error("Failed to add memorized juz:", error);
    }
  };

  const handleUpdateVerses = async (surahNumber, verseIndex, direction) => {
    if (loading) return;
    setLoading(true);

    try {
      const surah = memorizedData.bySurah.find(s => s.surahNumber === surahNumber);
      if (!surah) return;

      const verse = surah.verses[verseIndex];
      const newToVerse = direction === 'up' ? verse.toVerse + 1 : verse.toVerse - 1;

      // Only update if the new verse range is valid
      if (newToVerse >= verse.fromVerse) {
        const response = await fetch(`http://localhost:5000/api/memorized/update-verses/${surahNumber}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            verses: {
              fromVerse: verse.fromVerse,
              toVerse: newToVerse
            }
          }),
        });

        if (response.ok) {
          // Refresh the data
          const response = await fetch("http://localhost:5000/api/memorized", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          const data = await response.json();
          setMemorizedData(data);
        }
      }
    } catch (error) {
      console.error("Failed to update verses:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-bold">Murajaah</CardTitle>
        <div className="flex items-center gap-4">
          <SessionIndicators 
            completedSessions={completedSessions}
            elapsedTime={elapsedTime}
            duration={25}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="surat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="surat">Surat</TabsTrigger>
            <TabsTrigger value="juz">Juz</TabsTrigger>
          </TabsList>

          <TabsContent value="surat" className="space-y-4">
            {memorizedData.bySurah.map((surah) => (
              <div key={surah.surahNumber} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {surah.surahName} ({surah.surahNumber}) - {surah.verses.map((verse, idx) => (
                      <span key={idx}>
                        {verse.fromVerse}-{verse.toVerse}
                        {idx < surah.verses.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </h3>
                  {activeSession?.verifiedMemorizations?.some(
                    mem => mem.surahNumber === surah.surahNumber
                  ) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleTogglePause}
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartRevision('surah', surah.surahNumber)}
                      disabled={activeSession !== null}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button className="w-full" variant="outline" disabled={activeSession}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Surat yang Dihafal
            </Button>
          </TabsContent>

          <TabsContent value="juz" className="space-y-4">
            {memorizedData.byJuz.map((juz) => (
              <div key={juz.juzNumber} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Juz {juz.juzNumber}</h3>
                  {activeSession?.verifiedMemorizations?.some(
                    mem => mem.juzNumber === juz.juzNumber
                  ) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleTogglePause}
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartRevision('juz', juz.juzNumber)}
                      disabled={activeSession !== null}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-2 space-y-2">
                  {Object.values(juz.surahs).map((surah) => (
                    <div key={surah.surahNumber} className="ml-4">
                      <p className="text-sm">
                        {surah.surahName} - Ayat {surah.verses.map((verse, idx) => (
                          <span key={idx}>
                            {verse.fromVerse}-{verse.toVerse}
                            {idx < surah.verses.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button className="w-full" variant="outline" disabled={activeSession}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Juz yang Sudah Dihafal
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 