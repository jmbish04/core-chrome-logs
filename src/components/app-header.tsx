import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import { Badge } from "./reui/badge";
import { IconTile } from "./reui/icon-tile";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";

export interface AppHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  /** Short label for the badge beside the title. Omit for no badge. */
  tag?: string;
  /** Extra actions, rendered before the theme toggle and the settings button. */
  actions?: ReactNode;
  /** Hide the settings button on the options page itself. */
  showSettings?: boolean;
}

/**
 * The header every surface shares.
 *
 * A popup is 340px and a side panel about 400px, so this is the narrow app-shell
 * topology: one brand block, one action cluster, nothing else. The workspace selector
 * and the avatar menu that the wider ReUI shells carry are stripped — this extension has
 * neither workspaces nor users.
 */
export function AppHeader({
  icon,
  title,
  subtitle,
  tag,
  actions,
  showSettings = true,
}: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card/60 px-4 py-3 backdrop-blur-xs">
      <div className="flex min-w-0 items-center gap-2.5">
        <IconTile variant="frame" size="sm" className="text-warning" aria-hidden="true">
          {icon}
        </IconTile>
        <div className="min-w-0">
          <h1 className="flex items-center gap-1.5 text-xs leading-tight font-semibold tracking-tight text-foreground">
            <span className="truncate">{title}</span>
            {tag && (
              <Badge variant="primary-light" size="xs" radius="full">
                {tag}
              </Badge>
            )}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {actions}
        <ThemeToggle />
        {showSettings && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => chrome.runtime.openOptionsPage()}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings className="size-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
