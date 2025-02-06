const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const request = require("request-promise");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/checkUrl", async (req, res, next) => {
  const options = {
    method: "POST",
    uri: "http://127.0.0.1:7000/urlChecker",
    body: req.body.url,
    json: true,
  };
  const response = await request(options);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
