import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { IdeaDialog } from "./IdeaDialog";

interface IdeasPageProps {
  workspaceId: string;
  userId: string;
}

const statusColumns = [
  { id: "proposed", title: "Proposed", color: "bg-blue-500" },
  { id: "in-progress", title: "In Progress", color: "bg-yellow-500" },
  { id: "finalized", title: "Finalized", color: "bg-green-500" },
];

export const IdeasPage = ({ workspaceId, userId }: IdeasPageProps) => {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<any>(null);
  const [draggedIdea, setDraggedIdea] = useState<any>(null);

  useEffect(() => {
    fetchIdeas();
  }, [workspaceId]);

  const fetchIdeas = async () => {
    const { data, error } = await supabase
      .from("ideas")
      .select("*, created_by(full_name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load ideas");
    } else {
      setIdeas(data || []);
    }
    setLoading(false);
  };

  const updateIdeaStatus = async (ideaId: string, newStatus: string) => {
    const { error } = await supabase
      .from("ideas")
      .update({ status: newStatus })
      .eq("id", ideaId);

    if (error) {
      toast.error("Failed to update idea status");
    } else {
      fetchIdeas();
      toast.success("Idea status updated!");
    }
  };

  const handleDragStart = (e: React.DragEvent, idea: any) => {
    setDraggedIdea(idea);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedIdea && draggedIdea.status !== newStatus) {
      updateIdeaStatus(draggedIdea.id, newStatus);
    }
    setDraggedIdea(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading ideas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ideas Board</h1>
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary shadow-glow">
          <Plus className="h-4 w-4 mr-2" />
          New Idea
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statusColumns.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <h2 className="font-semibold">{column.title}</h2>
              <Badge variant="outline" className="ml-auto">
                {ideas.filter((i) => i.status === column.id).length}
              </Badge>
            </div>

            <div 
              className="space-y-3 min-h-[200px] p-2 rounded-lg border-2 border-dashed border-transparent hover:border-primary/30 transition-smooth"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {ideas
                .filter((idea) => idea.status === column.id)
                .map((idea) => (
                  <Card
                    key={idea.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idea)}
                    className={`gradient-card border-border/50 hover:shadow-card transition-smooth cursor-move ${
                      draggedIdea?.id === idea.id ? 'opacity-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedIdea(idea);
                      setDialogOpen(true);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                        <span>{idea.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {idea.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                          {idea.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        By {idea.created_by?.full_name}
                      </p>
                    </CardContent>
                  </Card>
                ))}

              {ideas.filter((i) => i.status === column.id).length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Drop ideas here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <IdeaDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedIdea(null);
        }}
        workspaceId={workspaceId}
        userId={userId}
        idea={selectedIdea}
        onSuccess={fetchIdeas}
        onStatusChange={updateIdeaStatus}
      />
    </div>
  );
};
