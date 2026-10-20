const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

const PV = process.env.REDE_PV;
const TOKEN = process.env.REDE_TOKEN;

app.get('/', (req, res) => {
    res.send('Servidor Maria Coxinha rodando com sucesso!');
});

app.post('/api/pagar-rede', async (req, res) => {
    const { amount, cardNumber, cardExpiration, cardCvv, cardHolderName } = req.body;

    if (!amount || !cardNumber || !cardExpiration || !cardCvv || !cardHolderName) {
        return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos do cartão.' });
    }

    try {
        const partesValidade = cardExpiration.split('/');
        const mes = partesValidade[0] ? partesValidade[0].trim() : '';
        let ano = partesValidade[1] ? partesValidade[1].trim() : '';
        
        if (ano.length === 2) {
            ano = '20' + ano;
        }

        // Payload completo com o parâmetro 'reference' obrigatório exigido pela Rede
        const payloadRede = {
            capture: true,
            amount: Math.round(amount * 100),
            installments: 1,
            reference: 'MC-' + Date.now(), // Referência única para a transação
            card: {
                number: cardNumber.replace(/\s+/g, ''),
                expirationMonth: mes,
                expirationYear: ano,
                securityCode: cardCvv,
                holderName: cardHolderName
            }
        };

        const response = await fetch('https://api.userede.com.br/erede/v1/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(PV + ':' + TOKEN).toString('base64')
            },
            body: JSON.stringify(payloadRede)
        });

        const data = await response.json();

        if (response.ok && (data.returnCode === '00' || data.returnCode === '000')) {
            res.json({ sucesso: true, transactionId: data.tid });
        } else {
            console.error('Retorno negado pela Rede:', data);
            res.json({ 
                sucesso: false, 
                mensagem: data.returnMessage || data.message || 'Pagamento não autorizado pela operadora.' 
            });
        }
    } catch (error) {
        console.error('Erro interno na API de pagamento:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro de conexão com o processador de pagamentos.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));