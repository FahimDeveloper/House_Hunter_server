const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(cors());

app.get("/", async (req, res) => {
    res.send("House Hunter server running");
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})