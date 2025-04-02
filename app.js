const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request-promise");
const axios = require("axios");
const moment = require("moment");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get("/ping", async (req, res, next) => {
  // const url = "http://127.0.0.1:7000";
  const url = "https://phishguard-ai-lv3j.onrender.com";
  try {
    const response = await axios.get(url, { timeout: 10000 });
    console.log(`✅ Pinged ${url}, Status: ${response.status}`);
    res.send({ message: "OK", code: 200 });
  } catch (error) {
    console.error(`❌ Failed to ping ${url}: ${error.message}`);
    res.send({ message: "RETRY", code: 500 });
  }
});

const getDomainFromUrl = (inputUrl) => {
  try {
    // Ensure it starts with http/https, else add it for parsing
    const formattedUrl = inputUrl.startsWith("http")
      ? inputUrl
      : `http://${inputUrl}`;
    const parsedUrl = new URL(formattedUrl);
    return parsedUrl.hostname; // Extracts only the domain
  } catch (error) {
    console.error("Invalid URL:", inputUrl);
    return null; // Handle invalid URL cases
  }
};

const extractASN = (asValue) => {
  try {
    const match = asValue.match(/AS(\d+)/); // Extract number after "AS"
    return match ? parseInt(match[1], 10) : null;
  } catch (e) {
    return;
  }
};

app.post("/checkUrl", async (req, res, next) => {
  const options = {
    method: "POST",
    // uri: "http://127.0.0.1:7000/urlChecker",
    uri: "https://phishguard-ai-lv3j.onrender.com/urlChecker",
    body: req.body.url,
    json: true,
  };

  const domain = getDomainFromUrl(req.body.url);

  const opt = {
    method: "GET",
    uri: `http://ip-api.com/json/${domain}`,
  };
  const data = await request(opt).json();
  const asn = extractASN(data.as) || "";

  const detectionDate = moment().format("MMMM Do YYYY, h:mm:ss a");
  const dataToSend = {
    sourceUrl: req.body.url,
    location: `${data.city}, ${data.regionName}, ${data.country}`,
    ip: data.query,
    brand: data.org,
    detectionDate: detectionDate,
    asn: asn,
  };

  console.log(data);
  console.log(dataToSend);
  console.log("URL sent for prediction");
  const response = await request(options);
  if (response.prediction === "1") {
    console.log("Model predicted safe");
    res.status(200).json({
      status: true,
      redirection: response.redirections,
      dataToSend: dataToSend,
    });
  } else {
    console.log("Model predicted unsafe");
    res.status(200).json({
      status: false,
      redirection: response.redirections,
      dataToSend: dataToSend,
    });
  }
});

app.post("/updatePredict", async (req, res, next) => {
  const options = {
    method: "GET",
    // uri: "http://127.0.0.1:7000/updatePrediction",
    uri: "https://phishguard-ai-lv3j.onrender.com/updatePrediction",
    json: true,
  };
  const response = await request(options);

  const mailOptions = {
    from: `"Phish Guard" <${process.env.EMAIL_USER}>`,
    to: req.body.email,
    subject: "Acknowledgement on your recent phishing link request",
    text: `Thank you for your response. \nDescription received for the URL - ${req.body.url} : \n${req.body.description}. \nWe will look into this and get back to you. \n\nThanks,\nTeam PhishGuard.`,
  };

  await transporter.sendMail(mailOptions);

  if (response.status === "true") {
    res.send("OK");
  } else {
    res.send("NOT");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
