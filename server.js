const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json()); // Or app.use(express.json())

const PORT = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hc4xz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


function CheckJWTToken(req, res, next) {
  const hederAuth = req.headers.authorization
  if (!hederAuth) {
      return res.status(401).send({ message: 'unauthorized access.try again' })
  }
  else {
      const token = hederAuth.split(' ')[1]
      // console.log({ token });
      jwt.verify(token, process.env.TOKEN, (err, decoded) => {

          if (err) {
              console.log(err);
              return res.status(403).send({ message: 'forbidden access' })
          }
          // console.log('decoded', decoded);
          req.decoded = decoded;
          next()
      })
  }
  // console.log(hederAuth, 'inside checkjwt');

}

async function run() {
  await client.connect();

  const BlogsCollection = client.db("Monato").collection("blogs");
  const PartsCollection = client.db("Monato").collection("parts");
  const ReviewsCollection = client.db("Monato").collection("reviews");

  //get all blogs to read
  app.get("/blogs", async (req, res) => {
    const query = {};
    const cursor = BlogsCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
  });

  //get all parts to read
  app.get("/parts", async (req, res) => {
    const query = {};
    const cursor = PartsCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
  });

  // get read part by _id
  app.get('/parts/:id', async (req, res)=>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const parts = await PartsCollection.findOne(query);
      res.send(parts);
  } )

  // UPDATE parts  _id
  app.put('/parts/:id', async (req, res)=>{
      const id = req.params.id;
      const data = req.body;
      const filter = {_id: ObjectId(id)};
      const options = {upsert : true};
      const updateDoc ={
        $set: {
        name : data.name,
        email : data.email,
        quantity : data.addedQuantity,
        contact : data.contact,
        }
      }

      const result = await PartsCollection.updateOne(
        filter, updateDoc, options
      );
      res.send(result);
  } )


  //JWT
  app.post('/signin', async (req, res) => {
    const user = req.body;
    const getToken = jwt.sign(user, process.env.TOKEN, {
        expiresIn: '1d'
    });
    res.send({ getToken });
    })

  // get items by email 
  app.get('/singleItem', CheckJWTToken, async (req, res) => {
    const decodedEmail = req.decoded.email;
    const email = req.query.email;
    if (email === decodedEmail) {
        const query = { email: email }
        const cursor = PartsCollection.find(query)
        const items = await cursor.toArray()
        res.send(items)
    }
    else {
        return res.status(403).send({ message: 'forbidden access' })
    }
  })

  //get all reviews to read
  app.get("/reviews", async (req, res) => {
    const query = {};
    const cursor = ReviewsCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
  });


  console.log("Database Connected");
}

run().catch(console.dir);

app.listen(PORT, () => {
  console.log("Example app listening");
});
