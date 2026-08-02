import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiCall } from "@/lib/api";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, lbRes] = await Promise.all([
          apiCall("/gamification/me"),
          apiCall("/gamification/leaderboard"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setMyStats(meData);
        }

        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setLeaderboard(lbData.leaderboard);
          setMyRank(lbData.myRank);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : (
          <>
            {myStats && (
              <Card className="bg-primary/5 border-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Your Stats</p>
                      <p className="text-lg font-semibold">
                        🏅 {myStats.title} · Lv. {myStats.level + 1}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">⭐ {myStats.totalPoints} pts</p>
                      <p className="text-sm">🔥 {myStats.streak}-day streak</p>
                      {myRank && <p className="text-sm text-muted-foreground">Rank #{myRank}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {leaderboard.map((user) => (
                <div
                  key={user.username}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    myStats && user.username === myStats.username
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-muted-foreground w-8">
                      #{user.rank}
                    </span>
                    <div>
                      <p className="font-medium">
                        {user.username}
                        {myStats && user.username === myStats.username && (
                          <span className="text-xs text-primary ml-2">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        🏅 {user.title} · Lv. {user.level + 1}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">⭐ {user.totalPoints}</p>
                    <p className="text-xs text-muted-foreground">🔥 {user.streak}d</p>
                  </div>
                </div>
              ))}
            </div>

            {leaderboard.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No data yet. Complete some sessions to appear here!
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
