import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MemorizationPage from "@/pages/memorization/MemorizationPage";
import RevisionsList from "@/pages/revision/RevisionsListPage";

const formatDate = () => {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date().toLocaleDateString('id-ID', options);
};

export default function ZiyadahPage() {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Ziyadah</CardTitle>
          <span className="text-sm text-muted-foreground">{formatDate()}</span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="memorization" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="memorization">Hafalan Baru</TabsTrigger>
            <TabsTrigger value="revisions">Hafalan Selesai</TabsTrigger>
          </TabsList>

          <TabsContent value="memorization">
            <MemorizationPage />
          </TabsContent>

          <TabsContent value="revisions">
            <RevisionsList />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 