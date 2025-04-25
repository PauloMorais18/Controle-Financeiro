// Perfil.tsx
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";
import { useTheme } from "./ThemeContext"; // Importa o hook useTheme

export const screenOptions = {
  headerShown: true,
  title: "Perfil",
};

export default function Perfil() {
  const { tema } = useTheme(); // Acessa o tema atual

  function handleEditarPerfil() {
    Alert.alert("Editar Perfil", "Função de edição de perfil em desenvolvimento.");
  }

  function handleLogout() {
    Alert.alert("Sair", "Você saiu da sua conta.");
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      <Image
        source={{ uri: "https://www.w3schools.com/howto/img_avatar.png" }}
        style={styles.avatar}
      />
      <Text style={[styles.nome, { color: tema.textColor }]}>Exemplo nome</Text>
      <Text style={[styles.email, { color: tema.itemColor }]}>exemplo18@gmail.com</Text>

      <TouchableOpacity style={[styles.botao, { backgroundColor: tema.linkColor }]} onPress={handleEditarPerfil}>
        <Text style={styles.botaoTexto}>✏️ Editar Perfil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.botao, styles.logout]} onPress={handleLogout}>
        <Text style={styles.botaoTexto}>🚪 Sair da Conta</Text>
      </TouchableOpacity>
    </View>
  );
}

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    alignItems: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  nome: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 24,
  },
  botao: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginVertical: 8,
  },
  logout: {
    backgroundColor: "#f44336",
  },
  botaoTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});