import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RevisionsListPage() {
  const navigate = useNavigate();
  const [completedMemorizations, setCompletedMemorizations] = useState([]);
  const [revisionSessionsMap, setRevisionSessionsMap] = useState({});

  useEffect(() => {
    const fetchCompletedMemorizations = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/memorizations/completed", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        const data = await response.json();
        setCompletedMemorizations(data);

        // Fetch revision sessions for each completed memorization
        data.forEach(memorization => {
          fetchRevisionSessions(memorization._id);
        });
      } catch (error) {
        console.error("Failed to fetch completed memorizations:", error);
      }
    };

    fetchCompletedMemorizations();
  }, []);

  const fetchRevisionSessions = async (entryId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/memorizations/${entryId}/revisions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const data = await response.json();
      setRevisionSessionsMap(prev => ({
        ...prev,
        [entryId]: data
      }));
    } catch (error) {
      console.error("Failed to fetch revision sessions:", error);
    }
  };

  // Helper function to format minutes to hours and minutes
  const formatTime = (minutes) => {
    if (!minutes) return "0 menit";
    if (minutes < 60) return `${minutes} menit`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} jam ${remainingMinutes > 0 ? `${remainingMinutes} menit` : ""}`;
  };

  // Calculate total revision time for an entry
  const calculateRevisionTime = (sessions) => {
    if (!sessions || !sessions.revisionSessions) return 0;
    return sessions.revisionSessions.reduce((total, session) => {
      return total + (session.duration || 0);
    }, 0);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Daftar Ziyadah</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {completedMemorizations.map((memorization) => {
          const revisionData = revisionSessionsMap[memorization._id];
          const totalRevisionTime = calculateRevisionTime(revisionData);
          const completedRevisions = revisionData?.completedSessions || 0;

          return (
            <div
              key={memorization._id}
              className="p-4 border rounded-lg hover:bg-accent cursor-pointer"
              onClick={() => navigate(`/revision/${memorization._id}`)}
            >
              <div className="flex justify-between">
                {/* Left side - Surah info */}
                <div className="flex-1">
                  <h3 className="font-medium">{memorization.surahEnglishName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Ayat {memorization.fromVerse} - {memorization.toVerse}
                  </p>
                  <div className="mt-2 space-y-2">
                    {/* Memorization row */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-20">Ziyadah:</span>
                      <span className="text-sm text-muted-foreground w-24">
                        {formatTime(memorization.totalTimeSpent)}
                      </span>
                      <div className="flex gap-3">
                        {[...Array(4)].map((_, index) => (
                          <div
                            key={`mem-${index}`}
                            className={`w-2.5 h-2.5 rounded-full ${
                              index < memorization.totalSessionsCompleted
                                ? "bg-green-500"
                                : "border border-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Revision row */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-20">Murajaah:</span>
                      <span className="text-sm text-muted-foreground w-24">
                        {formatTime(totalRevisionTime)}
                      </span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, index) => (
                          <div
                            key={`rev-${index}`}
                            className={`w-2.5 h-2.5 rounded-full ${
                              index < completedRevisions
                                ? "bg-green-500"
                                : "border border-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Date */}
                <div className="text-sm text-muted-foreground ml-4">
                  {new Date(memorization.dateCompleted).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {completedMemorizations.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Belum ada hafalan yang selesai
          </p>
        )}
      </CardContent>
    </Card>
  );
} 