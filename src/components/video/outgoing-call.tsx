import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  name?: string;
  onCancel: () => void;
};

export default function OutgoingCall({
  visible,
  name = "Потребител",
  onCancel,
}: Props) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={42} color="#ffffff" />
      </View>

      <Text style={styles.name}>{name}</Text>

      <Text style={styles.status}>Обаждане...</Text>

      <TouchableOpacity style={styles.endButton} onPress={onCancel}>
        <Ionicons name="call" size={30} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#111827",
    zIndex: 20,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#374151",

    marginBottom: 20,
  },

  name: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "600",
  },

  status: {
    marginTop: 8,

    color: "#9ca3af",
    fontSize: 16,
  },

  endButton: {
    position: "absolute",
    bottom: 50,

    width: 64,
    height: 64,
    borderRadius: 32,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#ef4444",
  },
});
