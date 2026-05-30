const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();
const app = express();
app.use(cors());
const port = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
})

const run = async () => {
    try {
        await client.connect();
        // await client.db("admin").command({ ping: 1 });
        const db = client.db('mediqueuedb');
        const tutorsCollection = db.collection('tutors');

        app.get('/tutors', async (req, res) => {
            const cursor = tutorsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/tutors/:tutorId', async (req, res) => {
            const {tutorId} = req.params;
            const query = {_id: new ObjectId(tutorId)};
            const result = await tutorsCollection.findOne(query);
            res.send(result);
        });

        app.get('/featured-tutors', async (req, res) => {
            const cursor = tutorsCollection.find().limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});