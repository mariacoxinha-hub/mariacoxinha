const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const PV = process.env.REDE_PV;
const TOKEN = process.env.REDE_TOKEN;

// 1. Rota para Cartão de Crédito
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

// 2. Rota para Geração de Pix Dinâmico (REDE)
app.post('/api/pix-rede', async (req, res) => {
    const { amount, clientName } = req.body;

    try {
        const response = await fetch('https://api.userede.com.br/v1/pix/qrCodes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(PV + ':' + TOKEN).toString('base64')
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Valor em centavos
                reference: 'MARIACOXINHA-' + Date.now(),
                expiration: 600 // Expira em 10 minutos
            })
        });

        const data = await response.json();

        if (response.ok && (data.qrCode || data.emv)) {
            res.json({
                sucesso: true,
                qrCodeBase64: data.qrCode || data.qrCodeBase64, // Imagem do QR Code
                copiaECola: data.emv || data.pixCopyAndPaste // Código Pix Copia e Cola
            });
        } else {
            res.json({ sucesso: false, mensagem: data.returnMessage || 'Erro ao gerar Pix na Rede.' });
        }
    } catch (error) {
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao gerar Pix.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));