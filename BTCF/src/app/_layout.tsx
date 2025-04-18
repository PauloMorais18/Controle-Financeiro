import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { Text, View } from "react-native";

export default function Layout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: "#1976D2",
        drawerLabelStyle: { fontSize: 16 },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    />
  );
}

function CustomDrawerContent(props: any) {
  const { navigation } = props;

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* TÍTULO DO MENU */}
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Text style={{ fontWeight: "bold", fontSize: 16, color: "#888" }}>MENU</Text>
      </View>

      {/* ITENS DO MENU (sem login e cadastro) */}
      <View style={{ marginTop: 10 }}>
        <DrawerItem
          label="👤 Perfil"
          onPress={() => navigation.navigate("Perfil")}
        />
        <DrawerItem
          label="👤 Principal"
          onPress={() => navigation.navigate("Principal")}
        />
        <DrawerItem
          label="👥 Criar Grupo"
          onPress={() => navigation.navigate("CriarGrupo")}
        />
        <DrawerItem
          label="➕ Entrada"
          onPress={() => navigation.navigate("MovimentacaoEntrada")}
        />
        <DrawerItem
          label="➖ Saída"
          onPress={() => navigation.navigate("MovimentacaoSaida")}
        />
        <DrawerItem
          label="📊 Análise"
          onPress={() => navigation.navigate("Analise")}
        />
        <DrawerItem
          label="🧾 Relatório"
          onPress={() => navigation.navigate("Relatorio")}
        />
      </View>

      {/* CONFIGURAÇÕES FIXO NO RODAPÉ */}
      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 10 }}>
        <DrawerItem
          label="⚙️ Configurações"
          onPress={() => navigation.navigate("Configuracoes")}
          labelStyle={{ fontSize: 16 }}
        />
      </View>
    </DrawerContentScrollView>
  );
}
