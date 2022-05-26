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
  const hederAuth = req.headers.authorization;
  if (!hederAuth) {
    return res.status(401).send({ message: "unauthorized access.try again" });
  } else {
    const token = hederAuth.split(" ")[1];
    // console.log({ token });
    jwt.verify(token, process.env.TOKEN, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(403).send({ message: "forbidden access" });
      }
      // console.log('decoded', decoded);
      req.decoded = decoded;
      next();
    });
  }
  // console.log(hederAuth, 'inside checkjwt');
}

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    // console.log("decoded", decoded);
    req.decoded = decoded;
    next();
  });
}





async function run() {
  await client.connect();

  const BlogsCollection = client.db("Monato").collection("blogs");
  const PartsCollection = client.db("Monato").collection("parts");
  const ReviewsCollection = client.db("Monato").collection("reviews");
  const UsersCollection = client.db("Monato").collection("users");
  const OrdersCollection = client.db("Monato").collection("orders");
  const adminCollection = client.db("Monato").collection("admin");

  //Verify Admin Role 
const verifyAdmin = async (req, res, next) => {
  const requester = req.decoded.email;
  const requesterAccount = await UsersCollection.findOne({
      email: requester,
  });
  if (requesterAccount.role === "admin") {
      next();
  } else {
      res.status(403).send({ message: "Forbidden" });
  }
};

//API to make Admin 
app.put("/users/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
  const email = req.params.email;
  const filter = { email: email };
  const updateDoc = {
      $set: { role: "admin" },
  };
  const result = await adminCollection.updateOne(filter, updateDoc);
  res.send(result);
});

//API to get admin 
app.get("/admin/:email", async (req, res) => {
  const email = req.params.email;
  const user = await adminCollection.findOne({ email: email });
  // const isAdmin = user.role === "admin";
  // admin: isAdmin
  res.send({  });
});

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

  //get all reviews to read
  app.get("/reviews", async (req, res) => {
    const query = {};
    const cursor = ReviewsCollection.find(query);
    const result = await cursor.toArray();
    res.send(result);
  });

  // get all users
  app.get("/users", async (req, res) => {
    const users = await UsersCollection.find().toArray();
    res.send(users);
  });

  //create user
  app.put("/users/:email", async (req, res) => {
    const email = req.params.email;
    const user = req.body;
    const filter = { email: email };
    const options = { upsert: true };
    const updateDoc = {
      $set: user,
    };
    const result = await UsersCollection.updateOne(filter, updateDoc, options);
    const getToken = jwt.sign({ email: email }, process.env.TOKEN, {
      expiresIn: "1d",
    });
    res.send({ result, getToken });
  });

  //put API to update an user
  app.put("/users/:id", verifyJWT, async (req, res) => {
    const decodedEmail = req.decoded.email;
    const email = req.headers.email;
    if (email === decodedEmail) {
      const id = req.params.id;
      const user = req.body;
      // console.log(user);
      const options = { upsert: true };
      await UsersCollection.updateOne(
        { _id: ObjectId(id) },
        {
          $set: {
            user,
          },
        },
        options
      );
      res.send(user);
    } else {
      res.send("Unauthorized access");
    }
  });

  // get read part by _id
  app.get("/parts/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const parts = await PartsCollection.findOne(query);
    res.send(parts);
  });

  // UPDATE parts  _id
  app.put("/parts/:id", async (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const filter = { _id: ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        name: data.name,
        email: data.email,
        quantity: data.addedQuantity,
        contact: data.contact,
      },
    };

    const result = await PartsCollection.updateOne(filter, updateDoc, options);
    res.send(result);
  });

  // delete parts from mongodb
  app.delete("/parts/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await PartsCollection.deleteOne(query);
    res.send(result);
  });

  //JWT
  app.post("/signin", async (req, res) => {
    const user = req.body;
    // console.log(req.body, "user");

    const getToken = jwt.sign(user, process.env.TOKEN, {
      expiresIn: "1d",
    });

    res.send({ getToken });
  });

  // get items by email
  app.get("/singleItem", CheckJWTToken, async (req, res) => {
    const decodedEmail = req.decoded.email;
    const email = req.query.email;
    if (email === decodedEmail) {
      const query = { email: email };
      const cursor = PartsCollection.find(query);
      const items = await cursor.toArray();
      res.send(items);
    } else {
      return res.status(403).send({ message: "forbidden access" });
    }
  });

  // post user added review on backend
  app.post("/reviews", async (req, res) => {
    const reviewUser = req.body;
    const result = await ReviewsCollection.insertOne(reviewUser);
    res.send(result);
  });

  //API to get all orders
  app.get("/orders", async (req, res) => {
    const orders = await OrdersCollection.find({}).toArray();
    res.send(orders);
  });

  //API to post order
  app.post("/orders", async (req, res) => {
    const order = req.body;
    const result = await OrdersCollection.insertOne(order);
    res.send(result);
  });

  //API to to delete order order
  app.delete("/orders/:id", async (req, res) => {
    const id = req.params.id;
    const query={ _id: ObjectId(id) };
    const result = await OrdersCollection.deleteOne(query);
    res.send(result);
  });

  //API to update a order
  app.put("/orders/:id", async (req, res) => {
    const orderId = req.params.id;
    const order = req.body;
    const query = { _id: ObjectId(orderId) };
    const options = { upsert: true };
    const updatedOrder = await OrdersCollection.findOneAndUpdate(
      query,
      {
        $set: order,
      },
      options
    );
    res.send(updatedOrder);
  });

  app.get('/users/:email', verifyJWT, async (req, res) => {
    const decodedEmail = req.decoded.email;
    const email = req.params.email;
    // console.log("email", email);
    if (email === decodedEmail) {
        const query = { email: email }
        const cursor = UsersCollection.find(query)
        const items = await cursor.toArray()
        res.send(items)
    }
    else {
        // console.log(param);
        return res.status(403).send({ message: 'forbidden access' })

    }
})

  console.log("Database Connected");
}

run().catch(console.dir);

app.listen(PORT, () => {
  console.log("Example app listening");
});
