const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

const app = express();

dotenv.config();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 8080;




const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const logger = (req, res, next) => {
  console.log(`${req.method} | ${req.url}`);
  next();
};

const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;
  //   console.log(req.headers, 'from verify token');
  const token = authorization?.split(' ')[1];
  //   console.log(token);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorize' });
  }

  try {
    const JWKS = createRemoteJWKSet(new URL('http://localhost:3000/api/auth/jwks'));
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;

    next();
  } catch (error) {
    console.error('Token validation failed:', error);
    return res.status(401).json({ message: 'Unauthorize' });
  }
};



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const db = client.db("dreamscardb");
    const carCollection = db.collection("car");
    const bookingCollection = db.collection("booking");

app.post("/cars", verifyToken, async (req, res) => {
  try {
    const data = req.body;

    const carData = {
      ...data,
      createdAt: new Date(),
      bookingCount: 0,
    };

    const result = await carCollection.insertOne(carData);

    res.send({
      success: true,
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false });
  }
});

    app.get("/cars", async(req , res)=> {
        const cursor = carCollection.find();
        const result = await cursor.toArray();
        res.send(result);

    })

    app.get("/popularCars", async(req , res)=> {
        const cursor = carCollection.find().limit(6);
        const result = await cursor.toArray();
        res.send(result);

    })
    app.get("/cars/:carId", logger, verifyToken, async(req , res)=> {
        const {carId} = req.params;
        const qury = {_id : new ObjectId(carId)}
        const result = await carCollection.findOne(qury);
        res.send(result);

    })

  app.delete('/booking/:id', verifyToken, async (req, res) => {

  try {

    const { id } = req.params;

    const query = {
      _id: new ObjectId(id)
    };

    const result = await bookingCollection.deleteOne(query);

    res.send({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {

    console.log(error);

    res.status(500).send({
      success: false,
      message: 'Failed to delete booking'
    });

  }

});


    app.get('/booking/:userId', verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.send(result);
    });

    app.patch('/booking/:carId', verifyToken, async (req, res) => {
      //   console.log('from enrollment');

      const { carId } = req.params;
      const bookingData = req.body;

      const carBooking = await carCollection.findOne({ _id: new ObjectId(carId) });

      if (!carBooking) {
        return res.status(404).json({ message: 'Car not found' });
      }
      await carCollection.updateOne(
        { _id: new ObjectId(carId) },
        {
          $inc: { bookingCount: 1 },
          $set: {
            lastbookingAt: new Date(),
          },
        }
      );
      //   console.log(enrollmentData);

      const result = await bookingCollection.insertOne({
        ...bookingData,
        bookingAt: new Date(),
      });

      res.send(result);
    });








    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
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