// src/app/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Cria o contexto de tema
const ThemeContext = createContext({
  temaEscuro: false,
  setTemaEscuro: () => {},
  tema: {
    backgroundColor: "#fdfdfd",
    textColor: "#333",
    sectionBoxBackground: "#f9f9f9",
    itemColor: "#444",
    shadowColor: "#000",
    linkColor: "#1976D2",
    inputBackground: "#fff",
    inputBorderColor: "#ccc",
  },
});

export const ThemeProvider = ({ children }) => {
  const [temaEscuro, setTemaEscuro] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Novo estado para controle de carregamento

  // Carrega o tema salvo ao iniciar o app
  useEffect(() => {
    const carregarTema = async () => {
      try {
        const temaSalvo = await AsyncStorage.getItem("temaEscuro");
        if (temaSalvo !== null) {
          setTemaEscuro(JSON.parse(temaSalvo));
        } else {
          setTemaEscuro(Appearance.getColorScheme() === "dark");
        }
      } catch (error) {
        console.error("Erro ao carregar tema:", error);
      } finally {
        setIsLoading(false); // Marca o carregamento como concluído
      }
    };
    carregarTema();
  }, []);

  // Salva o tema sempre que ele mudar
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem("temaEscuro", JSON.stringify(temaEscuro));
    }
  }, [temaEscuro, isLoading]);

  // Define os estilos do tema
  const temas = {
    claro: {
      backgroundColor: "#fdfdfd",
      textColor: "#333",
      sectionBoxBackground: "#f9f9f9",
      itemColor: "#444",
      shadowColor: "#000",
      linkColor: "#1976D2",
      inputBackground: "#fff",
      inputBorderColor: "#ccc",
    },
    escuro: {
      backgroundColor: "#1a1a1a",
      textColor: "#fff",
      sectionBoxBackground: "#2a2a2a",
      itemColor: "#ccc",
      shadowColor: "#fff",
      linkColor: "#42a5f5",
      inputBackground: "#333",
      inputBorderColor: "#555",
    },
  };

  const tema = temaEscuro ? temas.escuro : temas.claro;

  // Evita renderizar os filhos até que o tema esteja carregado
  if (isLoading) {
    return null; // Ou você pode retornar um componente de carregamento, como <View><Text>Carregando...</Text></View>
  }

  return (
    <ThemeContext.Provider value={{ temaEscuro, setTemaEscuro, tema }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para usar o tema
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider");
  }
  return context;
};