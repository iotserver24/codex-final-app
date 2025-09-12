import {
  Home,
  Inbox,
  Settings,
  HelpCircle,
  Store,
  Gift,
  ExternalLink,
  RefreshCw,
  Info,
  BookOpen,
  Globe,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar"; // import useSidebar hook
import { useEffect, useState, useRef } from "react";
import { useAtom } from "jotai";
import { dropdownOpenAtom } from "@/atoms/uiAtoms";
import { showError } from "@/lib/toast";
import { toast } from "@/lib/toast";
import { useSettings } from "@/hooks/useSettings";
import { IpcClient } from "@/ipc/ipc_client";
import type { UpdateCheckResult } from "@/ipc/ipc_types";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatList } from "./ChatList";
import { AppList } from "./AppList";
import { HelpDialog } from "./HelpDialog"; // Import the new dialog
import { SettingsList } from "./SettingsList";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Menu items.
const items = [
  {
    title: "Apps",
    to: "/",
    icon: Home,
  },
  {
    title: "Chat",
    to: "/chat",
    icon: Inbox,
  },
  {
    title: "Docs",
    to: "/docs",
    icon: Globe,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: Settings,
  },
  {
    title: "Library",
    to: "/library",
    icon: BookOpen,
  },
  {
    title: "Hub",
    to: "/hub",
    icon: Store,
  },
];

