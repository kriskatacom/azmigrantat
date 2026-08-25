import {
  installNetworkGuard,
  subscribeFetchConnectivity,
} from "@/services/network-guard";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";

installNetworkGuard();

interface NetworkContextValue {
  isOffline: boolean;
  isInternetReachable: boolean | null;
  refresh: () => Promise<void>;
}

export const NetworkContext = createContext<NetworkContextValue | undefined>(
  undefined,
);

function isOfflineState(state: NetInfoState): boolean {
  if (state.isConnected === false) {
    return true;
  }

  if (state.isInternetReachable === false) {
    return true;
  }

  return false;
}

export function NetworkProvider({ children }: PropsWithChildren) {
  const [linkOffline, setLinkOffline] = useState(false);
  const [requestOffline, setRequestOffline] = useState(false);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(
    null,
  );

  const applyState = useCallback((state: NetInfoState) => {
    setIsInternetReachable(state.isInternetReachable);
    setLinkOffline(isOfflineState(state));
  }, []);

  const refresh = useCallback(async () => {
    const state = await NetInfo.refresh();
    applyState(state);
  }, [applyState]);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(applyState);
    const unsubscribeFetch = subscribeFetchConnectivity(setRequestOffline);

    void NetInfo.fetch().then(applyState);

    const appState = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void NetInfo.refresh().then(applyState);
      }
    });

    return () => {
      unsubscribeNetInfo();
      unsubscribeFetch();
      appState.remove();
    };
  }, [applyState]);

  const value = useMemo(
    () => ({
      isOffline: linkOffline || requestOffline,
      isInternetReachable,
      refresh,
    }),
    [isInternetReachable, linkOffline, refresh, requestOffline],
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}
