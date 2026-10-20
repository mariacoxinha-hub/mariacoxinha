const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const PV = process.env.REDE_PV;
const TOKEN = process.env.REDE_TOKEN;

app.post('/api/pagar-rede', async (req, res) => {
    const { amount, cardNumber, cardExpiration, cardCvv, cardHolderName } = req.body;

    try {
        // Trata o formato da validade (espera "MM/AAAA" ou "MM/AA")
        const partesValidade = cardExpiration.split('/');
        const mes = partesValidade[0] ? partesValidade[0].trim() : '';
        let ano = partesValidade[1] ? partesValidade[1].trim() : '';
        
        // Se o ano vier com 2 dígitos (ex: 28), transforma em 4 (ex: 2028)
        if (ano.length === 2) {
            ano = '20' + ano;
        }

        const payloadRede = {
            capture: true,
            amount: Math.round(amount * 100), // Converte para centavos
            card: {
                number: cardNumber.replace(/\s+/g, ''), // Remove espaços do cartão
                expirationMonth: mes,
                expirationYear: ano,
                securityCode: cardCvv,
                holderName: cardHolderName
            }
        };

        const response = await fetch('https://api.userede.com.br/v1/transactions', {
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
            res.json({ 
                sucesso: false, 
                mensagem: data.returnMessage || data.message || 'Pagamento não autorizado.' 
            });
        }
    } catch (error) {
        console.error('Erro interno na API de pagamento:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro de conexão com o processador de pagamentos.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));