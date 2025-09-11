import React from "react";
import { DocsManager } from "../components/docs/DocsManager";
import { Card, CardContent } from "../components/ui/card";
import { Globe, Clock } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="relative h-full">
      {/* Darkened background with the original content */}
      <div className="opacity-30 pointer-events-none">
        <DocsManager />
      </div>

      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
        <Card className="w-96 mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12 px-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-primary/10">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>

            <h2 className="text-2xl font-bold mb-3 text-center">
              Documentation Hub
            </h2>

            <p className="text-muted-foreground text-center mb-6 leading-relaxed">
              Our documentation indexing and search feature is coming soon!
              You'll be able to index and search through documentation from any
              website.
            </p>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground text-center">
              <span>✨ Smart document indexing</span>
              <span>🔍 Powerful search capabilities</span>
              <span>🌐 Support for any website</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
