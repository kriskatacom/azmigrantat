import { NetworkContext } from "@/contexts/NetworkContext";
import { useContext } from "react";

export function useNetwork() {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error("useNetwork трябва да се използва в NetworkProvider.");
  }

  return context;
}
