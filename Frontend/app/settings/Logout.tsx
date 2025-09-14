import React, { useState } from "react";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

export default function Logout() {
  const [rememberLogin, setRememberLogin] = useState(true);

  const handleLogout = () => {
    Alert.alert("Logout", "You have been logged out securely.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🚪 Logout</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Remember login on this device</Text>
        <Switch value={rememberLogin} onValueChange={setRememberLogin} />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212", padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", color: "#00e0ff", marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  label: { color: "#fff", fontSize: 16 },
  button: { backgroundColor: "#ff4d4d", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
