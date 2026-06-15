require('dotenv').config();
const twilio = require('twilio');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKey = process.env.TWILIO_API_KEY;
const apiSecret = process.env.TWILIO_API_SECRET;
const client = new twilio(apiKey, apiSecret, { accountSid });

const ALPHA_VANTAGE_API_KEY = '2VCAG7M6VXACT567'; // Replace 'demo' with your actual API key
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

// Function to fetch and log data from Alpha Vantage API
function fetchAlphaVantageData() {
  // URLs to fetch data from Alpha Vantage API using different parameters
  const urls = [
    `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=${ALPHA_VANTAGE_API_KEY}`,
    `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`,
    `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&month=2009-01&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}`,
    `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=${ALPHA_VANTAGE_API_KEY}&datatype=csv`
  ];

  // Function to handle each request
  urls.forEach(url => {
    request.get({
      url: url,
      json: true,
      headers: { 'User-Agent': 'request' }
    }, (err, res, data) => {
      if (err) {
        console.error('Error:', err);
      } else if (res.statusCode !== 200) {
        console.error('Status:', res.statusCode);
      } else {
        // Log the data received from the API
        console.log(`Data from URL: ${url}`);
        console.log(data);
      }
    });
  });
}

// Function to send a stock alert
async function sendStockAlert() {
  try {
    console.log("sendStockAlert function called");

    // Fetch stock data from Alpha Vantage
    const response = await axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=${ALPHA_VANTAGE_API_KEY}`);
    console.log("Alpha Vantage response:", response.data);

    if (!response.data['Time Series (Daily)']) {
      console.error("Invalid Alpha Vantage response:", response.data);
      return;
    }

    const stockData = response.data['Time Series (Daily)'];
    const latestDate = Object.keys(stockData)[0];
    const latestStockInfo = stockData[latestDate];

    const messageBody = `Stock Alert for IBM on ${latestDate}:\nOpen: ${latestStockInfo['1. open']}\nHigh: ${latestStockInfo['2. high']}\nLow: ${latestStockInfo['3. low']}\nClose: ${latestStockInfo['4. close']}\nVolume: ${latestStockInfo['5. volume']}`;

    // Send WhatsApp message via Twilio
    const message = await client.messages.create({
      from: TWILIO_WHATSAPP_NUMBER,
      body: messageBody,
      to: 'whatsapp:+918792354951' // Replace with your phone number
    });

    console.log("Twilio message response:", message);
    console.log('Stock alert sent successfully!');
  } catch (error) {
    console.error('Error sending stock alert:', error);
  }
}

// Endpoint to handle incoming messages
app.post('/incoming', (req, res) => {
  console.log("Received message:", req.body);
  const message = req.body.Body.trim().toLowerCase();
  
  if (message === 'stock') {
    sendStockAlert().then(() => {
      res.send('<Response><Message>Stock alert sent!</Message></Response>');
    }).catch(error => {
      res.send('<Response><Message>Error sending stock alert.</Message></Response>');
    });
  } else {
    res.send('<Response><Message>Unknown command.</Message></Response>');
  }
});

// Endpoint to handle status callbacks
app.post('/status', (req, res) => {
  console.log('Message status:', req.body);
  res.sendStatus(200);
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
  fetchAlphaVantageData(); // Call this function to fetch data when the server starts
});
