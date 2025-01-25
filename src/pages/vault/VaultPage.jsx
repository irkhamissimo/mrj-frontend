import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiCall } from "@/lib/api";

export default function VaultPage() {
  const [vaultEntries, setVaultEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    const fetchVaultEntries = async () => {
      try {
        const response = await apiCall("/vault");
        const data = await response.json();
        setVaultEntries(data);
      } catch (error) {
        console.error("Failed to fetch vault entries:", error);
      }
    };

    fetchVaultEntries();
  }, []);

  const handleVerify = async (vaultId) => {
    try {
      const response = await apiCall(`/vault/${vaultId}/verify`, {
        method: "POST",
        body: JSON.stringify({
          rating: 5,
          notes: "Verified memorization"
        }),
      });

      if (response.ok) {
        // Remove the verified entry from the list
        setVaultEntries(vaultEntries.filter(entry => entry._id !== vaultId));
        setSelectedEntry(null);
      }
    } catch (error) {
      console.error("Failed to verify entry:", error);
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
              disabled={selectedEntry !== entry._id}
              onClick={() => handleVerify(entry._id)}
            >
              Tandai Sudah Disetor
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