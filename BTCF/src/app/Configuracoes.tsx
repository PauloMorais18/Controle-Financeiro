import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "./ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from '@expo/vector-icons'; // Importa ícones para visual

// --- Definição de Tipo para Categoria ---
interface Categoria {
  chave: number;
  nome_categoria: string;
  tipo_transacao: 'entrada' | 'saida';
  chaveusuario: number;
}

export default function Configuracoes() {
  const { temaEscuro, setTemaEscuro, tema } = useTheme();
  const [emailExportacao, setEmailExportacao] = useState("usuario@email.com");
  const [notificacoes, setNotificacoes] = useState(true);
  const [ipServidor, setIpServidor] = useState("");
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [categoriasEntrada, setCategoriasEntrada] = useState<Categoria[]>([]);
  const [categoriasSaida, setCategoriasSaida] = useState<Categoria[]>([]); // Novo estado para categorias de saída
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [modalAdicionarCategoriaVisivel, setModalAdicionarCategoriaVisivel] = useState(false);
  const [tipoCategoriaAdicionar, setTipoCategoriaAdicionar] = useState<'entrada' | 'saida'>('entrada');

  // Estados para edição de categoria
  const [isEditingCategory, setIsEditingCategory] = useState<boolean>(false);
  const [editedCategoryName, setEditedCategoryName] = useState<string>("");
  const [editedCategoryId, setEditedCategoryId] = useState<number | null>(null);
  const [editedCategoryType, setEditedCategoryType] = useState<'entrada' | 'saida'>('entrada');
  const [networkError, setNetworkError] = useState<string | null>(null); // Estado para erros de rede

  // Função para carregar categorias do backend (agora busca entrada e saída)
  const carregarCategorias = useCallback(async (currentIpServidor: string | null, currentUsuarioId: number | null) => {
    if (!currentIpServidor || currentUsuarioId === null) {
      console.warn("Não foi possível carregar categorias: IP do servidor ou ID do usuário ausente.");
      return;
    }
    setLoadingCategorias(true);
    setNetworkError(null); // Limpa erros de rede anteriores
    try {
      // Buscar categorias de entrada
      const responseEntrada = await fetch(`${currentIpServidor}/categorias/${currentUsuarioId}/entrada`);
      if (!responseEntrada.ok) {
        throw new Error(`Erro ao buscar categorias de entrada: ${responseEntrada.statusText || responseEntrada.status}`);
      }
      const categoriasEntradaData: Categoria[] = await responseEntrada.json();
      setCategoriasEntrada(categoriasEntradaData);

      // Buscar categorias de saída
      const responseSaida = await fetch(`${currentIpServidor}/categorias/${currentUsuarioId}/saida`);
      if (!responseSaida.ok) {
        throw new Error(`Erro ao buscar categorias de saída: ${responseSaida.statusText || responseSaida.status}`);
      }
      const categoriasSaidaData: Categoria[] = await responseSaida.json();
      setCategoriasSaida(categoriasSaidaData);

    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error.message);
      setNetworkError(`Não foi possível carregar as categorias. Verifique o IP e a conexão. Detalhes: ${error.message}`);
      Alert.alert("Erro", `Não foi possível carregar as categorias: ${error.message}`);
    } finally {
      setLoadingCategorias(false);
    }
  }, []);

  // Carregar IP do servidor e ID do usuário ao iniciar
  useEffect(() => {
    async function carregarConfiguracoesIniciais() {
      setNetworkError(null); // Limpa erros de rede anteriores
      const ipSalvo = await AsyncStorage.getItem("ipServidor");
      if (ipSalvo) setIpServidor(ipSalvo);

      let currentUsuarioId: number | null = null;
      const savedUsuarioId = await AsyncStorage.getItem("usuarioId");
      if (savedUsuarioId) {
        currentUsuarioId = parseInt(savedUsuarioId);
        setUsuarioId(currentUsuarioId);
      } else {
        const userEmail = await AsyncStorage.getItem("usuarioEmail");
        if (userEmail && ipSalvo) {
          try {
            const userRes = await fetch(`${ipSalvo}/usuario/por-email/${userEmail}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              currentUsuarioId = userData.chave;
              setUsuarioId(currentUsuarioId);
              await AsyncStorage.setItem("usuarioId", String(userData.chave));
            } else {
              Alert.alert("Erro", "Não foi possível obter o ID do usuário. Faça login novamente.");
            }
          } catch (error: any) {
            console.error("Erro ao buscar ID do usuário pelo email:", error);
            setNetworkError(`Problema ao conectar com o servidor para obter ID do usuário. Detalhes: ${error.message}`);
            Alert.alert("Erro", "Problema ao conectar com o servidor para obter ID do usuário.");
          }
        } else {
          Alert.alert("Erro", "ID do usuário ou Email não encontrado. Por favor, faça login novamente.");
        }
      }

      if (ipSalvo && currentUsuarioId !== null) {
        carregarCategorias(ipSalvo, currentUsuarioId);
      }
    }
    carregarConfiguracoesIniciais();
  }, [carregarCategorias]);

  async function handleSalvarIP() {
    if (!ipServidor.startsWith("http://") && !ipServidor.startsWith("https://")) {
      Alert.alert("Erro", "O IP deve começar com http:// ou https://");
      return;
    }
    setNetworkError(null); // Limpa erros de rede anteriores
    try {
      await AsyncStorage.setItem("ipServidor", ipServidor);
      Alert.alert("✅ Sucesso", "IP do servidor salvo!");
      if (usuarioId !== null) {
        carregarCategorias(ipServidor, usuarioId); // Recarrega categorias com o novo IP
      }
    } catch (error: any) {
      console.error(error);
      setNetworkError(`Não foi possível salvar o IP. Detalhes: ${error.message}`);
      Alert.alert("Erro", "Não foi possível salvar o IP.");
    }
  }

  // Função para adicionar uma nova categoria
  const handleAdicionarCategoria = async () => {
    if (!novaCategoriaNome.trim()) {
      Alert.alert("Erro", "O nome da categoria não pode ser vazio.");
      return;
    }
    if (!ipServidor || usuarioId === null) {
      Alert.alert("Erro", "IP do servidor ou ID do usuário ausente.");
      return;
    }

    setLoadingCategorias(true);
    setNetworkError(null); // Limpa erros de rede anteriores
    try {
      const response = await fetch(`${ipServidor}/categorias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chaveusuario: usuarioId,
          nome_categoria: novaCategoriaNome.trim(),
          tipo_transacao: tipoCategoriaAdicionar,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || `Erro ao adicionar categoria: ${response.statusText || response.status}`);
      }

      Alert.alert("Sucesso", "Categoria adicionada com sucesso!");
      setNovaCategoriaNome("");
      setModalAdicionarCategoriaVisivel(false);
      carregarCategorias(ipServidor, usuarioId); // Recarrega a lista de categorias
    } catch (error: any) {
      console.error("Erro ao adicionar categoria:", error.message);
      setNetworkError(`Não foi possível adicionar a categoria: ${error.message}`);
      Alert.alert("Erro", `Não foi possível adicionar a categoria: ${error.message}`);
    } finally {
      setLoadingCategorias(false);
    }
  };

  // Função para deletar uma categoria
  const handleDeletarCategoria = async (chaveCategoria: number) => {
    if (!ipServidor || usuarioId === null) {
      Alert.alert("Erro", "IP do servidor ou ID do usuário ausente.");
      return;
    }

    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir esta categoria? As transações existentes com esta categoria não serão alteradas.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          onPress: async () => {
            setLoadingCategorias(true);
            setNetworkError(null); // Limpa erros de rede anteriores
            try {
              const response = await fetch(`${ipServidor}/categorias/${chaveCategoria}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ chaveusuario: usuarioId }) // Envia o ID do usuário para validação no backend
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.erro || `Erro ao deletar categoria: ${response.statusText || response.status}`);
              }

              Alert.alert("Sucesso", "Categoria excluída com sucesso!");
              carregarCategorias(ipServidor, usuarioId); // Recarrega a lista de categorias
            } catch (error: any) {
              console.error("Erro ao deletar categoria:", error.message);
              setNetworkError(`Não foi possível excluir a categoria: ${error.message}`);
              Alert.alert("Erro", `Não foi possível excluir a categoria: ${error.message}`);
            } finally {
              setLoadingCategorias(false);
            }
          },
        },
      ]
    );
  };

  // Funções para edição de categoria
  const handleEditCategoryClick = (category: Categoria) => {
    setIsEditingCategory(true);
    setEditedCategoryId(category.chave);
    setEditedCategoryName(category.nome_categoria);
    setEditedCategoryType(category.tipo_transacao);
  };

  const handleSaveEditedCategory = async () => {
    if (!editedCategoryName.trim()) {
      Alert.alert("Erro", "O nome da categoria não pode ser vazio.");
      return;
    }
    if (!ipServidor || usuarioId === null || editedCategoryId === null) {
      Alert.alert("Erro", "Dados incompletos para edição.");
      return;
    }

    setLoadingCategorias(true);
    setNetworkError(null); // Limpa erros de rede anteriores
    try {
      const response = await fetch(`${ipServidor}/categorias/${editedCategoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome_categoria: editedCategoryName.trim(),
          tipo_transacao: editedCategoryType,
          chaveusuario: usuarioId, // Envia o ID do usuário para validação no backend
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || `Erro ao atualizar categoria: ${response.statusText || response.status}`);
      }

      Alert.alert("Sucesso", "Categoria atualizada com sucesso!");
      setIsEditingCategory(false);
      setEditedCategoryId(null);
      setEditedCategoryName("");
      setEditedCategoryType('entrada');
      carregarCategorias(ipServidor, usuarioId); // Recarrega a lista
    } catch (error: any) {
      console.error("Erro ao atualizar categoria:", error.message);
      setNetworkError(`Não foi possível atualizar a categoria: ${error.message}`);
      Alert.alert("Erro", `Não foi possível atualizar a categoria: ${error.message}`);
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingCategory(false);
    setEditedCategoryId(null);
    setEditedCategoryName("");
    setEditedCategoryType('entrada');
  };

  function handleExportarDados() {
    Alert.alert("Exportar Dados", `Os dados foram enviados para: ${emailExportacao}`);
  }

  async function handleLimparDados() {
    Alert.alert(
      "Confirmar Limpeza",
      "Tem certeza que deseja apagar TODOS os dados do aplicativo? Esta ação é irreversível.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Limpar",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert("🧹 Dados limpos", "Todos os dados do aplicativo foram apagados com sucesso.");
            } catch (error: any) {
              console.error("Erro ao limpar AsyncStorage:", error);
              Alert.alert("Erro", `Não foi possível limpar os dados: ${error.message}`);
            }
          },
        },
      ]
    );
  }

  const renderCategoryItem = ({ item }: { item: Categoria }) => (
    <View style={[styles.categoryItem, { borderBottomColor: tema.inputBorderColor }]}>
      {isEditingCategory && editedCategoryId === item.chave ? (
        // Modo de Edição
        <View style={styles.editCategoryContainer}>
          <TextInput
            style={[styles.editCategoryInput, { borderColor: tema.inputBorderColor, color: tema.textColor, backgroundColor: tema.inputBackground }]}
            value={editedCategoryName}
            onChangeText={setEditedCategoryName}
            autoFocus
          />
          <View style={[styles.editCategoryPickerContainer, { borderColor: tema.inputBorderColor, backgroundColor: tema.inputBackground }]}>
            <Picker
              selectedValue={editedCategoryType}
              onValueChange={(itemValue) => setEditedCategoryType(itemValue)}
              style={[styles.editCategoryPicker, { color: tema.textColor }]}
              dropdownIconColor={tema.textColor}
            >
              <Picker.Item label="Entrada" value="entrada" />
              <Picker.Item label="Saída" value="saida" />
            </Picker>
          </View>
          <TouchableOpacity onPress={handleSaveEditedCategory} style={[styles.editButton, { backgroundColor: tema.linkColor }]}>
            <Text style={styles.buttonTextSmall}>Salvar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCancelEdit} style={[styles.deleteButton, { backgroundColor: tema.buttonBackground }]}>
            <Text style={styles.buttonTextSmall}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Modo de Visualização
        <>
          <Text style={[styles.categoryText, { color: tema.textColor }]}>{item.nome_categoria}</Text>
          <Text style={[styles.categoryTypeText, { color: tema.textSecondaryColor }]}>({item.tipo_transacao === 'entrada' ? 'Entrada' : 'Saída'})</Text>
          <View style={styles.categoryActions}>
            <TouchableOpacity onPress={() => handleEditCategoryClick(item)} style={[styles.editButton, { backgroundColor: tema.linkColor }]}>
              <Text style={styles.buttonTextSmall}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeletarCategoria(item.chave)} style={[styles.deleteButton, { backgroundColor: '#D32F2F' }]}>
              <Text style={styles.buttonTextSmall}>Remover</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: tema.backgroundColor }]}>
      {loadingCategorias && ( // Overlay de carregamento para categorias
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tema.linkColor} />
          <Text style={[styles.loadingText, { color: tema.textColor }]}>Carregando categorias...</Text>
        </View>
      )}

      {networkError && ( // Exibe erro de rede
        <View style={[styles.errorContainer, { backgroundColor: tema.sectionBoxBackground }]}>
          <Text style={[styles.errorText, { color: 'red' }]}>{networkError}</Text>
          <Text style={[styles.errorHint, { color: tema.textColor }]}>
            Verifique se o seu servidor backend está rodando e se o IP configurado está correto.
            Para emuladores Android, o IP geralmente é `http://10.0.2.2:3000`. Para iOS, `http://localhost:3000`.
          </Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>👤 Perfil</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.item, { color: tema.itemColor }]}>Nome: Usuário</Text>
        <Text style={[styles.item, { color: tema.itemColor }]}>E-mail: usuario@email.com</Text>
        <View style={styles.rowButtons}>
          <TouchableOpacity style={[styles.button, { backgroundColor: tema.linkColor }]} onPress={() => Alert.alert("Funcionalidade", "Editar Perfil em desenvolvimento")}>
            <Text style={styles.buttonText}>Editar Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: tema.linkColor }]} onPress={() => Alert.alert("Funcionalidade", "Alterar Senha em desenvolvimento")}>
            <Text style={styles.buttonText}>Alterar Senha</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>⚙️ Preferências</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <View style={styles.toggleRow}>
          <Text style={[styles.item, { color: tema.itemColor }]}>Tema Escuro</Text>
          <Switch value={temaEscuro} onValueChange={setTemaEscuro} trackColor={{ false: tema.inputBorderColor, true: tema.linkColor }} thumbColor={tema.textColor} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={[styles.item, { color: tema.itemColor }]}>Notificações</Text>
          <Switch value={notificacoes} onValueChange={setNotificacoes} trackColor={{ false: tema.inputBorderColor, true: tema.linkColor }} thumbColor={tema.textColor} />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>🌐 Configurações do Servidor</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.label, { color: tema.textColor }]}>Endereço IP do servidor:</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: tema.inputBackground,
              borderColor: tema.inputBorderColor,
              color: tema.textColor,
            },
          ]}
          value={ipServidor}
          onChangeText={setIpServidor}
          placeholder="Ex: http://192.168.1.100:3000"
          placeholderTextColor={tema.textSecondaryColor}
          autoCapitalize="none"
        />
        <TouchableOpacity style={[styles.button, { backgroundColor: tema.linkColor }]} onPress={handleSalvarIP}>
          <Text style={styles.buttonText}>Salvar IP</Text>
        </TouchableOpacity>
      </View>

      {/* --- SEÇÃO: GERENCIAR CATEGORIAS --- */}
      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>🏷️ Gerenciar Categorias</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.item, { color: tema.itemColor, marginBottom: 10, fontWeight: 'bold' }]}>Categorias de Entrada:</Text>
        {loadingCategorias ? (
          <ActivityIndicator size="small" color={tema.textColor} />
        ) : categoriasEntrada.length > 0 ? (
          <FlatList
            data={categoriasEntrada}
            keyExtractor={(item) => `entrada-${item.chave.toString()}`}
            renderItem={renderCategoryItem}
            ListEmptyComponent={() => (
              <Text style={[styles.noDataText, { color: tema.itemColor }]}>Nenhuma categoria de entrada cadastrada.</Text>
            )}
          />
        ) : (
          <Text style={[styles.noDataText, { color: tema.itemColor }]}>Nenhuma categoria de entrada cadastrada.</Text>
        )}

        <Text style={[styles.item, { color: tema.itemColor, marginTop: 20, marginBottom: 10, fontWeight: 'bold' }]}>Categorias de Saída:</Text>
        {loadingCategorias ? (
          <ActivityIndicator size="small" color={tema.textColor} />
        ) : categoriasSaida.length > 0 ? (
          <FlatList
            data={categoriasSaida}
            keyExtractor={(item) => `saida-${item.chave.toString()}`}
            renderItem={renderCategoryItem}
            ListEmptyComponent={() => (
              <Text style={[styles.noDataText, { color: tema.itemColor }]}>Nenhuma categoria de saída cadastrada.</Text>
            )}
          />
        ) : (
          <Text style={[styles.noDataText, { color: tema.itemColor }]}>Nenhuma categoria de saída cadastrada.</Text>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: tema.linkColor, marginTop: 25 }]}
          onPress={() => setModalAdicionarCategoriaVisivel(true)}
        >
          <Text style={styles.buttonText}>Adicionar Nova Categoria</Text>
        </TouchableOpacity>
      </View>
      {/* --- FIM SEÇÃO --- */}

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>📁 Dados</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.label, { color: tema.textColor }]}>E-mail para exportação:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: tema.inputBackground, borderColor: tema.inputBorderColor, color: tema.textColor }]}
          value={emailExportacao}
          onChangeText={setEmailExportacao}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Digite o e-mail"
          placeholderTextColor={tema.textSecondaryColor}
        />
        <TouchableOpacity style={[styles.button, { backgroundColor: tema.linkColor }]} onPress={handleExportarDados}>
          <Text style={styles.buttonText}>Exportar Dados</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: tema.textColor }]}>❓ Sobre</Text>
      <View style={[styles.sectionBox, { backgroundColor: tema.sectionBoxBackground }]}>
        <Text style={[styles.item, { color: tema.itemColor }]}>Versão: 1.0.0</Text>
        <Text style={[styles.link, { color: tema.linkColor }]}>Política de Privacidade</Text>
        <Text style={[styles.link, { color: tema.linkColor }]}>Suporte</Text>
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: "#D32F2F", marginBottom: 40 }]} onPress={handleLimparDados}>
        <Text style={styles.buttonText}>🧹 Limpar Dados do Aplicativo</Text>
      </TouchableOpacity>

      {/* Modal para Adicionar Categoria */}
      <Modal
        visible={modalAdicionarCategoriaVisivel}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalAdicionarCategoriaVisivel(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalAdicionarCategoriaVisivel(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: tema.sectionBoxBackground }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: tema.textColor }]}>Adicionar Nova Categoria</Text>

            <Text style={[styles.label, { color: tema.textColor }]}>Tipo de Transação</Text>
            <View style={[styles.pickerContainer, { borderColor: tema.inputBorderColor, backgroundColor: tema.inputBackground }]}>
              <Picker
                selectedValue={tipoCategoriaAdicionar}
                onValueChange={(itemValue) => setTipoCategoriaAdicionar(itemValue)}
                style={{ color: tema.textColor }}
                dropdownIconColor={tema.textColor}
              >
                <Picker.Item label="Entrada" value="entrada" />
                <Picker.Item label="Saída" value="saida" />
              </Picker>
            </View>

            <Text style={[styles.label, { color: tema.textColor }]}>Nome da Categoria</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: tema.inputBackground,
                borderColor: tema.inputBorderColor,
                color: tema.textColor,
              }]}
              placeholder="Ex: Salário, Aluguel, Lazer"
              placeholderTextColor={tema.textSecondaryColor}
              value={novaCategoriaNome}
              onChangeText={setNovaCategoriaNome}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tema.linkColor }]}
                onPress={handleAdicionarCategoria}
                disabled={loadingCategorias}
              >
                {loadingCategorias ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: tema.buttonBackground }]}
                onPress={() => setModalAdicionarCategoriaVisivel(false)}
                disabled={loadingCategorias}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginTop: 30, marginBottom: 12 },
  sectionBox: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  item: { fontSize: 16, marginBottom: 10 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  button: {
    backgroundColor: "#1976D2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 6,
    alignItems: 'center', // Centraliza o texto
  },
  buttonText: { color: "#fff", fontSize: 16, textAlign: "center" },
  rowButtons: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 10 },
  link: { fontSize: 16, textDecorationLine: "underline", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  // Estilos para Gerenciar Categorias
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12, // Aumentado para melhor toque
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexWrap: 'wrap', // Permite quebrar linha em telas menores
  },
  categoryText: {
    fontSize: 16,
    flexShrink: 1,
    marginRight: 10,
  },
  categoryTypeText: { // Estilo para o texto (Entrada/Saída)
    fontSize: 13,
    fontStyle: 'italic',
    marginRight: 10,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#03A9F4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 5,
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 5,
  },
  buttonTextSmall: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
    paddingVertical: 10,
  },
  // Estilos para Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%', // Aumentado para melhor visualização
    borderRadius: 10,
    padding: 25, // Aumentado padding
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22, // Aumentado tamanho
    fontWeight: 'bold',
    marginBottom: 20, // Aumentado margem
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 25, // Aumentado margem
  },
  modalButton: {
    paddingVertical: 12, // Aumentado para melhor toque
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  // Estilos para o modo de edição de categoria
  editCategoryContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10, // Espaço entre itens de edição
  },
  editCategoryInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 16,
    marginRight: 5,
    minWidth: 100,
  },
  editCategoryPickerContainer: {
    flex: 0.8,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    marginRight: 5,
    height: 45, // Altura fixa para o Picker
    justifyContent: 'center',
  },
  editCategoryPicker: {
    height: 45,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'red',
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorHint: {
    fontSize: 14,
  },
});
