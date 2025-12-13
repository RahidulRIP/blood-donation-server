const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 9000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(`${process.env.STRIPE_SECRET_KEY}`);
const admin = require("firebase-admin");
const serviceAccount = require(`./blood-donation-firebase-adminsdk.json`);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(
  cors({
    origin: ["http://localhost:5173", "https://blood-donation-99e54.web.app"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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

const verifyFirebaseToken = async (req, res, next) => {
  const token = req?.headers?.authorization;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const accessToken = token.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(accessToken);
    req.Token_email = decoded?.email;
    next();
  } catch (err) {
    res.status(401).send({ message: "unauthorized access" });
  }

  // console.log(accessToken);
};

app.get("/", (req, res) => {
  res.send("Blood donation apps server is running");
});

async function run() {
  try {
    // await client.connect();
    // --------------------------------------------------------------------
    const db = client.db("blood_donation_db");
    const userCollection = db.collection("users");
    const bloodRequestCollection = db.collection("bloodRequest");
    const donationFundSCollection = db.collection("donationFunds");

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

    app.patch("/users/:id", verifyFirebaseToken, async (req, res) => {
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
    app.patch("/user/status/:id", verifyFirebaseToken, async (req, res) => {
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
    app.patch("/user/role/:id", verifyFirebaseToken, async (req, res) => {
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
    app.post(
      "/create-donation-request",

      async (req, res) => {
        const data = req?.body;
        const user_email = req?.body?.user_email;

        const query = { email: user_email };
        const userData = await userCollection.findOne(query);

        // validate the user status(active,block) start
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
      }
    );

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
    app.get( "/create-donation-request/all-data",
      verifyFirebaseToken,
      async (req, res) => {
        const email = req?.query?.email;

        const query = {};
        if (email) {
          query.user_email = email;

          // token work start
          const token_email = req.Token_email;
          if (email !== token_email) {
            return res.status(403).send({ message: "forbidden access" });
          }
          // token work end
        }
        const option = { sort: { createdAt: -1 } };
        const result = await bloodRequestCollection
          .find(query, option)
          .toArray();
        res.send(result);
      }
    );

    // [UpdateDonarReqData.jsx]
    app.get("/create-donation-request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bloodRequestCollection.findOne(query);
      res.send(result);
    });

    // [UpdateDonarReqData.jsx]
    app.patch(
      "/create-donation-request/:id",

      async (req, res) => {
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
      }
    );

    // [DonateBloodCard.jsx]
    app.patch(
      "/update-donation-status/:id",

      async (req, res) => {
        const id = req.params.id;
        const bloodDonorInfo = req.body;
        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            donation_status: "inprogress",
            blood_donor_name: bloodDonorInfo?.bloodDonorName,
            blood_donor_email: bloodDonorInfo?.bloodDonorEmail,
          },
        };
        const result = await bloodRequestCollection.updateOne(query, update);
        res.send(result);
      }
    );

    // [UpdateDonarReqData.jsx] & [ALlBloodDonationRequest.jsx]
    app.delete(
      "/create-donation-request/:id",

      async (req, res) => {
        const id = req?.params?.id;
        const query = { _id: new ObjectId(id) };
        const result = await bloodRequestCollection.deleteOne(query);
        res.send(result);
      }
    );

    // [FundingPage.jsx]
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req?.body;
      const donationAmount = parseInt(paymentInfo?.donation_amount) * 100;
      const donorEmail = paymentInfo?.donor_email;
      const name = paymentInfo?.name;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: donationAmount,
              product_data: {
                name: `Hey! ${name} donated funds, fueling the mission to save lives`,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: donorEmail,
        mode: "payment",
        metadata: {
          user_name: name,
        },
        success_url: `${process.env.DOMAIN_LINK}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.DOMAIN_LINK}/dashboard/payment-cancelled`,
      });
      // console.log(session)
      res.send({ url: session.url });
    });

    // [PaymentSuccessful.jsx];
    app.post("/payment-success", async (req, res) => {
      const sessionId = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        return res.status(400).send({ error: "Invalid session" });
      }

      const transactionId = session?.payment_intent;
      const query = { transactionId };
      const transactionIdExit = await donationFundSCollection.findOne(query);
      if (transactionIdExit) {
        return res.send({
          message: "already exists",
          transactionId: session?.payment_intent,
        });
      }

      if (session?.payment_status === "paid") {
        const paymentInfo = {
          amount: session?.amount_total,
          name: session?.metadata?.user_name,
          user_email: session?.customer_email,
          transactionId: session?.payment_intent,
          donate_date: new Date().toLocaleString(),
        };

        try {
          await donationFundSCollection.insertOne(paymentInfo);
          res.send({ success: true, transactionId });
        } catch (error) {
          if (error.code === 11000) {
            return res.send({
              message: "already exists",
              transactionId,
            });
          }
        }
      }
      res.send({ session: false });
    });

    // [FundingPage.jsx]
    app.get("/donation-funds-data", async (req, res) => {
      const email = req?.query?.email;
      const query = {};
      if (email) {
        query.user_email = email;
      }
      const result = await donationFundSCollection
        .find(query)
        .sort({ donate_date: -1 })
        .toArray();
      res.send(result);
    });

    // [ALlBloodDonationRequest.jsx]
    app.patch("/mark-done-cancel/:id", async (req, res) => {
      const status = req.body;
      const toUpdate = status?.donation_status;
      if (toUpdate) {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const update = {
          $set: {
            donation_status: status?.donation_status,
          },
        };
        const result = await bloodRequestCollection.updateOne(query, update);
        return res.send({
          success: true,
          message: `Donation status updated to "${toUpdate}"`,
          data: result,
        });
      }
      res.send({ message: "Operation Field" });
    });

    // --------------------------------------------------------------------

    // await client.db("admin").command({ ping: 1 });
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
