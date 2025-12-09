const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 9000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    const bloodRequestCollection = db.collection("bloodRequest");

    // users related api's start

    // [Register.jsx]
    app.post("/users", async (req, res) => {
      const userData = req?.body;
      userData.role = "donor";
      userData.status = "active";
      userData.createAt = new Date();
      const result = await userCollection.insertOne(userData);
      res.send(result);
    });

    // [MyProfile.jsx]
    app.get("/users", async (req, res) => {
      const email = req?.query?.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const id = req?.params?.id;
      const data = req?.body;

      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: data?.name,
          district: data?.district,
          upazila: data?.upazila,
          blood_group: data?.blood_group,
        },
      };
      const result = await userCollection.updateOne(filter, update);
      res.send(result);
    });

    // [AllUser.jsx] update status
    app.patch("/user/status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: status,
        },
      };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });

    // [AllUser.jsx] update role
    app.patch("/user/role/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          role: role,
        },
      };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });
    // users related api's end

    // [CreateDonationRequest.jsx]
    app.post("/create-donation-request", async (req, res) => {
      const data = req?.body;
      const user_email = req?.body?.user_email;

      // validate the user status start
      const query = { email: user_email };
      const userData = await userCollection.findOne(query);
      if (userData?.status !== "active") {
        return res.send({
          message: "You are not able to create any donation request",
        });
      }
      // validate the user status end
      data.donation_status = "pending";
      data.createdAt = new Date();
      const result = await bloodRequestCollection.insertOne(data);
      res.send(result);
    });

    // [DonarHome.jsx]
    app.get("/create-donation-request", async (req, res) => {
      const email = req?.query?.email;
      const query = {};
      if (email) {
        query.user_email = email;
      }
      const option = { sort: { createdAt: -1 } };
      const result = await bloodRequestCollection
        .find(query, option)
        .limit(3)
        .toArray();
      res.send(result);
    });

    // [MyDonationRequest.jsx]
    app.get("/create-donation-request/all-data", async (req, res) => {
      const email = req?.query?.email;
      const query = {};
      if (email) {
        query.user_email = email;
      }
      const option = { sort: { createdAt: -1 } };
      const result = await bloodRequestCollection.find(query, option).toArray();
      res.send(result);
    });

    // [UpdateDonarReqData.jsx]
    app.get("/create-donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bloodRequestCollection.findOne(query);
      res.send(result);
    });

    // [UpdateDonarReqData.jsx]
    app.patch("/create-donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;

      const query = { _id: new ObjectId(id) };

      const update = {
        $set: {
          recipient_name: data?.recipient_name,
          recipient_blood_group: data?.recipient_blood_group,
          hospital_name: data?.hospital_name,
          recipient_district: data?.recipient_district,
          recipient_upazila: data?.recipient_upazila,
          donation_date: data?.donation_date,
          donation_time: data?.donation_time,
          recipient_full_address: data?.recipient_full_address,
          request_message: data?.request_message,
        },
      };
      const result = await bloodRequestCollection.updateOne(query, update);
      res.send(result);
    });

    // [DonateBloodCard.jsx]
    app.patch("/update-donation-status/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          donation_status: "inprogress",
        },
      };
      const result = await bloodRequestCollection.updateOne(query, update);
      res.send(result);
    });

    // [UpdateDonarReqData.jsx]
    app.delete("/create-donation-request/:id", async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await bloodRequestCollection.deleteOne(query);
      res.send(result);
    });
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
