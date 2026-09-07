import { SocketContext } from "@/contexts/SocketContext";
import { useContext } from "react";

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket трябва да се използва вътре в SocketProvider.");
  }

  return context;
}
