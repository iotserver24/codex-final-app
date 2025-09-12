import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { Globe } from "lucide-react";
import { useDocsSources, useDocsStats } from "../../hooks/useDocs";
import { DocsSourceCard } from "./DocsSourceCard";
import { DocsSearch } from "./DocsSearch";
import { DocsStats } from "./DocsStats";
import { AddDocsSourceDialog } from "./AddDocsSourceDialog";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

export function DocsManager() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState("sources");

  const {
    sources,
    isLoading: sourcesLoading,
    refetch: refetchSources,
  } = useDocsSources();
  const {
    stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useDocsStats();

  const handleSourceAdded = useCallback(() => {
    setShowAddDialog(false);
    refetchSources();
    refetchStats();
    toast.success("Documentation source added successfully");
  }, [refetchSources, refetchStats]);

  const handleSourceUpdate = useCallback(() => {
    refetchSources();
    refetchStats();
  }, [refetchSources, refetchStats]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Documentation Indexing</h2>
            <Badge
              variant="secondary"
              className="text-xs px-2 py-0.5 rounded-full"
            >
              Beta
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Index and search documentation from any website
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Globe className="w-4 h-4 mr-2" />
          Add Docs Source
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="sources" className="h-full m-0 p-4">
              <div className="h-full flex flex-col">
                {/* Progress indicator */}

                {/* Sources list */}
                <ScrollArea className="flex-1">
                  {sourcesLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : sources.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <Globe className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                          No documentation sources
                        </h3>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                          Add a documentation website to start indexing and
                          searching content
                        </p>
                        <Button onClick={() => setShowAddDialog(true)}>
                          Add Your First Source
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {sources.map((source) => (
                        <DocsSourceCard
                          key={source.id}
                          source={source}
                          onUpdate={handleSourceUpdate}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="search" className="h-full m-0 p-4">
              <DocsSearch />
            </TabsContent>

            <TabsContent value="stats" className="h-full m-0 p-4">
              <DocsStats stats={stats} isLoading={statsLoading} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <AddDocsSourceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSourceAdded={handleSourceAdded}
      />
    </div>
  );
}
