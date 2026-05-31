const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(403).json({ error: "Forbidden" });
  }
};

const run = async () => {
  try {
    await client.connect();
    // await client.db("admin").command({ ping: 1 });
    const db = client.db("mediqueuedb");
    const tutorsCollection = db.collection("tutors");
    const bookingCollection = db.collection("bookings");

    app.get("/tutors", async (req, res) => {
      const { search } = req.query;

      const cursor = tutorsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/tutors", verifyToken, async (req, res) => {
      const tutor = req.body;
      const result = await tutorsCollection.insertOne(tutor);
      res.send(result);
    });

    app.get("/tutors/:tutorId", verifyToken, async (req, res) => {
      const { tutorId } = req.params;
      const query = { _id: new ObjectId(tutorId) };
      const result = await tutorsCollection.findOne(query);
      res.send(result);
    });

    app.post("/bookings/:tutorId", verifyToken, async (req, res) => {
      const { tutorId } = req.params;
      const bookingInfo = req.body;

      const tutorQuery = await tutorsCollection.findOne({
        _id: new ObjectId(tutorId),
      });
      if (!tutorQuery) {
        return res.status(404).json({ error: "Tutor not found." });
      }

      await tutorsCollection.updateOne(
        { _id: new ObjectId(tutorId) },
        {
          $inc: { totalSlot: -1 },
        },
      );

      const result = await bookingCollection.insertOne(bookingInfo);
      res.send(result);
    });

    app.delete("/bookings/:id", verifyToken, async (req, res) => {
      const bookingId = req.params.id;
      try {
        const bookingQuery = { _id: new ObjectId(bookingId) };
        const existingBooking = await bookingCollection.findOne(bookingQuery);

        if (!existingBooking) {
          return res.status(404).json({ error: "Booking not found." });
        }

        await tutorsCollection.updateOne(
          { _id: new ObjectId(existingBooking.tutorId) },
          {
            $inc: { totalSlot: 1 },
          },
        );
        const result = await bookingCollection.deleteOne(bookingQuery);
        res.send(result);
      } catch (error) {
        return res
          .status(500)
          .json({ error: "An error occurred while deleting the booking." });
      }
    });

    app.get("/bookings/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.send(result);
    });

    app.get("/featured-tutors", async (req, res) => {
      const cursor = tutorsCollection.find().limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/my-tutors/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await tutorsCollection.find({ userId: userId }).toArray();
      res.send(result);
    });

    app.delete("/tutors/:id", verifyToken, async (req, res) => {
      const tutorId = req.params.id;
      try {
        const tutorQuery = {_id: new ObjectId(tutorId) };
        const existingTutor = await tutorsCollection.findOne(tutorQuery);

        if (!existingTutor) {
          return res.status(404).json({ error: "Tutor not found." });
        }
        const result = await tutorsCollection.deleteOne(tutorQuery);
        res.send(result);
      } catch (error) {
        return res
          .status(500)
          .json({ error: "An error occurred while deleting the tutor." });
      }
    })

    app.put("/tutors/:id", verifyToken, async (req, res) => {
      const tutorId = req.params.id;
      const updatedTutor = req.body;
      try {
        const tutorQuery = { _id: new ObjectId(tutorId) };
        const existingTutor = await tutorsCollection.findOne(tutorQuery);
        if (!existingTutor) {
          return res.status(404).json({ error: "Tutor not found." });
        }
        const result = await tutorsCollection.updateOne(tutorQuery, { $set: updatedTutor });
        res.send(result);
      } catch (error) {
        return res
          .status(500)
          .json({ error: "An error occurred while updating the tutor." });
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
