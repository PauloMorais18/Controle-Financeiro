import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";

export const screenOptions = {
    headerShown: true,
    title: "Perfil",
  };

export default function Perfil() {
  function handleEditarPerfil() {
    Alert.alert("Editar Perfil", "Função de edição de perfil em desenvolvimento.");
  }

  function handleLogout() {
    Alert.alert("Sair", "Você saiu da sua conta.");
  }
  
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: "https://www.w3schools.com/howto/img_avatar.png" }}
        style={styles.avatar}
      />
      <Text style={styles.nome}>Exemplo nome</Text>
      <Text style={styles.email}>exemplo18@gmail.com</Text>

      <TouchableOpacity style={styles.botao} onPress={handleEditarPerfil}>
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
    backgroundColor: "#fff",
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
    color: "#333",
  },
  email: {
    fontSize: 16,
    color: "#777",
    marginBottom: 24,
  },
  botao: {
    backgroundColor: "#1976D2",
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
  