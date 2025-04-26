// funcoes.ts
const API_BASE_URL = "http://192.168.68.101:3000";

export const postEntrada = async (body: any) => {
  const response = await fetch(`${API_BASE_URL}/entrada`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Erro ao inserir a entrada");
  }

  const data = await response.json();
  return data;
};

export const getEntradas = async () => {
  const response = await fetch(`${API_BASE_URL}/entrada`);

  if (!response.ok) {
    throw new Error("Erro ao buscar entradas");
  }

  const data = await response.json();
  return data;
};
