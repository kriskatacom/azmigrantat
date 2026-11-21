import * as Clipboard from "expo-clipboard";

export async function copyText(value: string): Promise<"copied" | "shared"> {
  await Clipboard.setStringAsync(value);
  return "copied";
}
