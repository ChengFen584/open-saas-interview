import {
  Copy,
  Download,
  History,
  Loader2,
  Play,
  Sparkles,
  Square,
} from "lucide-react";
import { useState } from "react";
import {
  generateHtmlAnimation,
  getHtmlAnimation,
  listHtmlAnimations,
  useQuery,
} from "wasp/client/operations";
import type { HtmlAnimation } from "wasp/entities";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Textarea } from "../client/components/ui/textarea";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

const promptExamples = [
  "A paper airplane gliding through layered sunset clouds with gentle parallax",
  "A neon jellyfish pulsing underwater while small bubbles drift upward",
  "A minimal solar system with orbiting planets and a softly glowing sun",
];

export function HtmlAnimationPage() {
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<HtmlAnimation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingAnimationId, setLoadingAnimationId] = useState<string | null>(
    null,
  );
  const [isPreviewRunning, setIsPreviewRunning] = useState(true);
  const [previewRevision, setPreviewRevision] = useState(0);
  const { data: animations, isLoading, refetch } = useQuery(listHtmlAnimations);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const animation = await generateHtmlAnimation({ prompt });
      setSelected(animation);
      setIsPreviewRunning(true);
      setPreviewRevision((value) => value + 1);
      await refetch();
      toast({
        title: "Animation ready",
        description: animation.repaired
          ? "The first draft was repaired automatically before previewing."
          : "The generated HTML passed all preview checks.",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description:
          error instanceof Error ? error.message : "Please try another prompt.",
        variant: "destructive",
      });
      await refetch();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = async (id: string) => {
    try {
      setLoadingAnimationId(id);
      const animation = await getHtmlAnimation({ id });
      setSelected(animation);
      setIsPreviewRunning(true);
      setPreviewRevision((value) => value + 1);
    } catch (error) {
      toast({
        title: "Could not load animation",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingAnimationId(null);
    }
  };

  const restartPreview = () => {
    setIsPreviewRunning(true);
    setPreviewRevision((value) => value + 1);
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <div className="text-primary mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <Sparkles className="h-4 w-4" /> AI Animation Studio
        </div>
        <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
          Turn an idea into a safe HTML animation
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-8">
          Generate self-contained CSS and SVG motion, validate it automatically,
          and preview it inside an isolated browser sandbox.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Describe the motion</CardTitle>
              <CardDescription>
                Include the subject, atmosphere, colors, and movement you want.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.currentTarget.value)}
                placeholder="Example: A tiny rocket launching through a starry night sky..."
                className="min-h-36 resize-y"
                maxLength={500}
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>8–500 characters</span>
                <span>{prompt.trim().length}/500</span>
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={isGenerating || prompt.trim().length < 8}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating and validating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate animation
                  </>
                )}
              </Button>

              <div className="space-y-2 pt-2">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Try an example
                </p>
                {promptExamples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="border-border text-muted-foreground hover:border-primary/50 hover:text-foreground w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" /> Recent generations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 py-5 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading
                  history...
                </div>
              ) : animations && animations.length > 0 ? (
                <div className="space-y-2">
                  {animations.map((animation) => (
                    <button
                      key={animation.id}
                      type="button"
                      onClick={() => handleSelect(animation.id)}
                      className={cn(
                        "border-border hover:bg-accent w-full rounded-lg border p-3 text-left transition-colors",
                        selected?.id === animation.id &&
                          "border-primary bg-primary/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-sm font-medium">
                            {animation.title ?? animation.prompt}
                          </p>
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                            {animation.prompt}
                          </p>
                        </div>
                        {loadingAnimationId === animation.id ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        ) : (
                          <StatusBadge status={animation.status} />
                        )}
                      </div>
                      <p className="text-muted-foreground mt-2 text-[11px]">
                        {formatDate(animation.createdAt)}
                        {animation.repaired ? " · auto-repaired" : ""}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground py-5 text-sm">
                  Your generated animations will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-[680px] overflow-hidden">
          <CardHeader className="border-border border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{selected?.title ?? "Animation preview"}</CardTitle>
                <CardDescription className="mt-1">
                  Script-free, network-blocked, and isolated from the app.
                </CardDescription>
              </div>
              {selected?.status === "COMPLETED" && selected.html && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyHtml(selected.html!)}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadHtml(selected)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                  </Button>
                  {isPreviewRunning ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreviewRunning(false)}
                    >
                      <Square className="mr-1.5 h-3.5 w-3.5" /> Stop
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={restartPreview}
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Restart
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-[610px] p-0">
            {selected?.status === "COMPLETED" &&
            selected.html &&
            isPreviewRunning ? (
              <iframe
                key={`${selected.id}-${previewRevision}`}
                title={selected.title ?? "Generated HTML animation"}
                srcDoc={selected.html}
                sandbox=""
                referrerPolicy="no-referrer"
                className="h-full w-full border-0 bg-white"
              />
            ) : selected?.status === "FAILED" ? (
              <PreviewMessage
                title="This generation did not pass validation"
                description={
                  selected.error ?? "Try a more specific visual description."
                }
              />
            ) : selected && !isPreviewRunning ? (
              <PreviewMessage
                title="Preview stopped"
                description="Restart it when you are ready to view the animation again."
              />
            ) : (
              <PreviewMessage
                title="Your canvas is ready"
                description="Choose an example or write a prompt to generate your first animation."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: HtmlAnimation["status"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
        status === "COMPLETED" && "bg-emerald-500/10 text-emerald-600",
        status === "FAILED" && "bg-destructive/10 text-destructive",
        status === "PENDING" && "bg-amber-500/10 text-amber-600",
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}

function PreviewMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div className="bg-primary/10 text-primary mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-foreground text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {description}
        </p>
      </div>
    </div>
  );
}

async function copyHtml(html: string) {
  await navigator.clipboard.writeText(html);
  toast({ title: "HTML copied to clipboard" });
}

function downloadHtml(animation: HtmlAnimation) {
  if (!animation.html) return;

  const blob = new Blob([animation.html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(animation.title ?? "animation")}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "animation"
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
