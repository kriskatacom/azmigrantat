import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedHomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Здравей, {user?.firstName ?? "потребител"}!
      </Text>

      <Text style={styles.text}>
        Това е временна защитена начална страница. Премести тук текущия си
        HomeScreen.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => void logout()}>
        <Text style={styles.buttonText}>Изход</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 12 },
  text: {
    color: "#71717a",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  button: {
    minHeight: 48,
    minWidth: 140,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#ffffff", fontWeight: "700" },
});
