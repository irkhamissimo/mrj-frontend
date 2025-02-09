import { useState, useEffect, useCallback, useMemo } from "react";
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

  // Memoize the timer calculation to reduce unnecessary updates
  const calculateTimeElapsed = useCallback(() => {
    if (!todayMemorization?.currentSession || isPaused) return 0;

    const sessionStartTime = localStorage.getItem('sessionStartTime');
    if (!sessionStartTime) return 0;

    const now = Date.now();
    const pauseDuration = (todayMemorization.currentSession.totalPauseDuration || 0) * 60 * 1000;
    const elapsedMs = now - parseInt(sessionStartTime) - pauseDuration;
    return Math.min(25, Math.max(0, Math.floor(elapsedMs / 1000)));
  }, [todayMemorization?.currentSession, isPaused]);

  // Load session state from localStorage on mount
  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        const storedMemorization = localStorage.getItem('todayMemorization');
        const storedSessionStartTime = localStorage.getItem('sessionStartTime');
        const storedIsPaused = localStorage.getItem('isPaused');
        const storedTimeElapsed = localStorage.getItem('timeElapsed');
        
        if (storedMemorization && formatDate() === todayMemorization?.dateStarted) {
          const parsedMemorization = JSON.parse(storedMemorization);
          setTodayMemorization(parsedMemorization);
          
          if (parsedMemorization.currentSession?._id) {
            const response = await apiCall(`/memorizations/sessions/${parsedMemorization.currentSession._id}/status`);
            const data = await response.json();
            
            if (response.ok && !data.session.completed) {
              setTodayMemorization(prev => ({
                ...prev,
                currentSession: data.session
              }));
              
              if (storedIsPaused) {
                setIsPaused(JSON.parse(storedIsPaused));
              }
              
              if (storedTimeElapsed) {
                setTimeElapsed(parseInt(storedTimeElapsed));
              }
            } else {
              // Clear storage if session is completed or invalid
              localStorage.removeItem('sessionStartTime');
              localStorage.removeItem('timeElapsed');
              localStorage.removeItem('isPaused');
              localStorage.removeItem('todayMemorization');
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize from storage:", error);
      }
    };

    initializeFromStorage();
  }, []);

  // Add storage event listener for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'todayMemorization') {
        if (e.newValue) {
          const newMemorization = JSON.parse(e.newValue);
          setTodayMemorization(newMemorization);
        } else {
          setTodayMemorization(null);
        }
      } else if (e.key === 'sessionStartTime') {
        if (e.newValue) {
          const newElapsed = calculateTimeElapsed();
          setTimeElapsed(newElapsed);
        } else {
          setTimeElapsed(0);
        }
      } else if (e.key === 'timeElapsed') {
        if (e.newValue) {
          setTimeElapsed(parseInt(e.newValue));
        }
      } else if (e.key === 'isPaused') {
        if (e.newValue) {
          setIsPaused(JSON.parse(e.newValue));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [calculateTimeElapsed]);

  // Update localStorage when todayMemorization changes
  useEffect(() => {
    if (todayMemorization) {
      localStorage.setItem('todayMemorization', JSON.stringify(todayMemorization));
    } else {
      localStorage.removeItem('todayMemorization');
    }
  }, [todayMemorization]);

  // Effect for checking session status and updating timer
  useEffect(() => {
    let timerInterval;
    let statusInterval;

    const checkSessionStatus = async () => {
      if (!todayMemorization?.currentSession) return;

      try {
        const response = await apiCall(`/memorizations/sessions/${todayMemorization.currentSession._id}/status`);
        const data = await response.json();

        if (response.ok && data.session) {
          if (data.session.completed) {
            // Clear session data
            setTimeElapsed(25);
            localStorage.removeItem('sessionStartTime');
            localStorage.removeItem('timeElapsed');
            localStorage.removeItem('isPaused');
            localStorage.removeItem('todayMemorization');
            
            // Fetch updated today's memorization data
            const memResponse = await apiCall("/memorizations/completedMemorizations");
            const memData = await memResponse.json();
            if (memResponse.ok && memData.length > 0) {
              const todayMem = memData[0];
              setTodayMemorization(todayMem);
              setCompletedSessions(todayMem.totalSessionsCompleted || 0);
            }
          } else {
            // Calculate elapsed time
            const startTime = new Date(data.session.startTime);
            const now = new Date();
            const elapsed = Math.floor((now - startTime) / 1000);
            const pauseDuration = data.session.totalPauseDuration || 0;
            const adjustedElapsed = Math.floor(Math.max(0, elapsed - pauseDuration));
            setTimeElapsed(Math.min(25, adjustedElapsed));
            setIsPaused(data.session.isPaused);
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

    // Only start checking status if there's an active session and it's not paused
    if (todayMemorization?.currentSession && !isPaused) {
      // Check immediately and then set interval
      checkSessionStatus();
      statusInterval = setInterval(checkSessionStatus, 1000);
    }

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [todayMemorization?.currentSession, isPaused]);

  // Memoize the progress calculation
  const timerProgress = useMemo(() => {
    return (timeElapsed / 25) * 377;
  }, [timeElapsed]);

  // Clean up localStorage on component unmount
  useEffect(() => {
    return () => {
      localStorage.removeItem('sessionStartTime');
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
        setTodayMemorization(prev => ({
          ...prev,
          currentSession: data
        }));
        setTimeElapsed(0);
        setIsPaused(false);
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
        setTodayMemorization({
          ...data.entry,
          currentSession: data.session
        });
        setTimeElapsed(0);
        setIsPaused(false);
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
        
        // Clear localStorage
        localStorage.removeItem('sessionStartTime');

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

        <div className="flex gap-4">
          <Button
            className="flex-1"
            onClick={todayMemorization?.currentSession ? handleTogglePause : handleStartMemorization}
            disabled={
              (!startSurah || !startVerse || !endSurah || !endVerse) && !todayMemorization?.currentSession ||
              todayMemorization?.status === "completed"
            }
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
      </div>
    </div>
  );
}