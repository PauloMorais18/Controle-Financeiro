import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";

export default function Grupo() {
  const [grupoCriado, setGrupoCriado] = useState(false);
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [membros, setMembros] = useState<string[]>([]);
  const [novoMembro, setNovoMembro] = useState("");
  const [modoEdicao, setModoEdicao] = useState<number | null>(null);

  function criarGrupo() {
    if (nomeGrupo.trim().length === 0) {
      Alert.alert("Erro", "Digite um nome para o grupo.");
      return;
    }
    setGrupoCriado(true);
  }

  function adicionarMembro() {
    if (novoMembro.trim().length === 0) return;

    if (modoEdicao !== null) {
      const membrosAtualizados = [...membros];
      membrosAtualizados[modoEdicao] = novoMembro;
      setMembros(membrosAtualizados);
      setModoEdicao(null);
    } else {
      setMembros([...membros, novoMembro]);
    }

    setNovoMembro("");
  }

  function editarMembro(index: number) {
    setModoEdicao(index);
    setNovoMembro(membros[index]);
  }

  function removerMembro(index: number) {
    Alert.alert("Remover", "Deseja remover este membro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          const membrosAtualizados = membros.filter((_, i) => i !== index);
          setMembros(membrosAtualizados);
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {!grupoCriado ? (
        <>
          <Text style={styles.title}>Criar Grupo</Text>
          <TextInput
            placeholder="Nome do grupo"
            value={nomeGrupo}
            onChangeText={setNomeGrupo}
            style={styles.input}
          />
          <TouchableOpacity style={styles.button} onPress={criarGrupo}>
            <Text style={styles.buttonText}>Criar grupo</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Grupo: {nomeGrupo}</Text>

          <Text style={styles.subtitle}>Membros</Text>
          <FlatList
            data={membros}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.memberItem}>
                <Text style={styles.memberName}>{item}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => editarMembro(index)}>
                    <Text style={styles.edit}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removerMembro(index)}>
                    <Text style={styles.remove}>❌</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ fontStyle: "italic", color: "#888" }}>
                Nenhum membro ainda.
              </Text>
            }
            style={{ marginBottom: 20 }}
          />

          <TextInput
            placeholder="Nome do membro"
            value={novoMembro}
            onChangeText={setNovoMembro}
            style={styles.input}
          />
          <TouchableOpacity style={styles.button} onPress={adicionarMembro}>
            <Text style={styles.buttonText}>
              {modoEdicao !== null ? "Salvar edição" : "Adicionar membro"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#1976D2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  memberName: {
    fontSize: 16,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginLeft: 12,
  },
  edit: {
    fontSize: 18,
    color: "#555",
    marginRight: 12,
  },
  remove: {
    fontSize: 18,
    color: "#c62828",
  },
});
