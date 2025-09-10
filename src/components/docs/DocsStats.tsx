import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Globe, FileText, Layers, Zap } from "lucide-react";

interface DocsStatsProps {
  stats: {
    totalSources: number;
    totalPages: number;
    totalChunks: number;
    sourcesWithEmbeddings: number;
  };
  isLoading: boolean;
}

export function DocsStats({ stats, isLoading }: DocsStatsProps) {
  const embeddingProgress =
    stats.totalSources > 0
      ? (stats.sourcesWithEmbeddings / stats.totalSources) * 100
      : 0;

  const statCards = [
    {
      title: "Documentation Sources",
      value: stats.totalSources,
      description: "Total indexed documentation websites",
      icon: Globe,
      color: "text-blue-600",
    },
    {
      title: "Indexed Pages",
      value: stats.totalPages,
      description: "Total pages crawled and indexed",
      icon: FileText,
      color: "text-green-600",
    },
    {
      title: "Content Chunks",
      value: stats.totalChunks,
      description: "Total searchable content chunks",
      icon: Layers,
      color: "text-purple-600",
    },
    {
      title: "AI-Ready Sources",
      value: stats.sourcesWithEmbeddings,
      description: "Sources with generated embeddings",
      icon: Zap,
      color: "text-orange-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Embedding progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Search Readiness</CardTitle>
          <CardDescription>
            Sources with generated embeddings for semantic search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sources with embeddings</span>
              <span>
                {stats.sourcesWithEmbeddings} of {stats.totalSources}
              </span>
            </div>
            <Progress value={embeddingProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {Math.round(embeddingProgress)}% of sources are ready for
              AI-powered search
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            About Documentation Indexing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-3">
            <Badge variant="outline" className="mt-0.5">
              1
            </Badge>
            <div>
              <p className="text-sm font-medium">Crawling</p>
              <p className="text-xs text-muted-foreground">
                We crawl documentation websites and extract content while
                respecting robots.txt
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Badge variant="outline" className="mt-0.5">
              2
            </Badge>
            <div>
              <p className="text-sm font-medium">Chunking</p>
              <p className="text-xs text-muted-foreground">
                Content is broken into searchable chunks with preserved context
                and code blocks
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Badge variant="outline" className="mt-0.5">
              3
            </Badge>
            <div>
              <p className="text-sm font-medium">Embedding</p>
              <p className="text-xs text-muted-foreground">
                Vector embeddings enable semantic search to find relevant
                content for AI responses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
