import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiCall } from "@/lib/api";
import { data } from "autoprefixer";

export default function MurajaahPlayer() {
  const navigate = useNavigate();
  const [type, setType] = useState('juz');
  const [memorizedData, setMemorizedData] = useState({ bySurah: [], byJuz: [] });
  const [startSurah, setStartSurah] = useState("");
  const [endSurah, setEndSurah] = useState("");
  const [startVerse, setStartVerse] = useState("");
  const [endVerse, setEndVerse] = useState("");
  const [juzNumber, setJuzNumber] = useState("1");
  const [activeSession, setActiveSession] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [verifiedMemorizations, setVerifiedMemorizations] = useState([]);

  // Initialize state from localStorage on mount
  useEffect(() => {
    const storedEntry = localStorage.getItem('currentEntry');
    const storedSession = localStorage.getItem('activeSession');
    const storedCompletedSessions = localStorage.getItem('completedSessions');

    if (storedEntry) {
      setCurrentEntry(JSON.parse(storedEntry));
    }
    if (storedSession) {
      setActiveSession(JSON.parse(storedSession));
    }
    if (storedCompletedSessions) {
      setCompletedSessions(parseInt(storedCompletedSessions, 10));
    }
  }, []);

  // Update localStorage whenever currentEntry, activeSession, or completedSessions changes
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

  useEffect(() => {
    localStorage.setItem('completedSessions', completedSessions);
  }, [completedSessions]);

  // Handle storage changes from other tabs
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
    } else if (e.key === 'completedSessions') {
      if (e.newValue) {
        setCompletedSessions(parseInt(e.newValue, 10));
      } else {
        setCompletedSessions(0);
      }
    }
  };

  // Set up the storage event listener
  useEffect(() => {
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sync UI with URL type parameter
  useEffect(() => {
    if (type) {
      setType(type);
    }
  }, [type]);

  // Handle toggle change
  const handleTypeChange = (checked) => {
    const newType = checked ? 'surah' : 'juz';
    setType(newType);
  };

  // Fetch memorized data on component mount
  useEffect(() => {
    const fetchMemorizedData = async () => {
      try {
        const response = await apiCall("/memorized", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setMemorizedData(data);

        // Set initial values if available
        if (data.bySurah.length > 0) {
          const firstSurah = data.bySurah[0];
          setStartSurah(firstSurah.surahNumber);
          if (firstSurah.verses.length > 0) {
            setStartVerse(firstSurah.verses[0].fromVerse);
            setEndVerse(firstSurah.verses[0].toVerse);
          }
        }
        if (data.byJuz.length > 0) {
          setJuzNumber(data.byJuz[0].juzNumber);
        }
      } catch (error) {
        console.error("Failed to fetch memorized data:", error);
      }
    };

    fetchMemorizedData();
  }, []);

  // Update end surah when start surah changes
  useEffect(() => {
    if (startSurah) {
      setEndSurah(startSurah);
    }
  }, [startSurah]);

  // Fetch completed sessions count
  useEffect(() => {
    const fetchCompletedSessions = async () => {
      try {
        const response = await apiCall("/revisions/sessions", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        setCompletedSessions(data.totalSessionsCompleted || 0);
      } catch (error) {
        console.error("Failed to fetch completed sessions:", error);
      }
    };

    fetchCompletedSessions();
  }, []);

  // Check session status
  const checkSessionStatus = async () => {
    if (!activeSession) return;

    try {
      const response = await apiCall(`/revisions/${activeSession._id}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!data || !data.session) {
        return;
      }

      if (response.ok && data.session.completed) {
        // Fetch latest completed sessions after completion
        const sessionsResponse = await apiCall("/revisions/sessions", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const sessionsData = await sessionsResponse.json();
        setCompletedSessions(sessionsData.totalSessionsCompleted || 0);
        
        setActiveSession(null);
        setIsPaused(false);
        setTimeElapsed(25); // Set to max duration when completed
        navigate('/murajaah');
      }
    } catch (error) {
      console.error("Failed to check session status:", error);
    }
  };

  // Start revision session
  const handleStartRevision = async () => {
    try {
      // make duration 25 seconds
      const duration = 25;
      const response = await apiCall("/revisions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          identifier: parseInt(type === 'juz' ? juzNumber : startSurah),
          duration: duration
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        setVerifiedMemorizations(data.verifiedMemorizations);
        setTimeElapsed(0);
        setIsPaused(false);
      }
    } catch (error) {
      console.error("Failed to start revision:", error);
    }
  };

  // Toggle pause/resume
  const handleTogglePause = async () => {
    if (!activeSession) return;

    try {
      const response = await apiCall(`/revisions/${activeSession._id}/pause`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsPaused(!isPaused);
        setActiveSession(data.session);
      }
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };

  // Timer effect with session status check
  useEffect(() => {
    let interval;
    let statusInterval;

    if (activeSession && !isPaused) {
      // Calculate initial elapsed time from session start
      const now = new Date();
      const startTime = new Date(activeSession.startTime);
      const pauseDuration = activeSession.totalPauseDuration || 0;
      const initialElapsed = Math.floor((now - startTime) / 1000) - (pauseDuration * 60);
      setTimeElapsed(Math.min(25, Math.max(0, initialElapsed)));

      interval = setInterval(() => {
        setTimeElapsed((prev) => {
          if (prev >= 25) {
            clearInterval(interval);
            return 25;
          }
          return prev + 1;
        });
      }, 1000);

      // Add status check interval
      statusInterval = setInterval(() => {
        checkSessionStatus();
      }, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(statusInterval);
      };
    }
    return () => {
      if (interval) clearInterval(interval);
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [activeSession, isPaused]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get available verses for selected surah
  const getAvailableVerses = (surahNumber) => {
    const surah = memorizedData.bySurah.find(s => s.surahNumber === surahNumber);
    if (!surah || !surah.verses) return [];
    
    // Parse verse range from string (e.g., "1 - 7")
    const [start, end] = surah.verses.split(" - ").map(Number);
    
    // Generate array of available verses
    const allVerses = [];
    for (let i = start; i <= end; i++) {
      allVerses.push(i);
    }
    return allVerses;
  };

  // Get available end verses for selected surah and start verse
  const getAvailableEndVerses = (surahNumber, startVerse) => {
    const surah = memorizedData.bySurah.find(s => s.surahNumber === surahNumber);
    if (!surah || !surah.verses) return [];
    
    // Parse verse range from string (e.g., "1 - 7")
    const [start, end] = surah.verses.split(" - ").map(Number);
    
    // If start verse is within range, return all verses from start verse to end
    const startVerseNum = parseInt(startVerse);
    if (startVerseNum >= start && startVerseNum <= end) {
      const endVerses = [];
      for (let i = startVerseNum; i <= end; i++) {
        endVerses.push(i);
      }
      return endVerses;
    }
    
    return [];
  };

  // Update end verse options when start verse changes
  useEffect(() => {
    if (startVerse && endSurah === startSurah) {
      const availableEndVerses = getAvailableEndVerses(startSurah, startVerse);
      if (availableEndVerses.length > 0) {
        setEndVerse(availableEndVerses[0].toString());
      }
    }
  }, [startVerse, startSurah, endSurah]);

  // add storage event listener for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'activeSession') {
        if (e.newValue) {
          setActiveSession(JSON.parse(e.newValue));
        } else {
          setActiveSession(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Murajaah</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="mode">{type === 'surah' ? 'Surah' : 'Juz'}</Label>
              <Switch 
                id="mode" 
                checked={type === 'surah'}
                onCheckedChange={handleTypeChange}
              />
            </div>
            {/* Session indicators */}
            <div className="flex gap-1">
              {[...Array(5)].map((_, idx) => (
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
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="relative w-32 h-32 mx-auto">
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
                className={cn(
                  "fill-none transition-all duration-500",
                  timeElapsed >= 25 ? "stroke-green-500" : "stroke-primary"
                )}
                strokeWidth="8"
                strokeDasharray={`${(timeElapsed / 25) * 377} 377`}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
            {formatTime(timeElapsed)}
          </div>
        </div>

        {type === 'surah' ? (
          <>
            {/* Surah Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dari Surat</Label>
                <Select onValueChange={setStartSurah} value={startSurah}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Surat" />
                  </SelectTrigger>
                  <SelectContent>
                    {memorizedData.bySurah.map((surah) => (
                      <SelectItem key={surah.surahNumber} value={surah.surahNumber}>
                        {surah.surahName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ayat</Label>
                <Select onValueChange={setStartVerse} value={startVerse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Ayat" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableVerses(startSurah).map((verse) => (
                      <SelectItem key={verse} value={verse.toString()}>
                        Ayat {verse}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sampai Surat</Label>
                <Select onValueChange={setEndSurah} value={endSurah}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Surat" />
                  </SelectTrigger>
                  <SelectContent>
                    {memorizedData.bySurah.map((surah) => (
                      <SelectItem key={surah.surahNumber} value={surah.surahNumber}>
                        {surah.surahName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ayat</Label>
                <Select 
                  onValueChange={setEndVerse} 
                  value={endVerse}
                  disabled={!startVerse || endSurah !== startSurah}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Ayat" />
                  </SelectTrigger>
                  <SelectContent>
                    {endSurah === startSurah && startVerse ? 
                      getAvailableEndVerses(endSurah, startVerse).map((verse) => (
                        <SelectItem key={verse} value={verse.toString()}>
                          Ayat {verse}
                        </SelectItem>
                      ))
                      :
                      getAvailableVerses(endSurah).map((verse) => (
                        <SelectItem key={verse} value={verse}>
                          Ayat {verse}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label>Juz</Label>
            <Select onValueChange={setJuzNumber} value={juzNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Juz" />
              </SelectTrigger>
              <SelectContent>
                {memorizedData.byJuz.map((juz) => (
                  <SelectItem key={juz.juzNumber} value={juz.juzNumber}>
                    Juz {juz.juzNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Control Button */}
        <Button
          className="w-full"
          onClick={activeSession ? handleTogglePause : handleStartRevision}
          disabled={type === 'surah' ? !startVerse || !endVerse : !juzNumber}
        >
          {activeSession 
            ? (isPaused ? "Lanjutkan" : "Jeda") 
            : "Mulai"}
        </Button>
      </CardContent>
    </Card>
  );
} 