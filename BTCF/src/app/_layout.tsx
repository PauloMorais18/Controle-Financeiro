import React from "react";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItem, DrawerContentComponentProps } from "@react-navigation/drawer";
import { Text, View } from "react-native";
import { ThemeProvider, useTheme } from "./ThemeContext";

export default function Layout() {
  return (
    <ThemeProvider>
      <DrawerWithTheme />
    </ThemeProvider>
  );
}

// Componente separado para usar o useTheme dentro do Drawer
function DrawerWithTheme() {
  const { tema, temaEscuro } = useTheme(); // Acessa o tema atual

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: "#1976D2",
        drawerLabelStyle: { fontSize: 16, color: tema.textColor },
        headerStyle: {
          backgroundColor: temaEscuro ? "#333" : "#1976D2",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Perfil" options={{ title: "Perfil" }} />
      <Drawer.Screen name="Principal" options={{ title: "Principal" }} />
      <Drawer.Screen name="Grupo" options={{ title: "Criar Grupo" }} />
      <Drawer.Screen name="MovimentacaoEntrada" options={{ title: "Entrada" }} />
      <Drawer.Screen name="MovimentacaoSaida" options={{ title: "Saída" }} />
      <Drawer.Screen name="Analise" options={{ title: "Análise" }} />
      <Drawer.Screen name="RelatorioFinanceiro" options={{ title: "Relatório" }} />
      <Drawer.Screen name="Configuracoes" options={{ title: "Configurações" }} />
    </Drawer>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const { tema, temaEscuro } = useTheme(); // Acessa o tema para estilizar o Drawer

  // Define as cores com base no tema
  const itemBackgroundColor = tema.backgroundColor; // Mesmo fundo da gaveta
  const activeBackgroundColor = temaEscuro ? "#555" : "#e0e0e0"; // Fundo ao interagir

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flex: 1, backgroundColor: tema.backgroundColor }}
    >
      {/* TÍTULO DO MENU */}
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Text style={{ fontWeight: "bold", fontSize: 16, color: tema.itemColor }}>
          MENU
        </Text>
      </View>

      {/* ITENS DO MENU */}
      <View style={{ marginTop: 10 }}>
        <DrawerItem
          label="👤 Perfil"
          onPress={() => navigation.navigate("Perfil")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        <DrawerItem
          label="👤 Principal"
          onPress={() => navigation.navigate("Principal")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        <DrawerItem
          label="👥 Criar Grupo"
          onPress={() => navigation.navigate("Grupo")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        <DrawerItem
          label="➕ Entrada"
          onPress={() => navigation.navigate("MovimentacaoEntrada")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        <DrawerItem
          label="➖ Saída"
          onPress={() => navigation.navigate("MovimentacaoSaida")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        <DrawerItem
          label="📊 Análise"
          onPress={() => navigation.navigate("Analise")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        <DrawerItem
          label="🧾 Relatório"
          onPress={() => navigation.navigate("RelatorioFinanceiro")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
      </View>

      {/* CONFIGURAÇÕES FIXO NO RODAPÉ */}
      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 10 }}>
        <DrawerItem
          label="⚙️ Configurações"
          onPress={() => navigation.navigate("Configuracoes")}
          labelStyle={{ fontSize: 16, color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
      </View>
    </DrawerContentScrollView>
  );
}