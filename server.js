const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// Credenciais protegidas via Variáveis de Ambiente do Render
const REDE_PV = process.env.REDE_PV;
const REDE_TOKEN = process.env.REDE_TOKEN;
const REDE_URL = 'https://api.userede.com.br/e-rede/v1/transactions';

// Rota de teste para manter o servidor acordado (UptimeRobot)
app.get('/', (req, res) => {
    res.status(200).send('Servidor Maria Coxinha rodando perfeitamente!');
});

// Rota de pagamento da e.Rede (v1)
app.post('/api/pagar-rede', async (req, res) => {
    try {
        const { amount, cardNumber, cardExpiration, cardCvv, cardHolderName } = req.body;

        if (!amount || !cardNumber || !cardExpiration || !cardCvv || !cardHolderName) {
            return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos do cartão.' });
        }

        // Converte o valor para centavos (ex: R$ 45,50 vira 4550) e garante que seja inteiro
        const valorEmCentavos = Math.round(Number(amount) * 100);

        // Separa a validade (MM/AA) para o formato numérico exigido pela API da Rede
        const partesData = cardExpiration.split('/');
        if (partesData.length !== 2) {
            return res.status(400).json({ sucesso: false, mensagem: 'Formato de validade inválido. Use MM/AA.' });
        }

        const expirationMonth = parseInt(partesData[0], 10);
        let yearStr = partesData[1].trim();
        // Garante que o ano tenha 4 dígitos (ex: "26" vira 2026)
        if (yearStr.length === 2) {
            yearStr = '20' + yearStr;
        }
        const expirationYear = parseInt(yearStr, 10);

        // Monta o corpo da requisição exatamente nos parâmetros raiz da e.Rede (v1)
        const payloadRede = {
            capture: true,
            amount: valorEmCentavos,
            cardNumber: cardNumber.replace(/\s+/g, ''),
            expirationMonth: expirationMonth,
            expirationYear: expirationYear,
            securityCode: cardCvv,
            cardHolderName: cardHolderName
        };

        const response = await axios.post(REDE_URL, payloadRede, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${REDE_PV}:${REDE_TOKEN}`).toString('base64')
            }
        });

        const transacao = response.data;
        const returnCode = transacao.returnCode || (transacao.debit && transacao.debit.returnCode);
        const returnMessage = transacao.returnMessage || (transacao.debit && transacao.debit.returnMessage);

        // Código '00' significa transação aprovada na e.Rede
        if (returnCode === '00') {
            return res.json({ sucesso: true, mensagem: 'Pagamento aprovado com sucesso!', transacao });
        } else {
            return res.json({ sucesso: false, mensagem: returnMessage || 'Pagamento não autorizado.' });
        }

    } catch (error) {
        console.error('Erro na integração com a Rede:', error.response ? error.response.data : error.message);
        const erroDetalhe = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
        return res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao processar pagamento: ' + erroDetalhe });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});