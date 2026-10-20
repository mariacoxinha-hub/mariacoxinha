const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

// Vamos usar Variáveis de Ambiente do Render para maior segurança!
const PV = process.env.REDE_PV;
const TOKEN = process.env.REDE_TOKEN;

app.post('/api/pagar-rede', async (req, res) => {
    const { amount, cardNumber, cardExpiration, cardCvv, cardHolderName } = req.body;

    try {
        const response = await fetch('https://api.userede.com.br/v1/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(PV + ':' + TOKEN).toString('base64')
            },
            body: JSON.stringify({
                capture: true,
                amount: Math.round(amount * 100),
                card: {
                    number: cardNumber,
                    expirationMonth: cardExpiration.split('/')[0],
                    expirationYear: cardExpiration.split('/')[1],
                    securityCode: cardCvv,
                    holderName: cardHolderName
                }
            })
        });

        const data = await response.json();

        if (response.ok && data.returnCode === '00') {
            res.json({ sucesso: true, transactionId: data.tid });
        } else {
            res.json({ sucesso: false, mensagem: data.returnMessage || 'Erro ao processar pagamento.' });
        }
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor de pagamento.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));