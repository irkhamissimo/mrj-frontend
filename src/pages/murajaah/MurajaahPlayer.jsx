import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MurajaahPlayer() {
  const navigate = useNavigate();
  const { type: initialType, identifier } = useParams();
  const [type, setType] = useState(initialType || 'juz');
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
  const [verifiedMemorizations, setVerifiedMemorizations] = useState([]);

  // Sync UI with URL type parameter
  useEffect(() => {
    if (initialType) {
      setType(initialType);
    }
  }, [initialType]);

  // Handle toggle change
  const handleTypeChange = (checked) => {
    const newType = checked ? 'surah' : 'juz';
    setType(newType);
  };

  // Fetch memorized data on component mount
  useEffect(() => {
    const fetchMemorizedData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/memorized", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();
        setMemorizedData(data);

        // Set initial values if available
        if (data.bySurah.length > 0) {
          const firstSurah = data.bySurah[0];
          setStartSurah(firstSurah.surahNumber.toString());
          if (firstSurah.verses.length > 0) {
            setStartVerse(firstSurah.verses[0].fromVerse.toString());
            setEndVerse(firstSurah.verses[0].toVerse.toString());
          }
        }
        if (data.byJuz.length > 0) {
          setJuzNumber(data.byJuz[0].juzNumber.toString());
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

  // Start revision session
  const handleStartRevision = async () => {
    try {
      // make duration 25 seconds
      const duration = 25;
      const response = await fetch("http://localhost:5000/api/revisions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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
      const response = await fetch(`http://localhost:5000/api/revisions/${activeSession._id}/pause`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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

  // Timer effect
  useEffect(() => {
    let interval;
    if (activeSession && !isPaused) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => {
          if (prev >= 25) {
            clearInterval(interval);
            // navigate('/murajaah');
            return 25;
          }
          return prev + 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
    return () => {};
  }, [activeSession, isPaused]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get available verses for selected surah
  const getAvailableVerses = (surahNumber) => {
    const surah = memorizedData.bySurah.find(s => s.surahNumber.toString() === surahNumber);
    if (!surah) return [];
    
    // Get all verse ranges for this surah
    const allVerses = [];
    surah.verses.forEach(verseRange => {
      for (let i = verseRange.fromVerse; i <= verseRange.toVerse; i++) {
        allVerses.push(i);
      }
    });
    return allVerses.sort((a, b) => a - b);
  };

  // Get available end verses for selected surah and start verse
  const getAvailableEndVerses = (surahNumber, startVerse) => {
    const surah = memorizedData.bySurah.find(s => s.surahNumber.toString() === surahNumber);
    if (!surah) return [];
    
    // Find the verse range that contains the start verse
    const relevantRange = surah.verses.find(range => 
      range.fromVerse <= parseInt(startVerse) && range.toVerse >= parseInt(startVerse)
    );
    
    if (!relevantRange) return [];

    // Return all verses from start verse to end of range
    const endVerses = [];
    for (let i = parseInt(startVerse); i <= relevantRange.toVerse; i++) {
      endVerses.push(i);
    }
    return endVerses;
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
        <div className="flex justify-center text-4xl font-bold">
          {formatTime(timeElapsed)}
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
                      <SelectItem key={surah.surahNumber} value={surah.surahNumber.toString()}>
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
                      <SelectItem key={surah.surahNumber} value={surah.surahNumber.toString()}>
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
                        <SelectItem key={verse} value={verse.toString()}>
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
                  <SelectItem key={juz.juzNumber} value={juz.juzNumber.toString()}>
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