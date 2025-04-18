import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from "@react-navigation/drawer";
import { Text, View } from "react-native";

export default function Layout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: "#1976D2",
        drawerLabelStyle: { fontSize: 16 },
      }}
    />
  );
}

function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* TÍTULO "MENU" */}
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Text style={{ fontWeight: "bold", fontSize: 16, color: "#888" }}>MENU</Text>
      </View>

      {/* ITENS DO DRAWER */}
      <DrawerItemList
        {...props}
        state={{
          ...props.state,
          routeNames: [...props.state.routeNames].filter(name => name !== "index"),
          routes: [...props.state.routes].filter(route => route.name !== "index"),
        }}
      />


      {/* CONFIGURAÇÕES NO FINAL */}
      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 10 }}>
        <DrawerItem
          label="⚙️ Configurações"
          onPress={() => props.navigation.navigate("Configuracoes")}
          labelStyle={{ fontSize: 16 }}
        />
      </View>
    </DrawerContentScrollView>
  );
}
