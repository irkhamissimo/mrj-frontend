import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { apiCall } from "@/lib/api";
import { API_BASE_URL } from '@/config';

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
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [todayMemorization, setTodayMemorization] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Use refs to avoid unnecessary re-renders
  const timerIntervalRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);
  const sessionStartTimeRef = useRef(null);

  // Fetch surahs on component mount
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/surahs`, {
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
          // Preserve currentSession if already restored from localStorage
          setTodayMemorization(prev => {
            if (prev?.currentSession && !todayMem.currentSession && prev._id === todayMem._id) {
              return { ...todayMem, currentSession: prev.currentSession };
            }
            return todayMem;
          });
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

    fetchTodayMemorization().finally(() => setInitialLoading(false));
  }, []);

  // Load session state from localStorage on mount
  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        const storedMemorization = localStorage.getItem('todayMemorization');
        const storedSessionStartTime = localStorage.getItem('sessionStartTime');
        const storedIsPaused = localStorage.getItem('isPaused');
        const storedTimeElapsed = localStorage.getItem('timeElapsed');
        
        if (!storedMemorization) return;
        
        const parsedMemorization = JSON.parse(storedMemorization);
        
        if (parsedMemorization.currentSession?._id) {
          const response = await apiCall(`/memorizations/sessions/${parsedMemorization.currentSession._id}/status`);
          const data = await response.json();
          
          if (response.ok && !data.session.completed) {
            setTodayMemorization(prev => {
              // If fetchTodayMemorization already set the base entry, merge in currentSession
              if (prev && prev._id === parsedMemorization._id) {
                return { ...prev, currentSession: data.session };
              }
              return { ...parsedMemorization, currentSession: data.session };
            });
            
            setStartSurah(parsedMemorization.surahNumber?.toString());
            setStartVerse(parsedMemorization.fromVerse?.toString());
            setEndSurah(parsedMemorization.surahNumber?.toString());
            setEndVerse(parsedMemorization.toVerse?.toString());
            setCompletedSessions(parsedMemorization.totalSessionsCompleted || 0);
            
            if (storedIsPaused) {
              setIsPaused(JSON.parse(storedIsPaused));
            }
            
            if (storedTimeElapsed) {
              setTimeElapsed(parseInt(storedTimeElapsed));
            }
            
            if (storedSessionStartTime) {
              sessionStartTimeRef.current = parseInt(storedSessionStartTime);
            }
          } else {
            // Clear storage if session is completed or invalid
            localStorage.removeItem('sessionStartTime');
            localStorage.removeItem('timeElapsed');
            localStorage.removeItem('isPaused');
            localStorage.removeItem('todayMemorization');
          }
        }
      } catch (error) {
        console.error("Failed to initialize from storage:", error);
      }
    };

    initializeFromStorage();
  }, []);

  // Update localStorage when todayMemorization changes
  useEffect(() => {
    if (todayMemorization) {
      localStorage.setItem('todayMemorization', JSON.stringify(todayMemorization));
    } else {
      localStorage.removeItem('todayMemorization');
    }
  }, [todayMemorization]);

  // Optimized timer effect - only updates UI, no API calls
  useEffect(() => {
    // Clear any existing intervals
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Only start timer if there's an active session and it's not paused
    if (todayMemorization?.currentSession && !isPaused && !todayMemorization.currentSession.completed) {
      // Set initial session start time if not set
      if (!sessionStartTimeRef.current) {
        const sessionStart = new Date(todayMemorization.currentSession.startTime).getTime();
        sessionStartTimeRef.current = sessionStart;
        localStorage.setItem('sessionStartTime', sessionStart.toString());
      }

      // Update timer every second (UI only, no API calls)
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const pauseDuration = (todayMemorization.currentSession.totalPauseDuration || 0) * 1000;
        const elapsedMs = now - sessionStartTimeRef.current - pauseDuration;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const newTimeElapsed = Math.min(1500, Math.max(0, elapsedSeconds)); // 25 minutes = 1500 seconds
        
        setTimeElapsed(newTimeElapsed);
        localStorage.setItem('timeElapsed', newTimeElapsed.toString());
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [todayMemorization?.currentSession, isPaused]);

  // Separate effect for periodic status checks (reduced frequency)
  useEffect(() => {
    // Clear any existing status check intervals
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }

    const checkSessionStatus = async () => {
      if (!todayMemorization?.currentSession) return;

      try {
        const response = await apiCall(`/memorizations/sessions/${todayMemorization.currentSession._id}/status`);
        const data = await response.json();

        if (response.ok && data.session) {
          if (data.session.completed) {
            // Clear session data
            setTimeElapsed(1500);
            sessionStartTimeRef.current = null;
            localStorage.removeItem('sessionStartTime');
            localStorage.removeItem('timeElapsed');
            localStorage.removeItem('isPaused');
            localStorage.removeItem('todayMemorization');
            
            // Clear intervals
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            if (statusCheckIntervalRef.current) {
              clearInterval(statusCheckIntervalRef.current);
              statusCheckIntervalRef.current = null;
            }
            
            // Fetch updated today's memorization data
            const memResponse = await apiCall("/memorizations/completedMemorizations");
            const memData = await memResponse.json();
            if (memResponse.ok && memData.length > 0) {
              const todayMem = memData[0];
              setTodayMemorization(todayMem);
              setCompletedSessions(todayMem.totalSessionsCompleted || 0);
            }
          } else {
            // Only update if pause state changed
            if (data.session.isPaused !== isPaused) {
              setIsPaused(data.session.isPaused);
              localStorage.setItem('isPaused', JSON.stringify(data.session.isPaused));
            }
            
            // Update session data if needed
            setTodayMemorization(prev => ({
              ...prev,
              currentSession: data.session
            }));
          }
        }
      } catch (error) {
        console.error("Failed to check session status:", error);
      }
    };

    // Only check status if there's an active session
    // Reduced frequency: check every 5 seconds instead of every second
    if (todayMemorization?.currentSession && !todayMemorization.currentSession.completed) {
      // Check immediately
      checkSessionStatus();
      // Then check every 5 seconds
      statusCheckIntervalRef.current = setInterval(checkSessionStatus, 5000);
    }

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
    };
  }, [todayMemorization?.currentSession?._id]); // Only re-run if session ID changes

  // Memoize the progress calculation
  const timerProgress = useMemo(() => {
    return (timeElapsed / 1500) * 377; // 1500 seconds = 25 minutes
  }, [timeElapsed]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
      
      // If we have today's memorization and it matches current selection
      if (todayMemorization && 
          todayMemorization.surahNumber === startSurahNum && 
          todayMemorization.fromVerse === startVerseNum && 
          todayMemorization.toVerse === endVerseNum) {
        // Start new session with existing entry
        response = await apiCall(`/memorizations/${todayMemorization._id}/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memorizationId: todayMemorization._id
          }),
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

        // Update todayMemorization with new session
        const sessionStart = new Date(data.startTime).getTime();
        sessionStartTimeRef.current = sessionStart;
        localStorage.setItem('sessionStartTime', sessionStart.toString());
        
        setTodayMemorization(prev => ({
          ...prev,
          currentSession: data
        }));
        setTimeElapsed(0);
        setIsPaused(false);
        localStorage.setItem('isPaused', 'false');
      } else {
        // Start new memorization entry
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

        // Set todayMemorization with entry and session data
        const sessionStart = new Date(data.session.startTime).getTime();
        sessionStartTimeRef.current = sessionStart;
        localStorage.setItem('sessionStartTime', sessionStart.toString());
        
        setTodayMemorization({
          ...data.entry,
          currentSession: data.session
        });
        setTimeElapsed(0);
        setIsPaused(false);
        localStorage.setItem('isPaused', 'false');
      }
    } catch (error) {
      console.error("Failed to start memorization:", error);
      alert(error.message);
    }
  };

  const handleTogglePause = async () => {
    if (!todayMemorization?.currentSession) return;

    try {
      const response = await apiCall(`/memorizations/sessions/${todayMemorization.currentSession._id}/pause`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsPaused(!isPaused);
        localStorage.setItem('isPaused', JSON.stringify(!isPaused));
        setTodayMemorization(prev => ({
          ...prev,
          currentSession: data.session
        }));
      }
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };

  const handleFinishMemorization = async () => {
    if (!todayMemorization || !todayMemorization._id) {
      console.error("No active memorization entry found");
      return;
    }

    try {
      const response = await apiCall(`/memorizations/${todayMemorization._id}/finish`, {
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
          const todayMem = memData[0];
          setTodayMemorization(todayMem);
          setCompletedSessions(todayMem.totalSessionsCompleted || 0);
        }

        // Clear states
        setTimeElapsed(0);
        sessionStartTimeRef.current = null;
        
        // Clear localStorage
        localStorage.removeItem('sessionStartTime');
        localStorage.removeItem('timeElapsed');
        localStorage.removeItem('isPaused');

        // Navigate to revision page with the entry ID
        navigate(`/revision/${todayMemorization._id}`);
      }
    } catch (error) {
      console.error("Failed to finish memorization:", error);
      alert("Failed to finish memorization. Please try again.");
    }
  };

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
            {todayMemorization?.currentSession && (
              <circle
                cx="64"
                cy="64"
                r="60"
                className="stroke-primary fill-none"
                strokeWidth="8"
                strokeDasharray={`${timerProgress} 377`}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
            {todayMemorization?.currentSession ? formatTime(timeElapsed) : "25:00"}
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
              disabled={todayMemorization?.currentSession || todayMemorization?.status === "completed"}
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
              disabled={todayMemorization?.currentSession || todayMemorization?.status === "completed"}
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
              disabled={todayMemorization?.currentSession || todayMemorization?.status === "completed"}
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
              disabled={todayMemorization?.currentSession || todayMemorization?.status === "completed"}
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

        {initialLoading ? null : todayMemorization?.status === "completed" ? (
          <Button
            className="w-full"
            onClick={() => navigate(`/revision/${todayMemorization._id}`)}
          >
            Murajaah Hafalan Baru
          </Button>
        ) : (
          <div className="flex gap-4">
            <Button
              className="flex-1"
              onClick={todayMemorization?.currentSession ? handleTogglePause : handleStartMemorization}
              disabled={(!startSurah || !startVerse || !endSurah || !endVerse) && !todayMemorization?.currentSession}
            >
              {todayMemorization?.currentSession 
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
        )}
      </div>
    </div>
  );
}
