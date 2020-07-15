const express = require('express');
const bodyparser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const db = knex({
        client: 'pg',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false
            }
    }
  });

/*db.select('*').from('users').then(data=>{
    console.log(data);
});
*/
const app = express();
const image = require('./controllers/image');
app.use(bodyparser.json());
app.use(cors());
app.get('/' , (req,res) => {
    res.send('it is working');
})

app.post('/signin', (req,res) =>{
    if(!req.body.email || !req.body.password){
        return res.status(400).json('incorrect form submission');
    }
   db.select('email','hash').from('login')
   .where('email','=',req.body.email)
   .then(data=> {
    const isValid = bcrypt.compareSync(req.body.password,data[0].hash)
    if(isValid){
        return db.select('*').from('users')
        .where('email','=',req.body.email)
        .then(user=>{
            res.json(user[0])
        })
        .catch(err => res.status(400).json('unable to get user'))
    }
    else {
        res.status(400).json('Wrong credentials')
    }
   })
   .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register',(req,res) => {
    const {email,name,password} = req.body;
    if (!email || !name || !password){
        return res.status(400).json('incorrect form submission');
    }
    const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
            .returning('*')
            .insert({
                email: loginEmail[0],
                name: name,
                joined: new Date()
            })
            .then(user => {
                res.json(user[0]);
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'));
})

app.get('/profile/:id' , (req,res)=>{
    const {id} = req.params;
    let found = false;
    db.select('*').from('users').where({
        id: id
    })
    .then(user => {
        if (user.length) {
        res.json(user[0])
        }
        else {
        res.status(400).json('Not Found');
        }
    })
        .catch(err => res.status(400).json('error getting connected'));
})
app.put('/image', (req, res) => { image.handleImage(req, res, db)});
app.post('/imageurl', (req, res) => { image.handleApiCall(req, res)});


app.listen(process.env.PORT || 3000, ()=> {
    console.log(`the app is running on port ${process.env.PORT}`);
})


/*
/ --> res = this is working
/ SignIn --> Post = successfull
/ Register --> Post = user
/ profile/:userId --> Get = user
/ image --> Put --> user
*/