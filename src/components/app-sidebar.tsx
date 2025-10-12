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
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar"; // import useSidebar hook
import { useEffect, useState, useRef } from "react";
import { useAtom } from "jotai";
import { dropdownOpenAtom } from "@/atoms/uiAtoms";
import { showError } from "@/lib/toast";
import { toast } from "@/lib/toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { useSettings } from "@/hooks/useSettings";
import { IpcClient } from "@/ipc/ipc_client";
// Removed unused local interface

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  // {
  //   title: "Docs",
  //   to: "/docs",
  //   icon: Globe,
  // },
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
  const [isDonateOpen, setIsDonateOpen] = useState(false);
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
    changelog?: string;
  }>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [systemPlatform, setSystemPlatform] = useState<string>("");
  const { settings } = useSettings();

  // Strict sanitation schema for inline HTML in markdown (images, audio/video only)
  const markdownSanitizeSchema = {
    ...defaultSchema,
    tagNames: [
      ...(defaultSchema?.tagNames || []),
      "img",
      "video",
      "source",
      "audio",
      "figure",
      "figcaption",
      "picture",
    ],
    attributes: {
      ...defaultSchema?.attributes,
      img: [["src"], ["alt"], ["title"], ["width"], ["height"], ["loading"]],
      video: [
        ["src"],
        ["poster"],
        ["width"],
        ["height"],
        ["controls"],
        ["autoplay"],
        ["muted"],
        ["loop"],
        ["playsinline"],
      ],
      audio: [["src"], ["controls"], ["autoplay"], ["loop"], ["muted"]],
      source: [["src"], ["type"], ["media"], ["sizes"], ["srcSet"]],
      a: [
        ...((defaultSchema?.attributes as any)?.a || []),
        ["target"],
        ["rel"],
      ],
    },
    protocols: {
      ...(defaultSchema as any)?.protocols,
      src: ["http", "https", "data"],
      href: ["http", "https", "mailto"],
    },
  } as const;

  useEffect(() => {
    IpcClient.getInstance().getAppVersion?.().then(setAppVersion);
    IpcClient.getInstance().getSystemPlatform?.().then(setSystemPlatform);
  }, []);

  // Listen for update notifications from main process
  useEffect(() => {
    const handleUpdateAvailable = (updateData: any) => {
      console.log("Update available event received:", updateData);

      // Create platform buttons from the API response if available
      let platformButtons: { label: string; url: string }[] | undefined;
      if (updateData.releaseInfo?.items) {
        platformButtons = updateData.releaseInfo.items.flatMap((item: any) =>
          item.variants.map((variant: any) => ({
            label: `${item.platform} (${variant.arch}) - ${variant.packageType}`,
            url: variant.url,
          })),
        );
      }

      setUpdateInfo({
        version: updateData.version,
        releaseNotes: updateData.description || updateData.changelog || "",
        downloadUrl: updateData.downloadUrl || "",
        changelog: updateData.changelog || updateData.description || "",
        platformButtons,
      });
      setShowUpdateModal(true);
    };

    // Listen for update-available events from main process
    const ipcRenderer = (window as any).electron.ipcRenderer;
    if (ipcRenderer) {
      ipcRenderer.on("update-available", handleUpdateAvailable);

      return () => {
        ipcRenderer.removeListener("update-available", handleUpdateAvailable);
      };
    }
  }, []);

  // Manual update check on mount (fallback)
  useEffect(() => {
    (async () => {
      try {
        const result = await IpcClient.getInstance().checkForUpdatesXibe();
        if (!appVersion || !result.hasUpdate || !result.releaseInfo) return;

        const isNewer = (a: string, b: string) => {
          const pa = a.split(".").map(Number);
          const pb = b.split(".").map(Number);
          for (let i = 0; i < 3; i++) {
            if ((pa[i] || 0) < (pb[i] || 0)) return true;
            if ((pa[i] || 0) > (pb[i] || 0)) return false;
          }
          return false;
        };

        if (isNewer(appVersion, result.latestVersion)) {
          const info = {
            version: result.latestVersion,
            releaseNotes:
              result.changelog || result.releaseInfo?.changelog || "",
            downloadUrl: result.downloadUrl || "",
            changelog: result.changelog || result.releaseInfo?.changelog || "",
          } as const;
          // Create platform buttons from the new API response
          let platformButtons: { label: string; url: string }[] | undefined;
          if (result.releaseInfo?.items) {
            const os = await IpcClient.getInstance().getSystemPlatform?.();
            platformButtons = result.releaseInfo.items.flatMap((item: any) =>
              item.variants.map((variant: any) => ({
                label: `${item.platform} (${variant.arch}) - ${variant.packageType}`,
                url: variant.url,
              })),
            );

            // Move detected OS buttons to front
            if (os) {
              const startsWithOs = (label: string) =>
                (os === "win32" && label.toLowerCase().startsWith("windows")) ||
                (os === "darwin" && label.toLowerCase().startsWith("mac")) ||
                (os === "linux" && label.toLowerCase().startsWith("linux"));
              platformButtons.sort((a, b) =>
                startsWithOs(a.label) ? -1 : startsWithOs(b.label) ? 1 : 0,
              );
            }
          }

          setUpdateInfo({ ...info, platformButtons: platformButtons || [] });
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
      const result = await IpcClient.getInstance().checkForUpdatesXibe();

      if (result.hasUpdate && result.releaseInfo && result.downloadUrl) {
        // Create platform buttons from the new API response
        let platformButtons: { label: string; url: string }[] | undefined;
        if (result.releaseInfo?.items) {
          const os = await IpcClient.getInstance().getSystemPlatform?.();
          platformButtons = result.releaseInfo.items.flatMap((item: any) =>
            item.variants.map((variant: any) => ({
              label: `${item.platform} (${variant.arch}) - ${variant.packageType}`,
              url: variant.url,
            })),
          );

          // Move detected OS buttons to front
          if (os) {
            const startsWithOs = (label: string) =>
              (os === "win32" && label.toLowerCase().startsWith("windows")) ||
              (os === "darwin" && label.toLowerCase().startsWith("mac")) ||
              (os === "linux" && label.toLowerCase().startsWith("linux"));
            platformButtons.sort((a, b) =>
              startsWithOs(a.label) ? -1 : startsWithOs(b.label) ? 1 : 0,
            );
          }
        }

        const info = {
          version: result.latestVersion,
          releaseNotes: result.changelog || result.releaseInfo?.changelog || "",
          downloadUrl: result.downloadUrl,
          downloadPageUrl: result.downloadUrl,
          readmeUrl: result.releaseInfo?.changelogUrl,
          changelog: result.changelog || result.releaseInfo?.changelog || "",
        } as const;
        setUpdateInfo({ ...info, platformButtons: platformButtons || [] });
        setShowUpdateModal(true);
      } else {
        const notify = toast.success ?? toast;
        notify("You are using the latest version.");
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
          onClick={() => setIsDonateOpen(true)}
        >
          <Gift className="w-4 h-4" /> Donate
        </button>

        {/* Donate Modal */}
        <Dialog open={isDonateOpen} onOpenChange={setIsDonateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-500" />
                Support Xibe AI
              </DialogTitle>
              <DialogDescription>
                Your donation helps fund development and infrastructure. Choose
                a platform below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  IpcClient.getInstance().openExternalUrl(
                    "https://razorpay.me/@megavault",
                  )
                }
                className="justify-start"
              >
                🇮🇳 Razorpay (India)
                <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  IpcClient.getInstance().openExternalUrl(
                    "https://buymeacoffee.com/r3ap3redit",
                  )
                }
                className="justify-start"
              >
                ☕ Buy Me a Coffee
                <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  IpcClient.getInstance().openExternalUrl(
                    "https://buy.polar.sh/polar_cl_NR3IF9VYKBFO5QHq4Vi8fLGLGpC3Mb6h3EU5r3Crspl",
                  )
                }
                className="justify-start"
              >
                ❄️ Polar
                <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent text-sm mt-2"
          onClick={handleCheckForUpdates}
        >
          <RefreshCw className="w-4 h-4" /> Check for Updates
        </button>
        {/* Update Modal */}
        <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Info className="w-6 h-6 text-blue-500" />
                Update Available
              </DialogTitle>
              <DialogDescription>
                A new version ({updateInfo?.version}) is available for download.
              </DialogDescription>
            </DialogHeader>
            {updateInfo?.changelog ? (
              <div className="mt-2">
                <div className="font-semibold mb-1">What's New</div>
                <div className="prose dark:prose-invert max-h-96 overflow-y-auto border rounded p-3">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[
                      rehypeRaw,
                      [rehypeSanitize, markdownSanitizeSchema],
                    ]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-lg font-semibold mb-2">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-semibold mb-2">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold mb-1">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => <p className="mb-2">{children}</p>,
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-2">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-2">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="mb-1">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">
                          {children}
                        </code>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                      img: (props) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          {...props}
                          loading="lazy"
                          className="max-w-full h-auto rounded"
                        />
                      ),
                      video: (props) => (
                        <video {...props} controls className="w-full rounded" />
                      ),
                      audio: (props) => (
                        <audio {...props} controls className="w-full" />
                      ),
                      source: (props) => <source {...props} />,
                    }}
                  >
                    {updateInfo.changelog}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <>
                <div className="font-semibold mb-1">Release Notes:</div>
                {renderReleaseNotes(updateInfo?.releaseNotes)}
              </>
            )}
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const url =
                      updateInfo?.downloadPageUrl || updateInfo?.downloadUrl;
                    if (url) {
                      IpcClient.getInstance().openExternalUrl(url);
                    }
                  }}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download for{" "}
                  {systemPlatform === "win32"
                    ? "Windows"
                    : systemPlatform === "darwin"
                      ? "macOS"
                      : "Linux"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Remind Me Later
                </Button>
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
