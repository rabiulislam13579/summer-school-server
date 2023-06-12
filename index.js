const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors())

const verifyJwt = (req, res, next)=>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorize access'})
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({error: true, message: 'unauthorize access'})

    }
    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kfqp20s.mongodb.net/?retryWrites=true&w=majority`;


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
    // await client.connect();


    app.get('/', (req, res) => {
        res.send("Summer school camp is on")
    })

    const usersCollection = client.db('usersManager').collection('users')
    const classCollection = client.db('classManager').collection('classes')
    const instructorCollection = client.db('instructorManager').collection('instructors')
    const enrollCollection = client.db('enrollManager').collection('enrolls')
    const paymentCollection = client.db('paymentManager').collection('payments')

    //======payments==========

    app.post('/payments', async(req, res)=>{
        const payment = req.body;
        const insertResult = await paymentCollection.insertOne(payment)
  
        const query = {_id: { $in: payment.courseItems.map(id=>new ObjectId(id))}}
        const deleteResult = await enrollCollection.deleteMany(query)
        res.send({result:insertResult, deleteResult})
      })

      //======jwt=========

    app.post('/jwt', (req,res)=>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET , { expiresIn: '48hr'})
        res.send({token})
      })
  
      const verifyAdmin = async(req, res, next)=>{
        const email = req.decoded.email;
        const query = {email : email}
        const user = await usersCollection.findOne(query)
        if (user?.role !== 'admin'){
          return res.status(403).send({error: true, message: 'forbidden access'})
  
        }
        next();
  
      }

          //==========users========


    app.get('/users' , async(req, res)=>{
        const result = await usersCollection.find().toArray();
        res.send(result)
      })
  
      
  
    
  
      app.post('/users', async(req, res)=>{
        const user = req.body;
        const query = {email: user.email}
        const existingUser = await usersCollection.findOne(query)
        if(existingUser){
          return res.send({message: 'User Already Exits'})
        }
        const result = await usersCollection.insertOne(user);
        res.send(result)
  
      })
  
      app.get('/users/admin/:email',   async (req, res)=>{
        const adminEmail = req.params.email;
        
  
        // if(req.decoded.email !== adminEmail){
        //   res.send({admin: false})
        // }
  
  
        const query = {email : adminEmail}
        const user = await usersCollection.findOne(query)
        const result = {admin: user?.role === 'admin'}
        res.send(result)
      })
  
      app.patch('/users/admin/:id', async(req,res)=>{
        const id = req.params.id;
        const filter = {_id : new ObjectId(id)}
        const updateDoc = {
          $set: {
            role: 'admin'
          }
        }
        const result = await usersCollection.updateOne(filter, updateDoc)
        res.send(result)
      })
  
      app.delete('/users/:id', async (req, res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await usersCollection.deleteOne(query)
        res.send(result)
      })

       //==============classes ===========

    app.get('/classes' , async(req, res)=>{
        const result = await classCollection.find().toArray();
        res.send(result)
      })
  
      app.get('/classes/:id', async (req, res) => {
        const id = req.params.id
        console.log(id);
        const query = { _id: new ObjectId(id) }
        const result = await classCollection.findOne(query);
        res.send(result)
    })
  
    app.put('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const option = { upsert: true }
      const filter = { _id: new ObjectId(id) }
      const updatedCourse = req.body;
      const course = {
          $set: {
              courseName: updatedCourse.courseName,
              instructorName: updatedCourse.instructorName,
              seats: updatedCourse.seats,
              image: updatedCourse.image,
              price: updatedCourse.price,
              quantity: updatedCourse.rating
          }
  
      }
      const result = await classCollection.updateOne(filter, course, option);
      res.send(result)
  })
  
      app.post('/classes', async(req, res)=>{
        const data = req.body;
       
        const result = await classCollection.insertOne(data);
        res.send(result)
  
      })
  
  
      app.delete('/classes/:id', async (req, res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await classCollection.deleteOne(query)
        res.send(result)
      })
  
  
      app.post('/create-payment-intent',  async (req, res) => {
        const { price } = req.body;
        const amount = price*100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        });
        res.send({
          clientSecret:paymentIntent.client_secret
        })
       
          }),

           //======instructors=========

    app.get('/instructors' , async(req, res)=>{
        const result = await instructorCollection.find().toArray();
        res.send(result)
      })