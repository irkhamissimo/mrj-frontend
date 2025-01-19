import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ChevronUp, ChevronDown, Play, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

function SessionIndicators({ completedSessions = 0 }) {
  return (
    <div className="flex items-center gap-2">
      {/* Main timer circle */}
      <div className="relative w-8 h-8 flex items-center justify-center">
        <Circle className="w-8 h-8 absolute" />
        <span className="text-sm font-medium">25</span>
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
      } catch (error) {
        console.error("Failed to fetch memorized data:", error);
      }
    };

    fetchMemorizedData();
  }, []);

  const handleStartRevision = async (type, identifier) => {
    try {
      const response = await fetch(`http://localhost:5000/api/revisions/start/`, {
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
        // Handle successful revision start
        // You might want to navigate to a revision page or show a timer
      } else {
        console.error("Failed to start revision:", response);
      }
    } catch (error) {
      console.error("Failed to start revision:", error);
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
        <SessionIndicators completedSessions={completedSessions} />
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
                    {surah.surahName} ({surah.surahNumber})
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleStartRevision('surah', surah.surahNumber)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {surah.verses.map((verse, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <p className="text-sm text-gray-600 flex-grow">
                        Ayat {verse.fromVerse} - {verse.toVerse}
                      </p>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => handleUpdateVerses(surah.surahNumber, idx, 'up')}
                          disabled={loading}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => handleUpdateVerses(surah.surahNumber, idx, 'down')}
                          disabled={loading || verse.toVerse <= verse.fromVerse}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button className="w-full" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Surat yang Dihafal
            </Button>
          </TabsContent>

          <TabsContent value="juz" className="space-y-4">
            {memorizedData.byJuz.map((juz) => (
              <div key={juz.juzNumber} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Juz {juz.juzNumber}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleStartRevision('juz', juz.juzNumber)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2">
                  {Object.values(juz.surahs).map((surah) => (
                    <div key={surah.surahNumber} className="ml-4">
                      <p className="text-sm font-medium">{surah.surahName}</p>
                      {surah.verses.map((verse, idx) => (
                        <p key={idx} className="text-sm text-gray-600">
                          Ayat {verse.fromVerse} - {verse.toVerse}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button className="w-full" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Juz yang Sudah Dihafal
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 