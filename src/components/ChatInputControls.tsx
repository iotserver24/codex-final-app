import { ContextFilesPicker } from "./ContextFilesPicker";
import { ModelPicker } from "./ModelPicker";
import { ProModeSelector } from "./ProModeSelector";
import { ChatModeSelector } from "./ChatModeSelector";
import { Button } from "./ui/button";
import { useAtom } from "jotai";
import { chatInputValueAtom, selectedChatIdAtom } from "@/atoms/chatAtoms";
import { useAtomValue } from "jotai";
import { IpcClient } from "@/ipc/ipc_client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function ChatInputControls({
  showContextFilesPicker = false,
  value,
  onChange,
}: {
  showContextFilesPicker?: boolean;
  value?: string;
  onChange?: (text: string) => void;
}) {
  const [fallbackValue, setFallbackValue] = useAtom(chatInputValueAtom);
  const inputValue = value ?? fallbackValue;
  const chatId = useAtomValue(selectedChatIdAtom);
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!inputValue?.trim() || enhancing) return;
    setEnhancing(true);
    try {
      const res = await IpcClient.getInstance().enhancePrompt({
        chatId,
        input: inputValue,
      });
      if (res?.text) {
        if (onChange) onChange(res.text);
        else setFallbackValue(res.text);
      }
    } catch (e) {
      // Non-fatal; leave input as-is
      console.error(e);
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="flex">
      <ChatModeSelector />
      <div className="w-1.5"></div>
      <ModelPicker />
      <div className="w-1.5"></div>
      <ProModeSelector />
      <div className="w-1.5"></div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnhance}
        disabled={!inputValue?.trim() || enhancing}
        title="Rewrite your prompt for clarity before sending"
      >
        {enhancing ? (
          <span className="inline-flex items-center">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enhancing…
          </span>
        ) : (
          "Enhance"
        )}
      </Button>
      <div className="w-1"></div>
      {showContextFilesPicker && (
        <>
          <ContextFilesPicker />
          <div className="w-0.5"></div>
        </>
      )}
    </div>
  );
}
