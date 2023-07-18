const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(express.json());
app.use(cors());
//verify jwt access middleware
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

app.get("/", async (req, res) => {
    res.send("House Hunter server running");
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uekolpg.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        //All collection
        const usersCollection = client.db("HouseHunter").collection("userCollection");
        const houseCollection = client.db("HouseHunter").collection("houseCollection");

        //all get api
        app.get("/userAvailable/:id", async (req, res) => {
            const result = await usersCollection.findOne({ _id: new ObjectId(req.params.id) });
            res.send(result)
        });
        app.get("/houseCollection", async (req, res) => {
            const page = parseInt(req.query.page) || 0;
            const limit = parseInt(req.query.limit) || 10;
            const skip = page * limit;
            const result = await houseCollection.find().skip(skip).limit(limit).toArray();
            res.send(result)
        });
        app.get("/singleHouseData/:id", verifyJWT, async (req, res) => {
            const result = await houseCollection.findOne({ _id: new ObjectId(req.params.id) });
            res.send(result);
        });
        app.get("/totalHouse", async (req, res) => {
            const result = await houseCollection.countDocuments();
            res.send({ totalHouse: result })
        });
        app.get("/ownHouses/:email", verifyJWT, async (req, res) => {
            const result = await houseCollection.find({ houseOwner: req.params.email }).toArray();
            res.send(result)
        })

        //all post api
        app.post('/jwt', async (req, res) => {
            const userEmail = req.body;
            const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send(token);
        });
        app.post("/addNewUser", async (req, res) => {
            const user = req.body;
            const findTheUser = await usersCollection.findOne({ email: user.email });
            if (findTheUser) {
                return res.send("The user already registered");
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        app.post("/loginUser", async (req, res) => {
            const user = req.body;
            const findUser = await usersCollection.findOne({ email: user.email });
            if (findUser) {
                if (findUser.password === user.password) {
                    const filter = { email: user.email };
                    const options = { upsert: false };
                    const updateDoc = {
                        $set: {
                            loggedIn: true
                        }
                    }
                    const result = await usersCollection.updateOne(filter, updateDoc, options);
                    res.send({ user: findUser, result: result })
                } else {
                    return res.send("Password doesn't match")
                }
            } else {
                res.send("User not found")
            }
        })
        app.post("/logOutUser", async (req, res) => {
            const email = req.body.email
            const filter = { email: email };
            const options = { upsert: false };
            const updateDoc = {
                $set: {
                    loggedIn: false
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        });
        app.post("/addNewHouse", verifyJWT, async (req, res) => {
            const result = await houseCollection.insertOne(req.body);
            res.send(result)
        });

        //all put api
        app.put("/updateHouseData/:id", verifyJWT, async (req, res) => {
            const updatedData = req.body
            const filter = { _id: new ObjectId(req.params.id) }
            const options = { upsert: false }
            const updateDoc = {
                $set: {
                    ...updatedData
                }
            }
            const result = await houseCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        });

        //all delete api
        app.delete("/deleteHouseData/:id", verifyJWT, async (req, res) => {
            const result = await houseCollection.deleteOne({ _id: new ObjectId(req.params.id) });
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
