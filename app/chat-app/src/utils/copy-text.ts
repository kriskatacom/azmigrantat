import { Share } from "react-native";

export async function copyText(value: string): Promise<"copied" | "shared"> {
  await Share.share({ message: value });
  return "shared";
}
