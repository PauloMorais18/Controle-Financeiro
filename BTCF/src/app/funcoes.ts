export const servidorApi = 'http://192.168.68.106:3000'; 

export async function postEntrada(dados: any) {
  try {
    const resposta = await fetch(`${servidorApi}/entrada`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dados),
    });

    if (!resposta.ok) {
      const textoErro = await resposta.text();
      throw new Error(`Erro ao inserir a entrada: ${textoErro}`);
    }

    const data = await resposta.json();
    return data;
  } catch (erro: any) {
    console.error('Erro ao inserir entrada:', erro.message);
    throw erro;
  }
}