// Hover state types
type HoverState =
  | "start-hover:app"
  | "start-hover:chat"
  | "start-hover:settings"
  | "start-hover:library"
  | "clear-hover"
  | "no-hover";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar(); // retrieve current sidebar state
  const [hoverState, setHoverState] = useState<HoverState>("no-hover");
  const expandedByHover = useRef(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false); // State for dialog
  const [isDropdownOpen] = useAtom(dropdownOpenAtom);
  const [updateInfo, setUpdateInfo] = useState<null | {
    version: string;
    releaseNotes: string;
    downloadUrl: string;
    downloadPageUrl?: string;
    readmeUrl?: string;
    readmeMarkdown?: string;
    updateNotice?: string;
    downloadsApiUrl?: string;
    platformButtons?: { label: string; url: string }[];
    updateInfoList?: string[];
  }>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    IpcClient.getInstance().getAppVersion?.().then(setAppVersion);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data: UpdateCheckResult =
          await IpcClient.getInstance().checkForUpdates();
        if (!appVersion || !settings) return;

        // Get the appropriate channel based on user settings
        const channel = settings.releaseChannel === "beta" ? "beta" : "stable";
        const channelData = data[channel];

        const isNewer = (a: string, b: string) => {
          const pa = a.split(".").map(Number);
          const pb = b.split(".").map(Number);
          for (let i = 0; i < 3; i++) {
            if ((pa[i] || 0) < (pb[i] || 0)) return true;
            if ((pa[i] || 0) > (pb[i] || 0)) return false;
          }
          return false;
        };

        if (isNewer(appVersion, channelData.version)) {
          const info = {
            version: channelData.version,
            releaseNotes: channelData.releaseNotes,
            downloadUrl: channelData.downloadUrl,
            downloadPageUrl: channelData.downloadPageUrl,
            readmeUrl: channelData.readmeUrl,
            readmeMarkdown: channelData.readmeMarkdown,
            updateNotice: channelData.updateNotice,
            downloadsApiUrl: channelData.downloadsApiUrl,
            updateInfoList: channelData.updateInfo,
          } as const;
          // Attempt to fetch README markdown if provided
          let readmeMarkdown: string | undefined = info.readmeMarkdown;
          let platformButtons: { label: string; url: string }[] | undefined;
          if (!readmeMarkdown && info.readmeUrl) {
            try {
              const res = await fetch(info.readmeUrl);
              if (res.ok) {
                readmeMarkdown = await res.text();
              }
            } catch {}
          }
          if (info.downloadsApiUrl) {
            try {
              const res = await fetch(info.downloadsApiUrl);
              if (res.ok) {
                const json = await res.json();
                const latest = json.latest || json; // support either at root or nested
                const os = await IpcClient.getInstance().getSystemPlatform?.();
                const collect = (arr?: any[]) =>
                  Array.isArray(arr)
                    ? arr.map((d) => ({ label: d.name, url: d.url }))
                    : [];
                platformButtons = [
                  ...collect(latest?.downloads?.windows),
                  ...collect(latest?.downloads?.macos),
                  ...collect(latest?.downloads?.linux),
                ];
                // Move detected OS buttons to front
                if (os) {
                  const startsWithOs = (label: string) =>
                    (os === "win32" &&
                      label.toLowerCase().startsWith("windows")) ||
                    (os === "darwin" &&
                      label.toLowerCase().startsWith("mac")) ||
                    (os === "linux" && label.toLowerCase().startsWith("linux"));
                  platformButtons.sort((a, b) =>
                    startsWithOs(a.label) ? -1 : startsWithOs(b.label) ? 1 : 0,
                  );
                }
              }
            } catch {}
          }
          setUpdateInfo({ ...info, readmeMarkdown, platformButtons });
          setShowUpdateModal(true);
        }
      } catch {
        // Silent fail: do nothing on error
      }
    })();
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appVersion, settings?.releaseChannel]);

  useEffect(() => {
    if (hoverState.startsWith("start-hover") && state === "collapsed") {
      expandedByHover.current = true;
      toggleSidebar();
    }
    if (
      hoverState === "clear-hover" &&
      state === "expanded" &&
      expandedByHover.current &&
      !isDropdownOpen
    ) {
      toggleSidebar();
      expandedByHover.current = false;
      setHoverState("no-hover");
    }
  }, [hoverState, toggleSidebar, state, setHoverState, isDropdownOpen]);

  const routerState = useRouterState();
  const isAppRoute =
    routerState.location.pathname === "/" ||
    routerState.location.pathname.startsWith("/app-details");
  const isChatRoute = routerState.location.pathname === "/chat";
  const isSettingsRoute = routerState.location.pathname.startsWith("/settings");

  let selectedItem: string | null = null;
  if (hoverState === "start-hover:app") {
    selectedItem = "Apps";
  } else if (hoverState === "start-hover:chat") {
    selectedItem = "Chat";
  } else if (hoverState === "start-hover:settings") {
    selectedItem = "Settings";
  } else if (hoverState === "start-hover:library") {
    selectedItem = "Library";
  } else if (state === "expanded") {
    if (isAppRoute) {
      selectedItem = "Apps";
    } else if (isChatRoute) {
      selectedItem = "Chat";
    } else if (isSettingsRoute) {
      selectedItem = "Settings";
    }
  }

  const handleCheckForUpdates = async () => {
    try {
      const data: UpdateCheckResult =
        await IpcClient.getInstance().checkForUpdates();
      if (!appVersion || !settings) {
        showError("Could not determine current app version or settings.");
        return;
      }

      // Get the appropriate channel based on user settings
      const channel = settings.releaseChannel === "beta" ? "beta" : "stable";
      const channelData = data[channel];

      const isNewer = (a: string, b: string) => {
        const pa = a.split(".").map(Number);
        const pb = b.split(".").map(Number);
        for (let i = 0; i < 3; i++) {
          if ((pa[i] || 0) < (pb[i] || 0)) return true;
          if ((pa[i] || 0) > (pb[i] || 0)) return false;
        }
        return false;
      };

      if (isNewer(appVersion, channelData.version)) {
        const info = {
          version: channelData.version,
          releaseNotes: channelData.releaseNotes,
          downloadUrl: channelData.downloadUrl,
          downloadPageUrl: channelData.downloadPageUrl,
          readmeUrl: channelData.readmeUrl,
        } as const;
        let readmeMarkdown: string | undefined;
        if (info.readmeUrl) {
          try {
            const res = await fetch(info.readmeUrl);
            if (res.ok) readmeMarkdown = await res.text();
          } catch {}
        }
        setUpdateInfo({ ...info, readmeMarkdown });
        setShowUpdateModal(true);
      } else {
        toast.success?.("You are using the latest version.") ||
          toast("You are using the latest version.");
      }
    } catch (e: any) {
      showError(e?.message || "Failed to check for updates.");
    }
  };

  const renderReleaseNotes = (notes: string | undefined) => {
    if (!notes) return null;
    return (
      <div
        className="max-h-40 overflow-y-auto whitespace-pre-line border rounded p-2 bg-muted text-sm mb-4"
        style={{ fontFamily: "inherit" }}
      >
        {notes.split(/\\n|\n/).map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      onMouseLeave={() => {
        if (!isDropdownOpen) {
          setHoverState("clear-hover");
        }
      }}
    >
      <SidebarContent className="overflow-hidden">
        <div className="flex mt-8">
          {/* Left Column: Menu items */}
          <div className="">
            <SidebarTrigger
              onMouseEnter={() => {
                setHoverState("clear-hover");
              }}
            />
            <AppIcons onHoverChange={setHoverState} />
          </div>
          {/* Right Column: Chat List Section */}
          <div className="w-[240px]">
            <AppList show={selectedItem === "Apps"} />
            <ChatList show={selectedItem === "Chat"} />
            <SettingsList show={selectedItem === "Settings"} />
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Change button to open dialog instead of linking */}
            <SidebarMenuButton
              size="sm"
              className="font-medium w-14 flex flex-col items-center gap-1 h-14 mb-2 rounded-2xl"
              onClick={() => setIsHelpDialogOpen(true)} // Open dialog on click
            >
              <HelpCircle className="h-5 w-5" />
              <span className={"text-xs"}>Help</span>
            </SidebarMenuButton>
            <HelpDialog
              isOpen={isHelpDialogOpen}
              onClose={() => setIsHelpDialogOpen(false)}
            />
          </SidebarMenuItem>
        </SidebarMenu>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm mt-2"
          onClick={() => {
            IpcClient.getInstance().openExternalUrl(
              "https://codex.anishkumar.tech/docs/support#-one-time-donations",
            );
          }}
        >
          <Gift className="w-4 h-4" /> Donate
          <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
        </button>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm mt-2"
          onClick={handleCheckForUpdates}
        >
          <RefreshCw className="w-4 h-4" /> Check for Updates
        </button>
        {/* Update Modal */}
        <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
          <DialogContent>
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-6 h-6 text-blue-500" />
              <h2 className="text-lg font-semibold">Update Available</h2>
            </div>
            <div className="mb-2">
              A new version (<b>{updateInfo?.version}</b>) is available!
            </div>
            {updateInfo?.updateInfoList &&
            updateInfo.updateInfoList.length > 0 ? (
              <div className="mt-2">
                <div className="font-semibold mb-1">What's new</div>
                <ul className="list-disc ml-6 text-sm space-y-1">
                  {updateInfo.updateInfoList.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : updateInfo?.updateNotice ? (
              <div className="mt-2">
                <div className="font-semibold mb-1">Notice</div>
                <div className="prose dark:prose-invert max-h-60 overflow-y-auto border rounded p-3">
                  <pre className="whitespace-pre-wrap text-sm">
                    {updateInfo.updateNotice}
                  </pre>
                </div>
              </div>
            ) : updateInfo?.readmeMarkdown ? (
              <div className="mt-2">
                <div className="font-semibold mb-1">Update Details</div>
                <div className="prose dark:prose-invert max-h-60 overflow-y-auto border rounded p-3">
                  {/* We don’t have a markdown renderer in this component; show plain text fallback */}
                  <pre className="whitespace-pre-wrap text-sm">
                    {updateInfo.readmeMarkdown}
                  </pre>
                </div>
              </div>
            ) : (
              <>
                <div className="font-semibold mb-1">Release Notes:</div>
                {renderReleaseNotes(updateInfo?.releaseNotes)}
              </>
            )}
            <div className="flex flex-col gap-3 mt-4">
              {updateInfo?.platformButtons &&
                updateInfo.platformButtons.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {updateInfo.platformButtons.slice(0, 6).map((btn, idx) => (
                      <button
                        key={idx}
                        className="px-3 py-2 border rounded hover:bg-muted"
                        onClick={() =>
                          IpcClient.getInstance().openExternalUrl(btn.url)
                        }
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => {
                    const url =
                      updateInfo?.downloadPageUrl || updateInfo?.downloadUrl;
                    if (url) {
                      IpcClient.getInstance().openExternalUrl(url);
                    }
                  }}
                >
                  Open Download Page
                </button>
                <button
                  className="px-4 py-2 border rounded hover:bg-muted"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Remind Me Later
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function AppIcons({
  onHoverChange,
}: {
  onHoverChange: (state: HoverState) => void;
}) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  return (
    // When collapsed: only show the main menu
    <SidebarGroup className="pr-0">
      {/* <SidebarGroupLabel>Dyad</SidebarGroupLabel> */}

      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              (item.to === "/" && pathname === "/") ||
              (item.to !== "/" && pathname.startsWith(item.to));

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  className="font-medium w-14"
                >
                  <Link
                    to={item.to}
                    className={`flex flex-col items-center gap-1 h-14 mb-2 rounded-2xl ${
                      isActive ? "bg-sidebar-accent" : ""
                    }`}
                    onMouseEnter={() => {
                      if (item.title === "Apps") {
                        onHoverChange("start-hover:app");
                      } else if (item.title === "Chat") {
                        onHoverChange("start-hover:chat");
                      } else if (item.title === "Settings") {
                        onHoverChange("start-hover:settings");
                      } else if (item.title === "Library") {
                        onHoverChange("start-hover:library");
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <item.icon className="h-5 w-5" />
                      <span className={"text-sm flex items-center gap-1"}>
                        {item.title}
                        {item.title === "Docs" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted-foreground/15 text-muted-foreground">
                            Beta
                          </span>
                        )}
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
