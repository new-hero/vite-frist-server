const express = require('express');
const cors = require('cors');
require('dotenv').config()
var jwt = require('jsonwebtoken');


const app = express();
const port = process.env.PORT || 4999;



app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_USER_PASS}@cluster0.gsdz7i1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({ err: true, message: "unauthorized " })
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.JWT_SEC, (error, decoded) => {
    if (error) {
      return res.status(403).send({ error: 1, message: "unauthorize access" })
    }
    req.decoded = decoded;
    next()
  })
}

async function run() {
  try {
    client.connect();
    const serviceCollection = client.db('car-doctor').collection("services")
    const bookingCollection = client.db('car-doctor').collection("bookings")

    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.JWT_SEC, { expiresIn: "1h" })
      res.send({ token })
    })

    app.get('/services', async (req, res) => {
      const result = await serviceCollection.find().toArray()
      res.send(result)
    })
    app.get('/checkout/:id', async (req, res) => {
      const id = req.params?.id
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.findOne(query)
      res.send(result)
    })
    app.post('/bookings', async (req, res) => {
      const order = req.body;
      const result = await bookingCollection.insertOne(order)
      res.send(result)
    })

    app.get('/bookings', verifyJWT, async (req, res) => {
      const email = req.decoded?.email
      if (email !== req.query.email) {
        console.log("no")
        return res.status(403).send({ error: 1, message: 'forbidden access' })
      }
      const query = { email }

      const result = await bookingCollection.find(query).toArray();
      res.send(result)
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id
      let query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query);
      res.send(result)
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id
      let filter = { _id: new ObjectId(id) }
      const updatedBooking = req.body
      const updatedDoc = {
        $set: {
          status: updatedBooking.status
        }
      }
      const result = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("server is running")
})
app.listen(port, () => {
  console.log("server is running port" + port)
})