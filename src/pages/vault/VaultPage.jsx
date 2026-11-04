import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiCall } from "@/lib/api";

export default function VaultPage() {
  const [vaultEntries, setVaultEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVaultEntries = async () => {
      try {
        const response = await apiCall("/vault", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load submissions");
        setVaultEntries(data);
      } catch (error) {
        setError(error.message);
      }
    };

    fetchVaultEntries();
  }, []);

  const handleVerify = async (vaultId) => {
    setError("");
    try {
      const response = await apiCall(`/vault/${vaultId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: 5,
          notes: "Verified memorization"
        }),
      });

      if (response.ok) {
        // Remove the verified entry from the list
        setVaultEntries(vaultEntries.filter(entry => entry._id !== vaultId));
        setSelectedEntry(null);
      } else {
        const data = await response.json();
        setError(data.error || "Verification failed");
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Hafalan Belum Disetor</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        {vaultEntries.map((entry) => (
          <div key={entry._id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedEntry === entry._id}
                onCheckedChange={(checked) => setSelectedEntry(checked ? entry._id : null)}
              />
              <div>
                <h3 className="font-medium">
                  {entry.surahName}: {entry.consolidatedVerses.fromVerse} - {entry.consolidatedVerses.toVerse}
                </h3>
              </div>
            </div>
            <Button
              variant="secondary"
              disabled={!entry.canVerify || selectedEntry !== entry._id}
              onClick={() => handleVerify(entry._id)}
            >
              {entry.canVerify ? "Tandai Sudah Disetor" : "Menunggu guru"}
            </Button>
          </div>
        ))}
        {vaultEntries.length === 0 && (
          <div className="text-center text-muted-foreground">
            Tidak ada hafalan yang belum disetor
          </div>
        )}
      </CardContent>
    </Card>
  );
}
