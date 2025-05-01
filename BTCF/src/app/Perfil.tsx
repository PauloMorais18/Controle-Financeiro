import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from "react-native";
import { useTheme } from "./ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export const screenOptions = {
  headerShown: true,
  title: "Perfil",
};

export default function Perfil() {
  const { tema } = useTheme();
  const router = useRouter();

  function handleEditarPerfil() {
    Alert.alert("Editar Perfil", "Função de edição de perfil em desenvolvimento.");
  }

  async function handleLogout() {
    Alert.alert("Sair da Conta", "Você realmente deseja sair?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("usuarioEmail");
            await AsyncStorage.removeItem("usuarioSenha");
            await AsyncStorage.removeItem("usuarioNome");
            await AsyncStorage.removeItem("usuarioId");
            router.replace("/"); // Volta para o login
          } catch (error) {
            console.error("Erro ao sair:", error);
            Alert.alert("Erro", "Não foi possível sair da conta.");
          }
        },
      },
    ]);
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
