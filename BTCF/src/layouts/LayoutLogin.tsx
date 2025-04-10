// src/layouts/LayoutLogin.tsx
import { View, StyleSheet } from "react-native";
import { Slot } from "expo-router";

export default function LayoutLogin() {
  return (
    <View style={styles.container}>
      <Slot /> {/* Aqui entra a tela (index.tsx) */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
});
