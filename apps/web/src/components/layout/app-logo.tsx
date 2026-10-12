import { appConfig } from "@/config/app.config";
import { cn } from "@/lib/utils";

/** Logo mark and text from app.config.ts. */
export function AppLogo({ className }: { className?: string }) {
  const { icon: Icon, text } = appConfig.logo;
  return (
    <span className={cn("flex items-center gap-2 font-heading font-semibold", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}
