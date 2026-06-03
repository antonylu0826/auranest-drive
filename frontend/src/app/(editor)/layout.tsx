import type { ReactNode } from "react";

export default function EditorLayout({ children }: { children: ReactNode }) {
  return <div className="m-0 overflow-hidden h-screen w-screen">{children}</div>;
}
