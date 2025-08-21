import React, { useEffect, useState } from "react";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Text, View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Slot, usePathname } from "expo-router";
import { ThemeProvider, useTheme } from "./ThemeContext";

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthGate />
    </ThemeProvider>
  );
}

function AuthGate() {
  const [carregando, setCarregando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("usuarioEmail").then((email) => {
      setAutenticado(!!email);
      setCarregando(false);
    });
  }, []);

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return autenticado ? <DrawerWithTheme /> : <Slot />;
}

function DrawerWithTheme() {
  const { tema, temaEscuro } = useTheme();
  const pathname = usePathname();

  // Oculta o Drawer nas rotas públicas
  const ocultarDrawer = pathname === "/" || pathname === "/Cadastro";

  if (ocultarDrawer) {
    return <Slot />;
  }

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: "#1976D2",
        drawerLabelStyle: { fontSize: 16, color: tema.textColor },
        headerStyle: { backgroundColor: temaEscuro ? "#333" : "#1976D2" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {/* Os nomes abaixo DEVEM bater com os arquivos em src/app */}
      <Drawer.Screen name="Principal" options={{ title: "Principal" }} />
      <Drawer.Screen name="Perfil" options={{ title: "Perfil" }} />
      <Drawer.Screen name="Grupo" options={{ title: "Criar Grupo" }} />
      <Drawer.Screen name="GerenciarGrupo" options={{ title: "Gerenciar Grupos" }} />
      <Drawer.Screen name="MovimentacaoEntrada" options={{ title: "Entrada" }} />
      <Drawer.Screen name="MovimentacaoSaida" options={{ title: "Saída" }} />
      <Drawer.Screen name="RelatorioFinanceiro" options={{ title: "Relatório" }} />
      {/* NOVO: tela de investimentos */}
      <Drawer.Screen name="Investimentos" options={{ title: "Investimentos" }} />
      <Drawer.Screen name="ServidorConfig" options={{ title: "Servidor" }} />
      <Drawer.Screen name="Configuracoes" options={{ title: "Configurações" }} />
    </Drawer>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const { tema, temaEscuro } = useTheme();

  const itemBackgroundColor = tema.backgroundColor;
  const activeBackgroundColor = temaEscuro ? "#555" : "#e0e0e0";

  const handleLogout = async () => {
    await AsyncStorage.removeItem("usuarioEmail");
    navigation.reset({ index: 0, routes: [{ name: "index" }] });
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flex: 1, backgroundColor: tema.backgroundColor }}
    >
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Text style={{ fontWeight: "bold", fontSize: 16, color: tema.itemColor }}>
          MENU
        </Text>
      </View>

      <View style={{ marginTop: 10 }}>
        <DrawerItem
          label="📋 Principal"
          onPress={() => navigation.navigate("Principal")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        <DrawerItem
          label="👤 Perfil"
          onPress={() => navigation.navigate("Perfil")}
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
          label="🛠️ Gerenciar Grupos"
          onPress={() => navigation.navigate("GerenciarGrupo")}
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
          label="🧾 Relatório"
          onPress={() => navigation.navigate("RelatorioFinanceiro")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        {/* NOVO: item do menu para Investimentos */}
        <DrawerItem
          label="💹 Investimentos"
          onPress={() => navigation.navigate("Investimentos")}
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        <DrawerItem
          label="🖥️ Servidor"
          onPress={() => navigation.navigate("ServidorConfig")} // CORRIGIDO: nome da rota com 'C' maiúsculo
          labelStyle={{ color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 10 }}>
        <DrawerItem
          label="⚙️ Configurações"
          onPress={() => navigation.navigate("Configuracoes")}
          labelStyle={{ fontSize: 16, color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
        <DrawerItem
          label="🚪 Sair"
          onPress={handleLogout}
          labelStyle={{ fontSize: 16, color: tema.textColor }}
          style={{ backgroundColor: itemBackgroundColor }}
          activeBackgroundColor={activeBackgroundColor}
        />
      </View>
    </DrawerContentScrollView>
  );
}