import { WifiOff } from "lucide-react";
import { LinkButton } from "@/components/ui/primitives";

export default function OfflinePage() {
  return <main className="permission-denied"><WifiOff size={34}/><h1>Connection paused</h1><p>This frontend preview has no live factory connection. Any entered form data is not a submitted mill record; reconnect to the service before relying on it.</p><LinkButton href="/" variant="primary">Return to the Gate</LinkButton></main>;
}
