import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Play,
  Circle,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { apiCall } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { popoverClasses } from "@mui/material";

function SessionIndicators({
  completedSessions = 0,
  elapsedTime = 0,
  duration = 25,
}) {
  // Convert duration to seconds for calculation (25 seconds for testing)
  const durationInSeconds = duration; // Changed from duration * 60
  const progress = (elapsedTime / durationInSeconds) * 100;
  const circumference = 2 * Math.PI * 28; // 28 is the radius of our circle

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
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
        <span className="absolute text-sm font-medium">
          {formatTime(elapsedTime)}
        </span>
      </div>
      {/* Small session indicators */}
      <div className="flex gap-1">
        {[...Array(4)].map((_, idx) => (
          <Circle
            key={idx}
            className={cn(
              "w-4 h-4",
              idx < completedSessions
                ? "fill-green-500 text-green-500"
                : "fill-transparent"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default function MurajaahPage() {
  const navigate = useNavigate();
  const [memorizedData, setMemorizedData] = useState({
    bySurah: [],
    byJuz: [],
  });
  const [loading, setLoading] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [activeSession, setActiveSession] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [fromVerse, setFromVerse] = useState("");
  const [toVerse, setToVerse] = useState("");
  const [selectedJuz, setSelectedJuz] = useState("");
  const [showSurahDialog, setShowSurahDialog] = useState(false);
  const [showJuzDialog, setShowJuzDialog] = useState(false);

  // Fetch surahs for the select dropdown
  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await apiCall("/surahs", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
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

  // Fetch memorized data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch memorized data
        const memResponse = await apiCall("/memorized");
        const memData = await memResponse.json();
        setMemorizedData(memData);

        // Fetch completed sessions
        const sessionsResponse = await apiCall("/revisions/sessions");
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
    const savedSession = localStorage.getItem("activeSession");
    const savedIsPaused = localStorage.getItem("isPaused");
    const savedElapsedTime = localStorage.getItem("elapsedTime");

    if (savedSession) setActiveSession(JSON.parse(savedSession));
    if (savedIsPaused) setIsPaused(JSON.parse(savedIsPaused));
    if (savedElapsedTime) setElapsedTime(parseInt(savedElapsedTime));
  }, []);

  // Save session state to localStorage when it changes
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem("activeSession", JSON.stringify(activeSession));
    } else {
      localStorage.removeItem("activeSession");
    }
    localStorage.setItem("isPaused", JSON.stringify(isPaused));
    localStorage.setItem("elapsedTime", elapsedTime.toString());
  }, [activeSession, isPaused, elapsedTime]);

  // Effect for checking session status
  useEffect(() => {
    let intervalId;

    const checkSessionStatus = async () => {
      if (!activeSession) return;

      try {
        const response = await apiCall(
          `/revisions/${activeSession._id}/status`
        );
        const data = await response.json();
        // Check if the response is valid and contains a session
        if (!data || !data.session) {
          // console.error("Session data is not available:", data);
          return; // Exit if session data is not available
        }

        if (data.session.completed) {
          setActiveSession(null);
          setElapsedTime(0);
          localStorage.removeItem("activeSession");

          // Fetch updated completed sessions count
          const sessionsResponse = await apiCall("/revisions/sessions");
          const sessionsData = await sessionsResponse.json();
          setCompletedSessions(sessionsData.totalSessionsCompleted || 0);
        } else {
          // Calculate elapsed time
          const startTime = new Date(data.session.startTime);
          const now = new Date();
          const elapsed = Math.floor((now - startTime) / 1000);
          const pauseDuration = data.session.totalPauseDuration || 0;
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

  const handleStartMurajaah = async (type, identifier) => {
    try {
      // Start a new revision session
      const response = await apiCall("/revisions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: type,
          identifier: identifier,
          duration: 25 // 25 seconds duration
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.session);
        setElapsedTime(0);
        setIsPaused(false);
      }
    } catch (error) {
      console.error("Failed to start revision:", error);
    }
  };

  const handleAddMemorizedSurah = async (surahNumber, fromVerse, toVerse) => {
    try {
      const response = await apiCall("/memorized/surah", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surahNumber: parseInt(surahNumber),
          fromVerse: parseInt(fromVerse),
          toVerse: parseInt(toVerse),
        }),
      });

      if (response.ok) {
        // Fetch updated memorized data
        const memResponse = await apiCall("/memorized");
        const memData = await memResponse.json();
        setMemorizedData(memData);
      }

      return response;
    } catch (error) {
      console.error("Failed to add memorized surah:", error);
      throw error;
    }
  };

  const handleAddMemorizedJuz = async (juzNumber) => {
    try {
      const response = await apiCall("/memorized/juz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ juzNumber: parseInt(juzNumber) }),
      });

      if (response.ok) {
        // Fetch updated memorized data
        const memResponse = await apiCall("/memorized");
        const memData = await memResponse.json();
        setMemorizedData(memData);
      }

      return response;
    } catch (error) {
      console.error("Failed to add memorized juz:", error);
      throw error;
    }
  };

  const handleUpdateVerses = async (surahNumber, verses) => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await apiCall(`/memorized/surah/${surahNumber}/verses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verses }),
      });

      if (response.ok) {
        // Fetch updated memorized data
        const memResponse = await apiCall("/memorized");
        const memData = await memResponse.json();
        setMemorizedData(memData);
      }
    } catch (error) {
      console.error("Failed to update verses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSurahChange = (value) => {
    const surah = surahs.find((s) => s.number === parseInt(value));
    setSelectedSurah(surah);
    setFromVerse("");
    setToVerse("");
  };

  const handleAddSurahSubmit = async () => {
    if (!selectedSurah || !fromVerse || !toVerse) return;

    try {
      const response = await handleAddMemorizedSurah(
        selectedSurah.number,
        parseInt(fromVerse),
        parseInt(toVerse)
      );

      if (response.ok) {
        // Fetch updated data
        const memResponse = await apiCall("/memorized");
        const memData = await memResponse.json();
        setMemorizedData(memData);

        // Reset form
        setSelectedSurah(null);
        setFromVerse("");
        setToVerse("");
        setShowSurahDialog(false);
      }
    } catch (error) {
      console.error("Failed to add memorized surah:", error);
    }
  };

  const handleAddJuzSubmit = async () => {
    if (!selectedJuz) return;

    try {
      const response = await handleAddMemorizedJuz(parseInt(selectedJuz));

      if (response.ok) {
        // Fetch updated data
        const memResponse = await apiCall("/memorized");
        const memData = await memResponse.json();
        setMemorizedData(memData);

        // Reset form
        setSelectedJuz("");
        setShowJuzDialog(false);
      }
    } catch (error) {
      console.error("Failed to add memorized juz:", error);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-bold">Murajaah</CardTitle>
        <SessionIndicators
          completedSessions={completedSessions}
          elapsedTime={elapsedTime}
        />
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="surah" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="surah">Surah</TabsTrigger>
            <TabsTrigger value="juz">Juz</TabsTrigger>
          </TabsList>

          <TabsContent value="surah" className="space-y-4">
            {memorizedData.bySurah.map((surah) => (
              <Card key={surah.surahNumber}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {surah.surahEnglishName}: {surah.verses}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleStartMurajaah("surah", surah.surahNumber)
                    }
                  >
                    {activeSession?.surahNumber === surah.surahNumber ? (
                      isPaused ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
              </Card>
            ))}

            <Dialog open={showSurahDialog} onOpenChange={setShowSurahDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Tambah Surat yang Dihafal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Surat yang Dihafal</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="surah">Surat</Label>
                    <Select
                      value={selectedSurah}
                      onValueChange={setSelectedSurah}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih surat" />
                      </SelectTrigger>
                      <SelectContent>
                        {surahs.map((surah) => (
                          <SelectItem key={surah.number} value={surah.number}>
                            {surah.name} ({surah.englishName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fromVerse">Dari Ayat</Label>
                      <Input
                        id="fromVerse"
                        type="number"
                        value={fromVerse}
                        onChange={(e) => setFromVerse(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="toVerse">Sampai Ayat</Label>
                      <Input
                        id="toVerse"
                        type="number"
                        value={toVerse}
                        onChange={(e) => setToVerse(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      if (selectedSurah && fromVerse && toVerse) {
                        await handleAddMemorizedSurah(
                          selectedSurah,
                          fromVerse,
                          toVerse
                        );
                        setShowSurahDialog(false);
                        setSelectedSurah(null);
                        setFromVerse("");
                        setToVerse("");
                      }
                    }}
                  >
                    Simpan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="juz" className="space-y-4">
            {memorizedData.byJuz.map((juz) => (
              <Card key={juz.juzNumber}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Juz {juz.juzNumber}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartMurajaah("juz", juz.juzNumber)}
                  >
                    {activeSession?.juzNumber === juz.juzNumber ? (
                      isPaused ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    {Object.values(juz.surahs).map((surah) => (
                      <div key={surah.surahNumber}>
                        {surah.surahEnglishName}: {surah.verses}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Dialog open={showJuzDialog} onOpenChange={setShowJuzDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Tambah Juz yang Sudah
                  Dihafal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Juz yang Sudah Dihafal</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="juz">Juz</Label>
                    <Select value={selectedJuz} onValueChange={setSelectedJuz}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih juz" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(30)].map((_, i) => (
                          <SelectItem key={i + 1} value={i + 1}>
                            Juz {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={async () => {
                      if (selectedJuz) {
                        await handleAddMemorizedJuz(selectedJuz);
                        setShowJuzDialog(false);
                        setSelectedJuz("");
                      }
                    }}
                  >
                    Simpan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
