const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 9000;
const { MongoClient, ServerApiVersion } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.v3edin0.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Blood donation apps server is running");
});

async function run() {
  try {
    await client.connect();
    // --------------------------------------------------------------------
    const db = client.db("blood_donation_db");
    const userCollection = db.collection("users");

    // users related api's start

    // [Register.jsx]
    app.post("/users", async (req, res) => {
      const userData = req?.body;
      userData.role = "donor";
      userData.status = "active";
      userData.createAt = new Date();

      // check and prevent adding duplicate user data from googleLogin start
      //   const email = user?.email;
      //   const userExits = await userCollection.findOne({ email });
      //   if (userExits) {
      //     return res.send({ message: "User Exits" });
      //   }
      // check and prevent adding duplicate user data from googleLogin end

      const result = await userCollection.insertOne(userData);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const email = req?.query?.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });
    // users related api's end
    // --------------------------------------------------------------------

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Blood donation apps server is running from ${port}`);
});
