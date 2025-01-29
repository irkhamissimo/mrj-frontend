import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
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
  const [todayMemorization, setTodayMemorization] = useState(null);

  // Fetch surahs on component mount
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/surahs", {
        });
        const data = await response.json();
        setSurahs(data);
      } catch (error) {
        console.error("Failed to fetch surahs:", error);
      }
    };
    fetchSurahs();
  }, []);

  // Add new useEffect to fetch today's memorization data
  useEffect(() => {
    const fetchTodayMemorization = async () => {
      try {
        const response = await apiCall("/memorizations/completedMemorizations", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (response.ok && data.length > 0) {
          const todayMem = data[0];
          setTodayMemorization(todayMem);
          // Set the form values based on today's memorization
          setStartSurah(todayMem.surahNumber.toString());
          setStartVerse(todayMem.fromVerse.toString());
          setEndSurah(todayMem.surahNumber.toString());
          setEndVerse(todayMem.toVerse.toString());
          setCompletedSessions(todayMem.totalSessionsCompleted || 0);
        }
      } catch (error) {
        console.error("Failed to fetch today's memorization:", error);
      }
    };

    fetchTodayMemorization();
  }, []);

  // Effect for checking session status and updating timer
  useEffect(() => {
    let timerInterval;
    let statusInterval;
    
    const updateTimer = () => {
      if (!activeSession || isPaused) return;

      // Get session start time from localStorage or set it
      let sessionStartTime = localStorage.getItem('sessionStartTime');
      if (!sessionStartTime && activeSession) {
        sessionStartTime = new Date(activeSession.startTime).getTime();
        localStorage.setItem('sessionStartTime', sessionStartTime);
      }

      if (sessionStartTime) {
        const now = Date.now();
        const pauseDuration = (activeSession.totalPauseDuration || 0) * 60 * 1000; // Convert minutes to milliseconds
        const elapsedMs = now - parseInt(sessionStartTime) - pauseDuration;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        setTimeElapsed(Math.min(25, Math.max(0, elapsedSeconds)));
      }
    };

    const checkSessionStatus = async () => {
      if (!activeSession) return;

      try {
        const response = await apiCall(`/memorizations/sessions/${activeSession._id}/status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();

        if (response.ok && data.session) {
          if (data.session.completed) {
            // Clear both session and entry data
            setActiveSession(null);
            setCurrentEntry(null);
            setTimeElapsed(25);
            localStorage.removeItem('sessionStartTime');
            localStorage.removeItem('activeSession');
            localStorage.removeItem('currentEntry');
            
            // Fetch updated today's memorization data
            const memResponse = await apiCall("/memorizations/completedMemorizations", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });
            
            const memData = await memResponse.json();
            if (memResponse.ok && memData.length > 0) {
              setTodayMemorization(memData[0]);
            }
          } else {
            setIsPaused(data.session.isPaused || false);
            // Update activeSession with latest data
            setActiveSession(data.session);
            
            // Fetch and update current entry data if not present
            if (!currentEntry) {
              const entryResponse = await apiCall(`/memorizations/${data.session.memorizationId}`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              });
              const entryData = await entryResponse.json();
              if (entryResponse.ok) {
                setCurrentEntry(entryData);
                localStorage.setItem('currentEntry', JSON.stringify(entryData));
              }
            }
          }
        } else {
          // Handle case where session data is not available
          setActiveSession(null);
          setCurrentEntry(null);
          setTimeElapsed(0);
          localStorage.removeItem('sessionStartTime');
          localStorage.removeItem('activeSession');
          localStorage.removeItem('currentEntry');
        }
      } catch (error) {
        console.error("Failed to check session status:", error);
        // Clean up both session and entry data on error
        setActiveSession(null);
        setCurrentEntry(null);
        setTimeElapsed(0);
        localStorage.removeItem('sessionStartTime');
        localStorage.removeItem('activeSession');
        localStorage.removeItem('currentEntry');
      }
    };

    if (activeSession) {
      // Initial update
      updateTimer();
      checkSessionStatus();

      // Set up intervals
      timerInterval = setInterval(updateTimer, 100); // More frequent updates for smoother timer
      statusInterval = setInterval(checkSessionStatus, 1000); // Check status every second

      return () => {
        clearInterval(timerInterval);
        clearInterval(statusInterval);
      };
    } else {
      // Clean up when session ends
      localStorage.removeItem('sessionStartTime');
    }
  }, [activeSession, isPaused]);

  // Clean up localStorage on component unmount
  useEffect(() => {
    return () => {
      localStorage.removeItem('sessionStartTime');
    };
  }, []);

  // Add effect to initialize state from localStorage on mount
  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        // Get active session from localStorage
        const storedSession = localStorage.getItem('activeSession');
        const storedEntry = localStorage.getItem('currentEntry');
        
        if (storedSession && storedEntry) {
          const session = JSON.parse(storedSession);
          const entry = JSON.parse(storedEntry);
          
          // Compare dates
          const today = new Date().toLocaleDateString();
          const entryDate = new Date(entry.dateStarted).toLocaleDateString();
          
          if (today !== entryDate) {
            // Clear storage if entry is not from today
            localStorage.removeItem('activeSession');
            localStorage.removeItem('currentEntry');
            localStorage.removeItem('sessionStartTime');
            setActiveSession(null);
            setCurrentEntry(null);
            return;
          }
          
          // Verify if session is still active via API
          const response = await apiCall(`/memorizations/sessions/${session._id}/status`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          const data = await response.json();
          
          if (response.ok && !data.session.completed) {
            setActiveSession(session);
            setCurrentEntry(entry);
            setIsPaused(data.session.isPaused || false);
            
            // Set other related states
            setStartSurah(entry.surahNumber.toString());
            setStartVerse(entry.fromVerse.toString());
            setEndSurah(entry.surahNumber.toString());
            setEndVerse(entry.toVerse.toString());
          } else {
            // Clear storage if session is completed or invalid
            localStorage.removeItem('sessionStartTime');
          }
        }
      } catch (error) {
        console.error("Failed to initialize from storage:", error);
      }
    };

    initializeFromStorage();
  }, []);

  // Remove localStorage handling for completedSessions since it comes from todayMemorization
  useEffect(() => {
    const storedEntry = localStorage.getItem('currentEntry');
    const storedSession = localStorage.getItem('activeSession');

    if (storedEntry) {
      setCurrentEntry(JSON.parse(storedEntry));
    }
    if (storedSession) {
      setActiveSession(JSON.parse(storedSession));
    }
  }, []);

  // Remove completedSessions from localStorage updates
  useEffect(() => {
    if (currentEntry) {
      localStorage.setItem('currentEntry', JSON.stringify(currentEntry));
    }
  }, [currentEntry]);

  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('activeSession', JSON.stringify(activeSession));
    }
  }, [activeSession]);

  // Modify handleStartMemorization to store session data
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
      
      // Check if current entry exists and is not completed
      if (!currentEntry || currentEntry.status === "completed") {
        // First time or previous entry was completed - start new memorization
        response = await apiCall("/memorizations/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            surahNumber: startSurahNum,
            fromVerse: startVerseNum,
            toVerse: endVerseNum,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to start memorization');
        }

        setCurrentEntry(data.entry);
        setActiveSession(data.session);
        setTimeElapsed(0);
        
        // Store in localStorage
        localStorage.setItem('currentEntry', JSON.stringify(data.entry));
        localStorage.setItem('activeSession', JSON.stringify(data.session));
        localStorage.setItem('sessionStartTime', new Date(data.session.startTime).getTime());
      } else {
        // Current entry exists and is not completed - start new session
        response = await apiCall(`/memorizations/${currentEntry._id}/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        if (!response.ok) {
          // Handle specific error cases
          if (data.error === "Previous session is still in progress") {
            alert("Previous session is still in progress. Please wait for it to complete.");
            return;
          }
          if (data.error === "Maximum 4 sessions allowed per entry") {
            alert("You have completed all sessions for today.");
            return;
          }
          throw new Error(data.error || 'Failed to start session');
        }

        setActiveSession(data);
        setTimeElapsed(0);
        
        // Store in localStorage
        localStorage.setItem('activeSession', JSON.stringify(data));
        localStorage.setItem('sessionStartTime', new Date(data.startTime).getTime());
      }
    } catch (error) {
      console.error("Failed to start memorization:", error);
      alert(error.message);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Modify handleTogglePause to update localStorage
  const handleTogglePause = async () => {
    if (!activeSession) return;

    try {
      const response = await apiCall(`/memorizations/sessions/${activeSession._id}/pause`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsPaused(!isPaused);
        setActiveSession(data.session);
        
        // Update localStorage
        localStorage.setItem('activeSession', JSON.stringify(data.session));
      }
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };

  const handleFinishMemorization = async () => {
    if (!currentEntry) return;
    try {
      const response = await apiCall(`/memorizations/${currentEntry.id}/finish`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confidenceLevel: 5,
          notes: "Completed memorization"
        }),
      });

      if (response.ok) {
        // After finishing, fetch updated todayMemorization which includes completedSessions
        const memResponse = await apiCall("/memorizations/completedMemorizations", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        const memData = await memResponse.json();
        if (memResponse.ok && memData.length > 0) {
          setTodayMemorization(memData[0]);
          setCompletedSessions(memData[0].totalSessionsCompleted || 0);
        }

        // Navigate to revision page with the entry ID
        navigate(`/revision/${currentEntry._id}`);
      }
    } catch (error) {
      console.error("Failed to finish memorization:", error);
    }
  };

  // Add storage event listener for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'activeSession') {
        if (e.newValue) {
          setActiveSession(JSON.parse(e.newValue));
        } else {
          setActiveSession(null);
        }
      } else if (e.key === 'currentEntry') {
        if (e.newValue) {
          setCurrentEntry(JSON.parse(e.newValue));
        } else {
          setCurrentEntry(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="space-y-4">
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
                todayMemorization?.totalSessionsCompleted > index
                  ? "bg-green-400"
                  : "bg-background"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Rest of the existing content without the outer Card and Tabs */}
      <div className="space-y-6">
        {/* Starting Point */}
        <div className="space-y-2">
          <Label>Start From</Label>
          <div className="flex gap-4">
            <Select 
              onValueChange={setStartSurah} 
              value={startSurah}
              disabled={activeSession !== null || todayMemorization?.status === "completed"}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select Surah" />
              </SelectTrigger>
              <SelectContent>
                {surahs.map((surah) => (
                  <SelectItem key={surah.number} value={surah.number.toString()}>
                    {surah.englishName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              onValueChange={setStartVerse}
              value={startVerse}
              disabled={activeSession !== null || todayMemorization?.status === "completed"}
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
          </div>
        </div>

        {/* Ending Point */}
        <div className="space-y-2">
          <Label>End At</Label>
          <div className="flex gap-4">
            <Select 
              onValueChange={setEndSurah}
              value={endSurah}
              disabled={activeSession !== null || todayMemorization?.status === "completed"}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select Surah" />
              </SelectTrigger>
              <SelectContent>
                {surahs.map((surah) => (
                  <SelectItem key={surah.number} value={surah.number.toString()}>
                    {surah.englishName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              onValueChange={setEndVerse}
              value={endVerse}
              disabled={activeSession !== null || todayMemorization?.status === "completed"}
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
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            className="flex-1"
            onClick={activeSession ? handleTogglePause : handleStartMemorization}
            disabled={
              (!startSurah || !startVerse || !endSurah || !endVerse) && !activeSession ||
              todayMemorization?.status === "completed"
            }
          >
            {activeSession 
              ? (isPaused ? "Lanjutkan" : "Jeda") 
              : "Mulai"}
          </Button>
          
          <Button
            className="flex-1"
            onClick={handleFinishMemorization}
            variant="secondary"
          >
            Selesai
          </Button>
        </div>
      </div>
    </div>
  );
}